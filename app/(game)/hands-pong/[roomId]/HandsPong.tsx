"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import Webcam from "react-webcam";
import * as handPoseDetection from "@tensorflow-models/hand-pose-detection";
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

export default function HandsPong({ roomId }: { roomId: string }) {
  const [userId] = useState(() => crypto.randomUUID());
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectorRef = useRef<any>(null);
  const animationRef = useRef<number | null>(null); // ✅ Fixed
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

  const playSound = (frequency: number, duration: number, type: "sine" | "square" = "sine") => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const oscillator = audioContextRef.current.createOscillator();
    const gain = audioContextRef.current.createGain();

    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.value = 0.3;

    oscillator.connect(gain);
    gain.connect(audioContextRef.current.destination);
    oscillator.start();
    setTimeout(() => oscillator.stop(), duration);
  };

  const initDetector = useCallback(async () => {
    const model = handPoseDetection.SupportedModels.MediaPipeHands;
    detectorRef.current = await handPoseDetection.createDetector(model, {
      runtime: "mediapipe",
      modelType: "full",
      maxHands: 1,
      solutionPath: "https://cdn.jsdelivr.net/npm/@mediapipe/hands",
    });
  }, []);

  const gameLoop = useCallback(async () => {
    const video = webcamRef.current?.video;
    if (!video || !detectorRef.current) {
      animationRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    const hands = await detectorRef.current.estimateHands(video);
    if (hands.length > 0) {
      const landmarks = hands[0].keypoints;
      const palmX = landmarks[0]?.x || landmarks[9]?.x;
      if (palmX !== undefined) {
        const normalizedX = (palmX / video.videoWidth) * WIDTH;
        const paddleX = Math.max(0, Math.min(WIDTH - PADDLE_WIDTH, normalizedX - PADDLE_WIDTH / 2));

        publish({
          type: "hand",
          payload: { x: paddleX, playerId: userId },
        });
      }
    }

    setGameState((prev) => {
      let { ball, score, paddles } = prev;

      ball.x += ball.vx;
      ball.y += ball.vy;

      if (ball.x <= 0 || ball.x >= WIDTH) ball.vx *= -1;

      const topPaddleY = 30;
      const bottomPaddleY = HEIGHT - 50;

      // Top paddle collision
      if (
        ball.y - BALL_SIZE / 2 <= topPaddleY + PADDLE_HEIGHT &&
        ball.y + BALL_SIZE / 2 >= topPaddleY &&
        ball.x >= paddles.top &&
        ball.x <= paddles.top + PADDLE_WIDTH
      ) {
        ball.vy = Math.abs(ball.vy) * 1.02; // slight speed up
        playSound(600, 60);
      }

      // Bottom paddle collision
      if (
        ball.y + BALL_SIZE / 2 >= bottomPaddleY &&
        ball.y - BALL_SIZE / 2 <= bottomPaddleY + PADDLE_HEIGHT &&
        ball.x >= paddles.bottom &&
        ball.x <= paddles.bottom + PADDLE_WIDTH
      ) {
        ball.vy = -Math.abs(ball.vy) * 1.02;
        playSound(600, 60);
      }

      if (ball.y < 0) {
        score.bottom++;
        playSound(200, 300, "square");
        ball.x = WIDTH / 2;
        ball.y = HEIGHT / 2;
        ball.vx = (Math.random() - 0.5) * 8;
        ball.vy = 5;
      }
      if (ball.y > HEIGHT) {
        score.top++;
        playSound(200, 300, "square");
        ball.x = WIDTH / 2;
        ball.y = HEIGHT / 2;
        ball.vx = (Math.random() - 0.5) * 8;
        ball.vy = -5;
      }

      return { ball, score, paddles };
    });

    animationRef.current = requestAnimationFrame(gameLoop);
  }, [publish, userId]);

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const render = () => {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      ctx.strokeStyle = "#fff";
      ctx.setLineDash([10, 10]);
      ctx.beginPath();
      ctx.moveTo(0, HEIGHT / 2);
      ctx.lineTo(WIDTH, HEIGHT / 2);
      ctx.stroke();
      ctx.setLineDash([]);

      const { ball, score, paddles } = gameState;

      ctx.fillStyle = "#0ff";
      ctx.fillRect(paddles.top, 30, PADDLE_WIDTH, PADDLE_HEIGHT);
      ctx.fillRect(paddles.bottom, HEIGHT - 50, PADDLE_WIDTH, PADDLE_HEIGHT);

      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, BALL_SIZE / 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = "bold 48px Arial";
      ctx.textAlign = "center";
      ctx.fillText(score.top.toString(), WIDTH / 2, 100);
      ctx.fillText(score.bottom.toString(), WIDTH / 2, HEIGHT - 60);
    };

    render();
  }, [gameState]);

  useEffect(() => {
    initDetector().then(() => {
      animationRef.current = requestAnimationFrame(gameLoop);
    });

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [initDetector, gameLoop]);

  return (
    <div style={{ textAlign: "center", padding: 20, background: "#111", color: "white", minHeight: "100vh" }}>
      <h1>Hands Pong — Room: {roomId}</h1>
      <p>Your ID: {userId.slice(0, 8)}... | Move hand left/right</p>

      <div style={{ position: "relative", display: "inline-block" }}>
        <Webcam
          ref={webcamRef}
          mirrored
          style={{ width: 320, height: 240, border: "3px solid #0ff" }}
        />
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          style={{ border: "4px solid #fff", background: "#000", marginTop: 20 }}
        />
      </div>
    </div>
  );
}
