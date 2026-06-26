"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";

export interface GameProps {
  roomId?: string;
  currentGameId?: string;
  players?: any;
  userId?: string;
  send?: (data: any) => void;
  gameActive?: boolean;
  status?: string;
  onReady?: () => void;
  onLeave?: () => void;
}

const GAME_DURATION = 60;
const SPAWN_INTERVAL = 800;
const TARGET_LIFETIME = 2200;
const HIT_RADIUS = 55;

type GameState = "idle" | "loading" | "countdown" | "playing" | "paused" | "ended";

export default function PunchTargetGame({
  roomId,
  currentGameId,
  players,
  userId,
  send,
  gameActive,
  status,
  onReady,
  onLeave,
}: GameProps) {
  const effectiveRoomId = roomId || currentGameId || "local";

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const detectorRef = useRef<any>(null);

  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [errorMsg, setErrorMsg] = useState("");

  const targetsRef = useRef<any[]>([]);
  const animationRef = useRef<number | null>(null);
  const spawnIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isHostRef = useRef(false);

  // Host detection
  useEffect(() => {
    if (!userId) return;
    isHostRef.current = true; // For single player / first implementation
    console.log("🎮 Single Player Mode - You are host");
  }, [userId]);

  // Load Model
  const loadModel = useCallback(async () => {
    try {
      setGameState("loading");
      const tf = await import("@tensorflow/tfjs");
      await import("@tensorflow/tfjs-backend-webgl");
      await tf.setBackend("webgl");
      await tf.ready();

      const pd = await import("@tensorflow-models/pose-detection");
      detectorRef.current = await pd.createDetector(
        pd.SupportedModels.MoveNet,
        { modelType: pd.movenet.modelType.SINGLEPOSE_THUNDER, enableSmoothing: true }
      );
      console.log("✅ Model Loaded");
      return true;
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to load AI model");
      return false;
    }
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      setErrorMsg("Camera access denied");
      console.error(err);
    }
  }, []);

  const checkHit = useCallback((wx: number, wy: number) => {
    let hitAny = false;

    targetsRef.current = targetsRef.current.filter((t) => {
      if (t.hit) return false;

      const dist = Math.hypot(wx - t.x, wy - t.y);
      if (dist < HIT_RADIUS + t.r) {
        t.hit = true;
        hitAny = true;
        return true;
      }
      return true;
    });

    if (hitAny) {
      const newCombo = combo + 1;
      const newScore = score + 100 + newCombo * 15;

      setCombo(newCombo);
      setScore(newScore);
      if (newCombo > maxCombo) setMaxCombo(newCombo);
    }
  }, [score, combo, maxCombo]);

  // Spawn Target (Canvas version)
  const spawnTarget = useCallback(() => {
    const area = gameAreaRef.current;
    if (!area || gameState !== "playing") return;

    const rect = area.getBoundingClientRect();
    const padding = 90;
    const x = padding + Math.random() * (rect.width - padding * 2);
    const y = padding + Math.random() * (rect.height - padding * 2);
    const r = 32 + Math.random() * 18;

    targetsRef.current.push({
      id: Date.now(),
      x,
      y,
      r,
      born: Date.now(),
      hit: false,
    });
  }, [gameState]);

  // Main Detection Loop
  const startDetection = useCallback(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);

    const detect = async () => {
      if (gameState !== "playing" || !detectorRef.current || !videoRef.current) {
        animationRef.current = requestAnimationFrame(detect);
        return;
      }

      try {
        const poses = await detectorRef.current.estimatePoses(videoRef.current, {
          maxPoses: 1,
          flipHorizontal: true,
        });

        if (poses?.[0]) {
          const pose = poses[0];
          const area = gameAreaRef.current;
          if (!area) return;

          const rect = area.getBoundingClientRect();
          const scaleX = rect.width / (videoRef.current.videoWidth || 640);
          const scaleY = rect.height / (videoRef.current.videoHeight || 480);

          [9, 10].forEach((i) => {
            const kp = pose.keypoints[i];
            if (kp?.score > 0.33) {
              const screenX = rect.width - kp.x * scaleX;
              const screenY = kp.y * scaleY;
              checkHit(screenX, screenY);
            }
          });
        }
      } catch (e) {
        console.error(e);
      }

      animationRef.current = requestAnimationFrame(detect);
    };

    detect();
  }, [gameState, checkHit]);

  // Render Loop (Canvas)
  useEffect(() => {
    if (gameState !== "playing") return;

    const canvas = canvasRef.current;
    const area = gameAreaRef.current;
    if (!canvas || !area) return;

    const ctx = canvas.getContext("2d")!;

    const render = () => {
      const width = area.clientWidth;
      const height = area.clientHeight;
      canvas.width = width;
      canvas.height = height;
      ctx.clearRect(0, 0, width, height);

      const now = Date.now();

      // Remove expired targets
      targetsRef.current = targetsRef.current.filter((t) => {
        if (now - t.born > TARGET_LIFETIME) return false;
        return true;
      });

      targetsRef.current.forEach((t) => {
        const x = t.x;
        const y = t.y;
        const alpha = t.hit ? 0.3 : 1;

        ctx.save();
        if (!t.hit) {
          const pulse = 1 + Math.sin(now / 300) * 0.08;
          ctx.translate(x, y);
          ctx.scale(pulse, pulse);
          ctx.translate(-x, -y);
        }

        // Outer glow
        ctx.beginPath();
        ctx.arc(x, y, t.r + 8, 0, Math.PI * 2);
        ctx.strokeStyle = t.hit ? "#00ff88" : "rgba(255, 60, 80, 0.6)";
        ctx.lineWidth = 5;
        ctx.stroke();

        // Main target
        ctx.beginPath();
        ctx.arc(x, y, t.r, 0, Math.PI * 2);
        ctx.fillStyle = t.hit ? "#00ff88" : "#ff3355";
        ctx.fill();

        ctx.font = `${t.r * 1.1}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#fff";
        ctx.fillText(t.hit ? "💥" : "🎯", x, y);

        ctx.restore();
      });

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationRef.current!);
  }, [gameState]);

  // Game Timer & Spawner
  useEffect(() => {
    if (gameState !== "playing") return;

    startDetection();

    // Timer
    timerIntervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Spawn targets
    spawnIntervalRef.current = setInterval(spawnTarget, SPAWN_INTERVAL);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (spawnIntervalRef.current) clearInterval(spawnIntervalRef.current);
    };
  }, [gameState, startDetection, spawnTarget]);

  const startGame = async () => {
    if (!detectorRef.current) await loadModel();
    await startCamera();

    targetsRef.current = [];
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setTimeLeft(GAME_DURATION);

    setGameState("countdown");

    let count = 3;
    const cd = setInterval(() => {
      count--;
      if (count <= 0) {
        clearInterval(cd);
        setGameState("playing");
      }
    }, 1000);
  };

  const endGame = () => {
    setGameState("ended");
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (spawnIntervalRef.current) clearInterval(spawnIntervalRef.current);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
  };

  return (
    <div style={{ width: "100%", height: "100vh", background: "linear-gradient(to bottom, #0f0f1a, #1a1a2e)", position: "relative", overflow: "hidden", color: "white", fontFamily: "system-ui, sans-serif" }}>
      {/* Header */}
      <header style={{ position: "fixed", top: 0, left: 0, right: 0, background: "rgba(0,0,0,0.7)", padding: "12px 20px", zIndex: 100, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={onLeave || (() => window.location.reload())} style={{ background: "transparent", border: "none", color: "white", fontSize: "1.1rem" }}>
          ← Back
        </button>
        {(gameState === "playing" || gameState === "ended") && (
          <div style={{ display: "flex", gap: "24px", fontSize: "1.2rem" }}>
            <div>⏱ {`${Math.floor(timeLeft / 60).toString().padStart(2, "0")}:${(timeLeft % 60).toString().padStart(2, "0")}`}</div>
            <div>⚡ {combo}</div>
            <div>🏆 {score}</div>
          </div>
        )}
      </header>

      <div ref={gameAreaRef} style={{ position: "relative", width: "100%", height: "100vh" }}>
        <video ref={videoRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)", opacity: 0.25 }} autoPlay playsInline muted />

        <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />

        {/* Idle Screen */}
        {(gameState === "idle" || gameState === "loading") && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
            <div style={{ background: "rgba(30,30,50,0.95)", padding: "40px", borderRadius: "20px", textAlign: "center", maxWidth: "420px" }}>
              <h1 style={{ fontSize: "2.8rem", marginBottom: "16px" }}>Punch Targets</h1>
              <p style={{ color: "#aaa", marginBottom: "20px" }}>
                Use your hands to punch the targets!<br />
                Build combos for bonus points.
              </p>
              {errorMsg && <p style={{ color: "#ff5555" }}>{errorMsg}</p>}
              <button onClick={startGame} style={{ background: "#0066ff", color: "white", border: "none", padding: "14px 40px", fontSize: "1.2rem", borderRadius: "12px", cursor: "pointer" }}>
                {gameState === "loading" ? "Loading Model..." : "Start Game"}
              </button>
            </div>
          </div>
        )}

        {/* Countdown */}
        {gameState === "countdown" && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 20 }}>
            <div style={{ fontSize: "18rem", fontWeight: 900, color: "#00d4ff" }}>{timeLeft > 3 ? 3 : timeLeft}</div>
          </div>
        )}

        {/* Game Over */}
        {gameState === "ended" && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 30 }}>
            <div style={{ background: "rgba(30,30,50,0.95)", padding: "40px", borderRadius: "20px", textAlign: "center" }}>
              <h1>Game Over!</h1>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px", margin: "30px 0" }}>
                <div>
                  <div style={{ color: "#aaa" }}>Score</div>
                  <div style={{ fontSize: "3.5rem", color: "#00d4ff" }}>{score}</div>
                </div>
                <div>
                  <div style={{ color: "#aaa" }}>Max Combo</div>
                  <div style={{ fontSize: "3.5rem", color: "#ffaa00" }}>{maxCombo}</div>
                </div>
              </div>
              <button onClick={() => window.location.reload()} style={{ background: "#0066ff", padding: "14px 32px", borderRadius: "12px" }}>
                Play Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
