// app/punch-game/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import * as tf from "@tensorflow/tfjs";
import * as poseDetection from "@tensorflow-models/pose-detection";

const GAME_DURATION = 60;       // seconds
const SPAWN_INTERVAL = 800;     // ms
const TARGET_LIFETIME = 2200;   // ms
const HIT_RADIUS = 55;          // px

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
  const animationRef = useRef<number>();

  const [detector, setDetector] = useState<poseDetection.PoseDetector | null>(null);
  const [gameState, setGameState] = useState<"idle" | "countdown" | "playing" | "paused" | "ended">("idle");
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [targets, setTargets] = useState<Target[]>([]);
  const [countdown, setCountdown] = useState(3);

  // ─── Load Pose Model ─────────────────────────────
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

  // ─── Start Camera ─────────────────────────────
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
      console.error("Camera access error:", err);
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

  // ─── Game Timer ─────────────────────────────
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

      // Remove after lifetime
      setTimeout(() => {
        setTargets((prev) => prev.filter((t) => t.id !== id));
        setCombo(0);
      }, TARGET_LIFETIME);
    }, SPAWN_INTERVAL);

    return () => clearInterval(spawner);
  }, [gameState]);

  // ─── Pose Detection ─────────────────────────────
  useEffect(() => {
    if (gameState !== "playing" || !detector || !videoRef.current) return;

    const detect = async () => {
      if (!videoRef.current) return;
      const poses = await detector.estimatePoses(videoRef.current);
      if (poses?.length) {
        const pose = poses[0];
        const rect = gameAreaRef.current?.getBoundingClientRect();
        if (!rect) return;
        const scaleX = rect.width / videoRef.current.videoWidth;
        const scaleY = rect.height / videoRef.current.videoHeight;

        [pose.keypoints[9], pose.keypoints[10]].forEach((kp) => {
          if (kp?.score > 0.35) {
            const wx = rect.width - kp.x * scaleX;
            const wy = kp.y * scaleY;
            checkHit(wx, wy);
          }
        });
      }
      animationRef.current = requestAnimationFrame(detect);
    };

    detect();
    return () => cancelAnimationFrame(animationRef.current!);
  }, [gameState, detector, targets]);

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
          if (newCombo > maxCombo) setMaxCombo(newCombo);
          return newCombo;
        });
        setScore((s) => s + 100 + combo * 15);
      }

      return updated;
    });
  };

  // ─── Pause / Resume ─────────────────────────────
  const pauseGame = () => setGameState("paused");
  const resumeGame = () => setGameState("playing");

  // ─── End Game ─────────────────────────────
  const endGame = async () => {
    setGameState("ended");
    cancelAnimationFrame(animationRef.current!);

    // Submit score
    try {
      const res = await fetch("/api/leaderboard/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game_id: "4adfb0a9-2b3b-4716-b02e-8ac3c5a9b261",
          score,
          duration_seconds: GAME_DURATION,
          metadata: { duration_ms: GAME_DURATION * 1000, engine: "punchgame", maxCombo },
        }),
      });
      if (!res.ok) console.error("Score submission failed:", await res.text());
      else console.log("Score submitted!");
    } catch (err) {
      console.error("Error submitting score:", err);
    }
  };

  // ─── Initial Load ─────────────────────────────
  useEffect(() => {
    loadModel();
    return () => {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gradient-to-b from-[#0f0f1a] to-[#1a1a2e] text-white flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-black/60 backdrop-blur-md p-3 flex justify-between z-50">
        <button onClick={() => window.location.href = "/"}>← Back</button>
        <div className={`flex gap-6 text-lg ${gameState === "idle" ? "hidden" : ""}`}>
          <div className="flex items-center gap-2"><span>⏱</span> <span>{`${Math.floor(timeLeft/60).toString().padStart(2,'0')}:${(timeLeft%60).toString().padStart(2,'0')}`}</span></div>
          <div className="flex items-center gap-2"><span>⚡</span> {combo}</div>
          <div className="flex items-center gap-2"><span>🏆</span> {score}</div>
        </div>
      </header>

      {/* Game Area */}
      <div ref={gameAreaRef} className="relative flex-1 overflow-hidden">
        <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover scale-x-[-1] opacity-25 pointer-events-none" autoPlay muted playsInline />

        {/* Targets */}
        {targets.map((t) => (
          <div key={t.id} className={`absolute flex items-center justify-center transition-all duration-200 ${t.hit ? "scale-150 rotate-[15deg] opacity-0" : "animate-pulse"}`} style={{ left: t.x - t.radius, top: t.y - t.radius, width: t.radius*2, height: t.radius*2 }}>
            <div className="w-full h-full bg-red-700/75 border-4 border-red-900 rounded-full flex items-center justify-center text-2xl">🎯</div>
          </div>
        ))}

        {/* Idle Overlay */}
        {gameState === "idle" && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-10">
            <div className="bg-[#1e1e32]/90 border border-[#444] rounded-2xl p-10 max-w-md text-center shadow-xl">
              <h1 className="text-4xl mb-4">Punch Targets</h1>
              <p className="text-gray-400 mb-4">Use your hands to punch targets!<br />Build combos for bonus points.<br />60 seconds challenge.</p>
              <button onClick={startGame} className="bg-blue-600 px-8 py-3 rounded-xl text-xl hover:bg-blue-500">Start Game</button>
            </div>
          </div>
        )}

        {/* Countdown Overlay */}
        {gameState === "countdown" && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-10">
            <div className="text-[18rem] font-black text-cyan-400">{countdown}</div>
          </div>
        )}

        {/* Paused Overlay */}
        {gameState === "paused" && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-10">
            <div className="bg-[#1e1e32]/90 border border-[#444] rounded-2xl p-10 max-w-md text-center shadow-xl">
              <h2 className="text-5xl mb-8">PAUSED</h2>
              <button onClick={resumeGame} className="bg-blue-600 text-white rounded-xl px-8 py-3 text-xl mb-4 hover:bg-blue-500">Resume</button>
              <button onClick={() => window.location.reload()} className="bg-gray-700 text-white rounded-xl px-8 py-3 text-xl hover:bg-gray-600">Quit</button>
            </div>
          </div>
        )}

        {/* Game Over Overlay */}
        {gameState === "ended" && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-10">
            <div className="bg-[#1e1e32]/90 border border-[#444] rounded-2xl p-10 max-w-md text-center shadow-xl">
              <h1 className="text-4xl mb-4">Game Over!</h1>
              <div className="grid grid-cols-2 gap-5 my-8">
                <div>
                  <div className="text-gray-400 text-sm">Score</div>
                  <div className="text-cyan-400 text-6xl">{score}</div>
                </div>
                <div>
                  <div className="text-gray-400 text-sm">Max Combo</div>
                  <div className="text-yellow-500 text-6xl">{maxCombo}</div>
                </div>
              </div>
              <button onClick={() => window.location.reload()} className="bg-blue-600 text-white rounded-xl px-8 py-3 text-xl hover:bg-blue-500">Play Again</button>
            </div>
          </div>
        )}

        {/* Pause Button */}
        {gameState === "playing" && (
          <button onClick={pauseGame} className="absolute bottom-5 right-5 bg-black/50 border border-gray-600 backdrop-blur-sm p-3 rounded-full z-20 text-xl">⏸</button>
        )}
      </div>
    </div>
  );
}
