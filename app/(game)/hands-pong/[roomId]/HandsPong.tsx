"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import Webcam from "react-webcam";
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
const PADDLE_WIDTH = 160;
const PADDLE_HEIGHT = 24;
const BALL_SIZE = 14;

export default function HandsPong({ roomId }: { roomId: string }) {
  const [userId] = useState(() => crypto.randomUUID());
  const [isReady, setIsReady] = useState(false);
  const [detector, setDetector] = useState<any>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const webcamRef = useRef<Webcam>(null);
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

  const playSound = (freq: number, duration: number) => {
    if (!soundEnabled) return;
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const osc = audioContextRef.current.createOscillator();
    const gain = audioContextRef.current.createGain();
    osc.type = "sine"; 
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

  const gameLoop = useCallback(async () => {
    const video = webcamRef.current?.video;
    const canvas = canvasRef.current;
    if (!video || !canvas || !detector || !isReady || video.videoWidth === 0) {
      animationRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    const ctx = canvas.getContext("2d", { alpha: true })!;
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    const scaleX = WIDTH / video.videoWidth;
    const scaleY = HEIGHT / video.videoHeight;

    try {
      const hands = await detector.estimateHands(video);

      hands.forEach((hand: any) => {
        const landmarks = hand.keypoints;
        const handedness = (hand.handedness || "").toLowerCase();
        const isLeftHand = handedness.includes("left");

        const palmBase = landmarks[9] || landmarks[0]; // middle finger base

        // Rough palm facing detection
        const isPalmVisible = palmBase && Math.abs(landmarks[0].y - landmarks[9].y) < 85;

        if (palmBase && isPalmVisible) {
          let targetX = palmBase.x * scaleX;

          // FLIPPED CONTROL AS REQUESTED:
          // Right hand palm → move paddle LEFT
          // Left hand palm → move paddle RIGHT
          if (isLeftHand) {
            // Left hand → push paddle to the right
            targetX = WIDTH - targetX; // invert
          } else {
            // Right hand → push paddle to the left (already natural, but we keep logic clear)
            targetX = WIDTH * 0.3 + (WIDTH * 0.4 - targetX); // bias left
          }

          const paddleX = Math.max(20, Math.min(WIDTH - PADDLE_WIDTH - 20, targetX - PADDLE_WIDTH / 2));

          publish({
            type: "hand",
            payload: { x: paddleX, playerId: userId },
          });
        }

        // Draw skeleton
        ctx.strokeStyle = isLeftHand ? "#f0f" : "#0f0";
        ctx.lineWidth = 4;
        const fingers = [[0,1,2,3,4],[0,5,6,7,8],[0,9,10,11,12],[0,13,14,15,16],[0,17,18,19,20]];

        fingers.forEach(finger => {
          ctx.beginPath();
          finger.forEach((idx, j) => {
            const pt = landmarks[idx];
            if (!pt) return;
            const x = WIDTH - (pt.x * scaleX);
            const y = pt.y * scaleY;
            j === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
          });
          ctx.stroke();
        });

        ctx.fillStyle = "#ff0";
        landmarks.forEach((pt: any) => {
          const x = WIDTH - (pt.x * scaleX);
          const y = pt.y * scaleY;
          ctx.beginPath();
          ctx.arc(x, y, 5, 0, Math.PI * 2);
          ctx.fill();
        });
      });
    } catch (e) {}

    const { ball, score, paddles } = gameState;

    // Visual targets
    ctx.strokeStyle = "rgba(0,255,255,0.5)";
    ctx.lineWidth = 4;
    ctx.strokeRect(15, 25, WIDTH - 30, PADDLE_HEIGHT + 20);
    ctx.strokeRect(15, HEIGHT - 65, WIDTH - 30, PADDLE_HEIGHT + 20);

    // Paddles
    ctx.fillStyle = "#00ffff";
    ctx.fillRect(paddles.top, 30, PADDLE_WIDTH, PADDLE_HEIGHT);
    ctx.fillRect(paddles.bottom, HEIGHT - 50, PADDLE_WIDTH, PADDLE_HEIGHT);

    // Ball, line, score...
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_SIZE / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.setLineDash([10, 15]);
    ctx.beginPath();
    ctx.moveTo(0, HEIGHT / 2);
    ctx.lineTo(WIDTH, HEIGHT / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "#fff";
    ctx.font = "bold 58px Arial";
    ctx.textAlign = "center";
    ctx.fillText(score.top.toString(), WIDTH / 2, 110);
    ctx.fillText(score.bottom.toString(), WIDTH / 2, HEIGHT - 70);

    // Physics (unchanged)
    setGameState((prev) => {
      let { ball: b, score: s, paddles: p } = prev;
      b.x += b.vx;
      b.y += b.vy;

      if (b.x <= 0 || b.x >= WIDTH) b.vx *= -1;

      const topY = 30, bottomY = HEIGHT - 50;

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

      if (b.y < 0) { s.bottom++; playSound(180, 400); b.x = WIDTH/2; b.y = HEIGHT/2; b.vx = (Math.random()-0.5)*8; b.vy = 5.5; }
      if (b.y > HEIGHT) { s.top++; playSound(180, 400); b.x = WIDTH/2; b.y = HEIGHT/2; b.vx = (Math.random()-0.5)*8; b.vy = -5.5; }

      return { ball: b, score: s, paddles: p };
    });

    animationRef.current = requestAnimationFrame(gameLoop);
  }, [detector, isReady, publish, userId, soundEnabled, gameState]);

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
      <p>Your ID: {userId.slice(0,8)}... | <strong>Right Hand Palm</strong> → Paddle Left | <strong>Left Hand Palm</strong> → Paddle Right</p>

      <div style={{ position: "relative", display: "inline-block" }}>
        <Webcam
          ref={webcamRef}
          mirrored
          onLoadedMetadata={handleVideoReady}
          style={{ width: WIDTH, height: HEIGHT, objectFit: "cover", border: "5px solid #0ff" }}
        />

        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none", border: "5px solid #0ff" }}
        />

        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          style={{ position: "absolute", top: 15, right: 15, padding: "10px 18px", background: "#00000088", color: "white", border: "2px solid #0ff", borderRadius: "6px", zIndex: 20 }}
        >
          Sound: {soundEnabled ? "ON 🔊" : "OFF 🔇"}
        </button>
      </div>

      {!isReady && <p>Waiting for camera...</p>}
      {!detector && <p>Loading Hand Detection...</p>}
    </div>
  );
}
