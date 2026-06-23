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
  winner: string | null;
};

const WIDTH = 800;
const HEIGHT = 600;
const PADDLE_WIDTH = 160;
const PADDLE_HEIGHT = 24;
const BALL_SIZE = 14;
const WIN_SCORE = 2;

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
    winner: null,
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
    osc.type = "sine"; osc.frequency.value = freq; gain.gain.value = 0.25;
    osc.connect(gain); gain.connect(audioContextRef.current.destination);
    osc.start(); setTimeout(() => osc.stop(), duration);
  };

  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

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

    let targetTop = gameState.paddles.top;
    let targetBottom = gameState.paddles.bottom;
    let leftTargetActive = false;
    let rightTargetActive = false;

    try {
      const hands = await detector.estimateHands(video);

      hands.forEach((hand: any) => {
        const landmarks = hand.keypoints;
        const handedness = (hand.handedness || "").toLowerCase();
        const isLeftHand = handedness.includes("left");

        const palmBase = landmarks[9] || landmarks[0];
        const isPalmVisible = palmBase && Math.abs(landmarks[0].y - landmarks[9].y) < 85;

        if (palmBase && isPalmVisible) {
          const rawX = palmBase.x * scaleX;
          let paddleX = rawX;

          if (isLeftHand) {
            // Left hand over Left Target
            leftTargetActive = true;
            paddleX = Math.max(20, Math.min(WIDTH - PADDLE_WIDTH - 20, rawX - PADDLE_WIDTH / 2));
            targetTop = paddleX;
          } else {
            // Right hand over Right Target
            rightTargetActive = true;
            paddleX = Math.max(20, Math.min(WIDTH - PADDLE_WIDTH - 20, rawX - PADDLE_WIDTH / 2));
            targetBottom = paddleX;
          }

          publish({ type: "hand", payload: { x: paddleX, playerId: userId } });
        }

        // Draw skeleton
        ctx.strokeStyle = isLeftHand ? "#0f0" : "#f0f";
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

    // Smooth paddle sliding
    setGameState((prev) => {
      const newTop = lerp(prev.paddles.top, targetTop, 0.32);
      const newBottom = lerp(prev.paddles.bottom, targetBottom, 0.32);

      let { ball: b, score: s, winner: w } = prev;

      if (w) return prev;

      b.x += b.vx;
      b.y += b.vy;

      if (b.x <= 0 || b.x >= WIDTH) b.vx *= -1;

      const topY = 30, bottomY = HEIGHT - 50;

      if (b.y - BALL_SIZE/2 <= topY + PADDLE_HEIGHT && b.y + BALL_SIZE/2 >= topY &&
          b.x >= newTop && b.x <= newTop + PADDLE_WIDTH) {
        b.vy = Math.abs(b.vy) * 1.04;
        playSound(680, 50);
      }
      if (b.y + BALL_SIZE/2 >= bottomY && b.y - BALL_SIZE/2 <= bottomY + PADDLE_HEIGHT &&
          b.x >= newBottom && b.x <= newBottom + PADDLE_WIDTH) {
        b.vy = -Math.abs(b.vy) * 1.04;
        playSound(680, 50);
      }

      if (b.y < 0) { s.bottom++; playSound(180, 400); resetBall(b); }
      if (b.y > HEIGHT) { s.top++; playSound(180, 400); resetBall(b); }

      if (s.top >= WIN_SCORE) w = "Top";
      if (s.bottom >= WIN_SCORE) w = "Bottom";

      return { 
        ball: b, 
        score: s, 
        paddles: { top: newTop, bottom: newBottom }, 
        winner: w 
      };
    });

    const { ball, score, paddles, winner } = gameState;

    // Targets with glow
    ctx.strokeStyle = leftTargetActive ? "#00ff00" : "#666";
    ctx.lineWidth = leftTargetActive ? 8 : 4;
    ctx.strokeRect(40, 20, 200, 60);

    ctx.strokeStyle = rightTargetActive ? "#00ff00" : "#666";
    ctx.lineWidth = rightTargetActive ? 8 : 4;
    ctx.strokeRect(WIDTH - 240, 20, 200, 60);

    ctx.fillStyle = leftTargetActive ? "rgba(0,255,0,0.3)" : "rgba(255,255,0,0.08)";
    ctx.fillRect(40, 20, 200, 60);
    ctx.fillStyle = rightTargetActive ? "rgba(0,255,0,0.3)" : "rgba(255,255,0,0.08)";
    ctx.fillRect(WIDTH - 240, 20, 200, 60);

    ctx.fillStyle = "#ffff00";
    ctx.font = "bold 18px Arial";
    ctx.fillText("LEFT TARGET", 85, 55);
    ctx.fillText("RIGHT TARGET", WIDTH - 195, 55);

    // Paddles
    ctx.fillStyle = "#00ffff";
    ctx.fillRect(paddles.top, 30, PADDLE_WIDTH, PADDLE_HEIGHT);
    ctx.fillRect(paddles.bottom, HEIGHT - 50, PADDLE_WIDTH, PADDLE_HEIGHT);

    // Ball
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_SIZE / 2, 0, Math.PI * 2);
    ctx.fill();

    // Center line
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.setLineDash([10, 15]);
    ctx.beginPath();
    ctx.moveTo(0, HEIGHT / 2);
    ctx.lineTo(WIDTH, HEIGHT / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Score
    ctx.fillStyle = "#fff";
    ctx.font = "bold 58px Arial";
    ctx.textAlign = "center";
    ctx.fillText(score.top.toString(), WIDTH / 2, 110);
    ctx.fillText(score.bottom.toString(), WIDTH / 2, HEIGHT - 70);

    if (winner) {
      ctx.fillStyle = "#ff0";
      ctx.font = "bold 48px Arial";
      ctx.fillText(`${winner} WINS!`, WIDTH / 2, HEIGHT / 2);
    }

    animationRef.current = requestAnimationFrame(gameLoop);
  }, [detector, isReady, publish, userId, soundEnabled, gameState]);

  const resetBall = (ball: any) => {
    ball.x = WIDTH / 2;
    ball.y = HEIGHT / 2;
    ball.vx = (Math.random() - 0.5) * 7;
    ball.vy = Math.random() > 0.5 ? 5.5 : -5.5;
  };

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
      <h1>Hands Pong — Best of 3 — Room: {roomId}</h1>
      <p>Your ID: {userId.slice(0,8)}... | Left Hand on Left Target → Paddle Left | Right Hand on Right Target → Paddle Right</p>

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
