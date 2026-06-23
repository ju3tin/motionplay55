"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import Webcam from "react-webcam";
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
const PADDLE_WIDTH = 120;
const PADDLE_HEIGHT = 20;
const BALL_SIZE = 12;

declare global {
  interface Window {
    handpose: any;
  }
}

const drawHandSkeleton = (ctx: CanvasRenderingContext2D, landmarks: any[], color: string = "#0f0") => {
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;

  const fingers = [
    [0,1,2,3,4], [0,5,6,7,8], [0,9,10,11,12],
    [0,13,14,15,16], [0,17,18,19,20]
  ];

  fingers.forEach(finger => {
    ctx.beginPath();
    finger.forEach((index, i) => {
      const pt = landmarks[index];
      if (!pt) return;
      i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y);
    });
    ctx.stroke();
  });

  ctx.fillStyle = "#ff0";
  landmarks.forEach((pt: any) => {
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
    ctx.fill();
  });
};

function GameCanvas({ gameState, onRender }: { 
  gameState: GameState; 
  onRender?: (ctx: CanvasRenderingContext2D) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const render = () => {
      ctx.clearRect(0, 0, WIDTH, HEIGHT);

      const { ball, score, paddles } = gameState;

      ctx.fillStyle = "#0ff";
      ctx.fillRect(paddles.top, 30, PADDLE_WIDTH, PADDLE_HEIGHT);
      ctx.fillRect(paddles.bottom, HEIGHT - 50, PADDLE_WIDTH, PADDLE_HEIGHT);

      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, BALL_SIZE / 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "rgba(255,255,255,0.4)";
      ctx.setLineDash([10, 10]);
      ctx.beginPath();
      ctx.moveTo(0, HEIGHT / 2);
      ctx.lineTo(WIDTH, HEIGHT / 2);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = "#fff";
      ctx.font = "bold 48px Arial";
      ctx.textAlign = "center";
      ctx.fillText(score.top.toString(), WIDTH / 2, 100);
      ctx.fillText(score.bottom.toString(), WIDTH / 2, HEIGHT - 60);

      onRender?.(ctx);
    };

    render();
  }, [gameState, onRender]);

  return (
    <canvas
      ref={canvasRef}
      width={WIDTH}
      height={HEIGHT}
      style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none", border: "4px solid #fff" }}
    />
  );
}

export default function HandsPong({ roomId }: { roomId: string }) {
  const [userId] = useState(() => crypto.randomUUID());
  const [isReady, setIsReady] = useState(false);
  const [model, setModel] = useState<any>(null);

  const webcamRef = useRef<Webcam>(null);
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
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const osc = audioContextRef.current.createOscillator();
    const gain = audioContextRef.current.createGain();
    osc.type = type; osc.frequency.value = freq; gain.gain.value = 0.3;
    osc.connect(gain); gain.connect(audioContextRef.current.destination);
    osc.start(); setTimeout(() => osc.stop(), duration);
  };

  // Load the exact script you wanted
  const loadHandposeScript = useCallback(async () => {
    if (window.handpose) return;

    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@tensorflow-models/handpose@0.1.0/dist/handpose.min.js";
    script.async = true;

    script.onload = async () => {
      console.log("✅ handpose script loaded");
      const net = await window.handpose.load();
      setModel(net);
      console.log("✅ Handpose model ready");
    };

    document.head.appendChild(script);
  }, []);

  const gameLoop = useCallback(async () => {
    const video = webcamRef.current?.video;
    if (!video || !model || !isReady || video.videoWidth === 0) {
      animationRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    try {
      const predictions = await model.estimateHands(video);

      if (predictions.length > 0) {
        const landmarks = predictions[0].landmarks; // array of [x, y, z]
        const palmX = landmarks[0][0] || landmarks[9][0]; // wrist or middle finger base

        const normalizedX = (palmX / video.videoWidth) * WIDTH;
        const paddleX = Math.max(0, Math.min(WIDTH - PADDLE_WIDTH, normalizedX - PADDLE_WIDTH / 2));

        publish({
          type: "hand",
          payload: { x: paddleX, playerId: userId },
        });
      }
    } catch (e) {
      console.warn("Handpose error:", e);
    }

    // Physics
    setGameState((prev) => {
      let { ball, score, paddles } = prev;
      ball.x += ball.vx;
      ball.y += ball.vy;

      if (ball.x <= 0 || ball.x >= WIDTH) ball.vx *= -1;

      const topY = 30;
      const bottomY = HEIGHT - 50;

      if (ball.y - BALL_SIZE / 2 <= topY + PADDLE_HEIGHT && 
          ball.y + BALL_SIZE / 2 >= topY &&
          ball.x >= paddles.top && ball.x <= paddles.top + PADDLE_WIDTH) {
        ball.vy = Math.abs(ball.vy) * 1.02;
        playSound(600, 60);
      }

      if (ball.y + BALL_SIZE / 2 >= bottomY && 
          ball.y - BALL_SIZE / 2 <= bottomY + PADDLE_HEIGHT &&
          ball.x >= paddles.bottom && ball.x <= paddles.bottom + PADDLE_WIDTH) {
        ball.vy = -Math.abs(ball.vy) * 1.02;
        playSound(600, 60);
      }

      if (ball.y < 0) { score.bottom++; playSound(200, 300, "square"); resetBall(ball, 5); }
      if (ball.y > HEIGHT) { score.top++; playSound(200, 300, "square"); resetBall(ball, -5); }

      return { ball, score, paddles };
    });

    animationRef.current = requestAnimationFrame(gameLoop);
  }, [model, publish, userId, isReady]);

  const resetBall = (ball: any, vy: number) => {
    ball.x = WIDTH / 2;
    ball.y = HEIGHT / 2;
    ball.vx = (Math.random() - 0.5) * 8;
    ball.vy = vy;
  };

  const handleCanvasRender = useCallback((ctx: CanvasRenderingContext2D) => {
    const video = webcamRef.current?.video;
    if (!video || !model || video.videoWidth === 0) return;

    model.estimateHands(video).then((predictions: any[]) => {
      predictions.forEach((pred: any, i: number) => {
        drawHandSkeleton(ctx, pred.landmarks, i === 0 ? "#0f0" : "#f0f");
      });
    }).catch(() => {});
  }, [model]);

  const handleVideoReady = () => {
    const video = webcamRef.current?.video;
    if (video && video.videoWidth > 0) setIsReady(true);
  };

  useEffect(() => {
    loadHandposeScript();
  }, [loadHandposeScript]);

  useEffect(() => {
    if (!model) return;
    animationRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [model, gameLoop]);

  return (
    <div style={{ textAlign: "center", padding: 20, background: "#111", color: "white", minHeight: "100vh" }}>
      <h1>Hands Pong (Legacy Handpose) — Room: {roomId}</h1>
      <p>Your ID: {userId.slice(0,8)}... | Move hand left/right</p>

      <div style={{ position: "relative", display: "inline-block" }}>
        <Webcam
          ref={webcamRef}
          mirrored
          onLoadedMetadata={handleVideoReady}
          style={{ width: WIDTH, height: HEIGHT, objectFit: "cover", border: "4px solid #333" }}
        />
        <GameCanvas gameState={gameState} onRender={handleCanvasRender} />
      </div>

      {!isReady && <p>Waiting for camera...</p>}
      {!model && <p>Loading Handpose model...</p>}
    </div>
  );
}
