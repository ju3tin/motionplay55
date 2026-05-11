// app/punch-game/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import * as tf from "@tensorflow/tfjs";
import * as poseDetection from "@tensorflow-models/pose-detection";

const GAME_DURATION = 60;
const SPAWN_INTERVAL = 800;
const TARGET_LIFETIME = 2200;
const HIT_RADIUS = 55;

interface Target {
  id: number;
  x: number;
  y: number;
  radius: number;
  hit: boolean;
}

export default function PunchGame() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null); // ✅ FIXED

  const [detector, setDetector] = useState<poseDetection.PoseDetector | null>(null);
  const [gameState, setGameState] = useState<"idle" | "countdown" | "playing" | "paused" | "ended">("idle");
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [targets, setTargets] = useState<Target[]>([]);
  const [countdown, setCountdown] = useState(3);

  // ─── Load Model ─────────────────────────────
  const loadModel = async () => {
    try {
      await tf.setBackend("webgl");
      await tf.ready();
      const det = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        { modelType: "SinglePose.Lightning" }
      );
      setDetector(det);
    } catch (err) {
      console.error("Failed to load model", err);
    }
  };

  // ─── Camera ─────────────────────────────
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.error("Camera error:", err);
    }
  };

  // ─── Start Game ─────────────────────────────
  const startGame = async () => {
    if (gameState !== "idle") return;

    if (!detector) await loadModel();
    await startCamera();

    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setTimeLeft(GAME_DURATION);
    setTargets([]);
    setCountdown(3);
    setGameState("countdown");
  };

  // ─── Countdown ─────────────────────────────
  useEffect(() => {
    if (gameState !== "countdown") return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setGameState("playing");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState]);

  // ─── Timer ─────────────────────────────
  useEffect(() => {
    if (gameState !== "playing") return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState]);

  // ─── Spawn Targets ─────────────────────────────
  useEffect(() => {
    if (gameState !== "playing") return;

    const spawner = setInterval(() => {
      if (!gameAreaRef.current) return;

      const rect = gameAreaRef.current.getBoundingClientRect();
      const padding = 90;

      const x = padding + Math.random() * (rect.width - padding * 2);
      const y = padding + Math.random() * (rect.height - padding * 2);
      const radius = 32 + Math.random() * 18;
      const id = Date.now();

      setTargets((prev) => [...prev, { id, x, y, radius, hit: false }]);

      setTimeout(() => {
        setTargets((prev) => prev.filter((t) => t.id !== id));
        setCombo(0);
      }, TARGET_LIFETIME);
    }, SPAWN_INTERVAL);

    return () => clearInterval(spawner);
  }, [gameState]);

  // ─── Hit Detection ─────────────────────────────
  const checkHit = (wx: number, wy: number) => {
    setTargets((prev) => {
      let hitAny = false;

      const updated = prev.map((t) => {
        const dist = Math.hypot(wx - t.x, wy - t.y);
        if (!t.hit && dist < HIT_RADIUS + t.radius) {
          hitAny = true;
          return { ...t, hit: true };
        }
        return t;
      });

      if (hitAny) {
        setCombo((c) => {
          const newCombo = c + 1;
          setMaxCombo((m) => Math.max(m, newCombo));
          return newCombo;
        });

        setScore((s) => s + 100 + combo * 15);
      }

      return updated;
    });
  };

  // ─── Pose Detection Loop (FIXED) ─────────────────────────────
  useEffect(() => {
    if (gameState !== "playing" || !detector || !videoRef.current) return;

    let isRunning = true;

    const detect = async () => {
      if (!videoRef.current || !isRunning) return;

      const poses = await detector.estimatePoses(videoRef.current);

      if (poses?.length && gameAreaRef.current) {
        const pose = poses[0];
        const rect = gameAreaRef.current.getBoundingClientRect();

        const scaleX = rect.width / videoRef.current.videoWidth;
        const scaleY = rect.height / videoRef.current.videoHeight;

        [pose.keypoints[9], pose.keypoints[10]].forEach((kp) => {
          if (kp?.score && kp.score > 0.35) {
            const wx = rect.width - kp.x * scaleX;
            const wy = kp.y * scaleY;
            checkHit(wx, wy);
          }
        });
      }

      animationRef.current = requestAnimationFrame(detect);
    };

    detect();

    return () => {
      isRunning = false;
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState, detector]); // ✅ removed "targets"

  // ─── Pause / Resume ─────────────────────────────
  const pauseGame = () => setGameState("paused");
  const resumeGame = () => setGameState("playing");

  // ─── End Game ─────────────────────────────
  const endGame = async () => {
    setGameState("ended");

    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
    }

    try {
      await fetch("/api/leaderboard/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game_id: "4adfb0a9-2b3b-4716-b02e-8ac3c5a9b261",
          score,
          duration_seconds: GAME_DURATION,
          metadata: { maxCombo },
        }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  // ─── Init ─────────────────────────────
  useEffect(() => {
    loadModel();

    return () => {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream)
          .getTracks()
          .forEach((t) => t.stop());
      }
    };
  }, []);

  // ─── UI (unchanged mostly) ─────────────────────────────
  return (
    <div className="relative w-full h-screen overflow-hidden bg-black text-white">
      <div ref={gameAreaRef} className="relative w-full h-full">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover scale-x-[-1] opacity-25"
          autoPlay
          muted
          playsInline
        />

        {targets.map((t) => (
          <div
            key={t.id}
            className={`absolute ${t.hit ? "opacity-0 scale-150" : "animate-pulse"}`}
            style={{
              left: t.x - t.radius,
              top: t.y - t.radius,
              width: t.radius * 2,
              height: t.radius * 2,
            }}
          >
            🎯
          </div>
        ))}
      </div>
    </div>
  );
}
