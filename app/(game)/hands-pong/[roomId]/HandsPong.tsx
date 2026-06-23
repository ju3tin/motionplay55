"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import * as handPoseDetection from "@tensorflow-models/hand-pose-detection";
import "@tensorflow/tfjs-backend-webgl";
import { useGameRoom } from "@/lib/pubnub/useGameRoom";

type HandMessage = {
  type: "hand";
  payload: { x: number; playerId: string };
};

type GameState = {
  ball: { x: number; y: number; vx: number; vy: number };
  score: { top: number; bottom: number };
  paddles: { top: number; bottom: number };
};

const WIDTH = 800;
const HEIGHT = 600;
const PADDLE_WIDTH = 140;
const PADDLE_HEIGHT = 22;
const BALL_SIZE = 14;

export default function HandsPong({ roomId }: { roomId: string }) {
  const [userId] = useState(() => crypto.randomUUID());
  const [isReady, setIsReady] = useState(false);
  const [detector, setDetector] = useState<any>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const [gameState, setGameState] = useState<GameState>({
    ball: { x: WIDTH / 2, y: HEIGHT / 2, vx: 6, vy: 5 },
    score: { top: 0, bottom: 0 },
    paddles: { top: WIDTH / 2 - PADDLE_WIDTH / 2, bottom: WIDTH / 2 - PADDLE_WIDTH / 2 },
  });

  const { publish } = useGameRoom<HandMessage>({
    roomId,
    onMessage: (msg) => {
      if (msg.type === "hand") {
        setGameState((prev) => ({
          ...prev,
          paddles: {
            ...prev.paddles,
            [msg.payload.playerId === userId ? "top" : "bottom"]: msg.payload.x,
          },
        }));
      }
    },
  });

  const playSound = (freq: number, duration: number, type: "sine" | "square" = "sine") => {
    if (!soundEnabled) return;
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const osc = audioContextRef.current.createOscillator();
    const gain = audioContextRef.current.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = 0.25;
    osc.connect(gain);
    gain.connect(audioContextRef.current.destination);
    osc.start();
    setTimeout(() => osc.stop(), duration);
  };

  const initDetector = useCallback(async () => {
    await import("@tensorflow/tfjs-core");
    await import("@tensorflow/tfjs-backend-webgl");

    const model = handPoseDetection.SupportedModels.MediaPipeHands;
    const det = await handPoseDetection.createDetector(model, {
      runtime: "mediapipe",
      modelType: "full",
      maxHands: 2,
      solutionPath: "https://cdn.jsdelivr.net/npm/@mediapipe/hands",
    });
    setDetector(det);
  }, []);

  // Main render + game loop
  const gameLoop = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || !detector || !isReady) {
      animationRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    const ctx = canvas.getContext("2d")!;
    const video = canvas.parentElement?.querySelector("video") as HTMLVideoElement | null; // hidden video

    // Draw video background
    if (video) {
      ctx.save();
      ctx.scale(-1, 1); // mirror the video
      ctx.drawImage(video, -WIDTH, 0, WIDTH, HEIGHT);
      ctx.restore();
    }

    try {
      const hands = await detector.estimateHands(video || canvas);

      if (hands.length > 0) {
        const landmarks = hands[0].keypoints;
        const palmX = landmarks[0]?.x || landmarks[9]?.x;
        if (palmX !== undefined) {
          const normalizedX = (palmX / video!.videoWidth) * WIDTH;
          const paddleX = Math.max(20, Math.min(WIDTH - PADDLE_WIDTH - 20, normalizedX - PADDLE_WIDTH / 2));

          publish({ type: "hand", payload: { x: paddleX, playerId: userId } });
        }

        // Draw flipped skeleton
        hands.forEach((hand: any, i: number) => {
          ctx.strokeStyle = i === 0 ? "#0f0" : "#f0f";
          ctx.lineWidth = 4;
          const fingers = [[0,1,2,3,4],[0,5,6,7,8],[0,9,10,11,12],[0,13,14,15,16],[0,17,18,19,20]];

          fingers.forEach(finger => {
            ctx.beginPath();
            finger.forEach((idx, j) => {
              const pt = hand.keypoints[idx];
              if (!pt) return;
              const x = WIDTH - pt.x; // flip
              j === 0 ? ctx.moveTo(x, pt.y) : ctx.lineTo(x, pt.y);
            });
            ctx.stroke();
          });

          // Keypoints
          ctx.fillStyle = "#ff0";
          hand.keypoints.forEach((pt: any) => {
            ctx.beginPath();
            ctx.arc(WIDTH - pt.x, pt.y, 5, 0, Math.PI * 2);
            ctx.fill();
          });
        });
      }
    } catch (e) {}

    // Game elements
    const { ball, score, paddles } = gameState;

    // Paddle targets / zones
    ctx.strokeStyle = "rgba(0, 255, 255, 0.3)";
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 25, WIDTH - 40, PADDLE_HEIGHT + 10);     // Top target
    ctx.strokeRect(20, HEIGHT - 55, WIDTH - 40, PADDLE_HEIGHT + 10); // Bottom target

    // Paddles
    ctx.fillStyle = "#0ff";
    ctx.fillRect(paddles.top, 30, PADDLE_WIDTH, PADDLE_HEIGHT);
    ctx.fillRect(paddles.bottom, HEIGHT - 50, PADDLE_WIDTH, PADDLE_HEIGHT);

    // Ball
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_SIZE / 2, 0, Math.PI * 2);
    ctx.fill();

    // Center line
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.setLineDash([12, 8]);
    ctx.beginPath();
    ctx.moveTo(0, HEIGHT / 2);
    ctx.lineTo(WIDTH, HEIGHT / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Score
    ctx.fillStyle = "#fff";
    ctx.font = "bold 56px Arial";
    ctx.textAlign = "center";
    ctx.fillText(score.top.toString(), WIDTH / 2, 110);
    ctx.fillText(score.bottom.toString(), WIDTH / 2, HEIGHT - 70);

    // Update physics
    setGameState((prev) => {
      let { ball: b, score: s, paddles: p } = prev;
      b.x += b.vx;
      b.y += b.vy;

      if (b.x <= 0 || b.x >= WIDTH) b.vx *= -1;

      const topY = 30;
      const bottomY = HEIGHT - 50;

      if (b.y - BALL_SIZE/2 <= topY + PADDLE_HEIGHT && b.y + BALL_SIZE/2 >= topY &&
          b.x >= p.top && b.x <= p.top + PADDLE_WIDTH) {
        b.vy = Math.abs(b.vy) * 1.03;
        playSound(680, 50);
      }

      if (b.y + BALL_SIZE/2 >= bottomY && b.y - BALL_SIZE/2 <= bottomY + PADDLE_HEIGHT &&
          b.x >= p.bottom && b.x <= p.bottom + PADDLE_WIDTH) {
        b.vy = -Math.abs(b.vy) * 1.03;
        playSound(680, 50);
      }

      if (b.y < 0) { s.bottom++; playSound(180, 400, "square"); b.x = WIDTH/2; b.y = HEIGHT/2; b.vx = (Math.random()-0.5)*8; b.vy = 5.5; }
      if (b.y > HEIGHT) { s.top++; playSound(180, 400, "square"); b.x = WIDTH/2; b.y = HEIGHT/2; b.vx = (Math.random()-0.5)*8; b.vy = -5.5; }

      return { ball: b, score: s, paddles: p };
    });

    animationRef.current = requestAnimationFrame(gameLoop);
  }, [detector, isReady, publish, userId, soundEnabled]);

  const handleVideoReady = () => setIsReady(true);

  useEffect(() => {
    initDetector();
  }, [initDetector]);

  useEffect(() => {
    if (!detector) return;
    animationRef.current = requestAnimationFrame(gameLoop);
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [detector, gameLoop]);

  return (
    <div style={{ textAlign: "center", padding: 20, background: "#111", color: "white", minHeight: "100vh" }}>
      <h1>Hands Pong — Room: {roomId}</h1>
      <p>Your ID: {userId.slice(0,8)}... | Move hand left/right</p>

      <div style={{ position: "relative", display: "inline-block" }}>
        {/* Hidden video for detection */}
        <video
          ref={(el) => {
            if (el) {
              el.srcObject = (document.querySelector("video") as any)?.srcObject || null;
            }
          }}
          style={{ display: "none" }}
          muted
          playsInline
        />

        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          style={{ border: "5px solid #0ff", background: "#000" }}
        />

        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            padding: "8px 16px",
            fontSize: "16px",
            zIndex: 10,
          }}
        >
          Sound: {soundEnabled ? "ON 🔊" : "OFF 🔇"}
        </button>
      </div>

      {!isReady && <p>Waiting for camera...</p>}
      {!detector && <p>Loading AI Hand Detection...</p>}
    </div>
  );
}
