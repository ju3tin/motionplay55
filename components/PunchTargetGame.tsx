"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";

export interface Player {
  id: string;
  name?: string;
  score?: number;
  combo?: number;
}

export interface GameProps {
  roomId: string;
  userId: string;
  players: Player[];
  send: (data: any) => void;
  gameActive: boolean;
}

const GAME_DURATION = 60;
const SPAWN_INTERVAL = 800;
const TARGET_LIFE = 2200;
const HIT_RADIUS = 55;

interface Target {
  id: number;
  x: number;
  y: number;
  r: number;
  born: number;
  hit: boolean;
}

type GameState = "idle" | "loading" | "playing" | "ended";

export default function PunchTargetGame({
  roomId,
  userId,
  players,
  send,
  gameActive,
}: GameProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);

  const detectorRef = useRef<any>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const spawnIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const targetsRef = useRef<Target[]>([]);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const idRef = useRef(0);
  const isHostRef = useRef(false);

  const [state, setState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [time, setTime] = useState(GAME_DURATION);
  const [error, setError] = useState<string | null>(null);

  // Host detection
  useEffect(() => {
    if (!players?.length) return;
    const sorted = [...players].sort((a, b) => a.id.localeCompare(b.id));
    isHostRef.current = sorted[0].id === userId;
  }, [players, userId]);

  // Load Model
  useEffect(() => {
    async function loadModel() {
      try {
        setState("loading");
        const tf = await import("@tensorflow/tfjs");
        await import("@tensorflow/tfjs-backend-webgl");
        await tf.setBackend("webgl");
        await tf.ready();

        const pd = await import("@tensorflow-models/pose-detection");
        detectorRef.current = await pd.createDetector(
          pd.SupportedModels.MoveNet,
          { modelType: pd.movenet.modelType.SINGLEPOSE_LIGHTNING }
        );
        console.log("✅ Pose model loaded");
      } catch (err) {
        console.error("Model load error:", err);
        setError("Failed to load AI model. Please refresh.");
        setState("idle");
      }
    }
    loadModel();
  }, []);

  // Start Camera
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
      console.error("Camera error:", err);
      setError("Camera access failed");
    }
  }, []);

  // Spawn target (host only)
  const spawnTarget = useCallback(() => {
    if (!isHostRef.current) return;
    send({
      type: "TARGET",
      roomId,
      target: {
        id: idRef.current++,
        x: Math.random(),
        y: Math.random(),
        r: 40,
      },
    });
  }, [send, roomId]);

  // Hit detection
  const hitTarget = useCallback((screenX: number, screenY: number) => {
    let didHit = false;

    targetsRef.current = targetsRef.current.map((t) => {
      if (t.hit) return t;
      const area = areaRef.current;
      if (!area) return t;

      const tx = t.x * area.clientWidth;
      const ty = t.y * area.clientHeight;

      if (Math.hypot(screenX - tx, screenY - ty) < HIT_RADIUS + t.r) {
        didHit = true;
        return { ...t, hit: true };
      }
      return t;
    });

    if (didHit) {
      comboRef.current++;
      const points = 100 + comboRef.current * 15;
      scoreRef.current += points;

      setScore(scoreRef.current);
      setCombo(comboRef.current);

      send({
        type: "SCORE",
        roomId,
        userId,
        score: scoreRef.current,
        combo: comboRef.current,
      });
    }
  }, [send, roomId, userId]);

  // Detection loop (same style as your working game)
  const startDetection = useCallback(() => {
    if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);

    detectionIntervalRef.current = setInterval(async () => {
      if (state !== "playing" || !detectorRef.current || !videoRef.current) return;

      try {
        const poses = await detectorRef.current.estimatePoses(videoRef.current);
        const pose = poses?.[0];
        if (!pose) return;

        const area = areaRef.current;
        if (!area) return;

        const w = area.clientWidth;
        const h = area.clientHeight;
        const videoW = videoRef.current.videoWidth || 640;
        const videoH = videoRef.current.videoHeight || 480;

        // Left & Right wrist
        [9, 10].forEach((i) => {
          const kp = pose.keypoints[i];
          if (kp?.score && kp.score > 0.35) {
            const screenX = w - kp.x * (w / videoW);
            const screenY = kp.y * (h / videoH);
            hitTarget(screenX, screenY);
          }
        });
      } catch (e) {
        console.error("Detection error:", e);
      }
    }, 80);
  }, [state, hitTarget]);

  // Main game control
  useEffect(() => {
    if (!gameActive) {
      setState("idle");
      return;
    }

    const initGame = async () => {
      // Reset game state
      targetsRef.current = [];
      scoreRef.current = 0;
      comboRef.current = 0;
      idRef.current = 0;

      setScore(0);
      setCombo(0);
      setTime(GAME_DURATION);
      setError(null);

      await startCamera();
      setState("playing");
      startDetection();

      // Host spawns targets
      if (isHostRef.current) {
        spawnIntervalRef.current = setInterval(spawnTarget, SPAWN_INTERVAL);
      }

      // Timer
      timerIntervalRef.current = setInterval(() => {
        setTime((prev) => {
          if (prev <= 1) {
            setState("ended");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    };

    initGame();

    return () => {
      if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
      if (spawnIntervalRef.current) clearInterval(spawnIntervalRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [gameActive, startCamera, startDetection, spawnTarget]);

  // Canvas render loop
  useEffect(() => {
    if (state !== "playing") return;

    const canvas = canvasRef.current;
    const area = areaRef.current;
    if (!canvas || !area) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId: number;
    const render = () => {
      const width = area.clientWidth || 800;
      const height = area.clientHeight || 600;

      canvas.width = width;
      canvas.height = height;
      ctx.clearRect(0, 0, width, height);

      const now = Date.now();
      targetsRef.current = targetsRef.current.filter((t) => now - t.born <= TARGET_LIFE);

      targetsRef.current.forEach((t) => {
        const x = t.x * width;
        const y = t.y * height;

        ctx.beginPath();
        ctx.arc(x, y, t.r, 0, Math.PI * 2);
        ctx.fillStyle = t.hit ? "#00ff88" : "#ff3355";
        ctx.fill();

        ctx.font = `${t.r * 1.2}px serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(t.hit ? "💥" : "🎯", x, y);
      });

      rafId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(rafId);
  }, [state]);

  // Final cleanup
  useEffect(() => {
    return () => {
      if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
      if (spawnIntervalRef.current) clearInterval(spawnIntervalRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const leaderboard = [...players].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  if (error) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#ff5555" }}>
        <h2>Game Error</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Reload Page</button>
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        background: "#090914",
        position: "relative",
        overflow: "hidden",
        color: "#fff",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {/* HUD */}
      {state === "playing" && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 20,
            display: "flex",
            justifyContent: "center",
            gap: 50,
            padding: 16,
            background: "rgba(0,0,0,0.7)",
            fontSize: "1.5rem",
            fontWeight: 700,
          }}
        >
          <div>⏱ {`00:${String(time).padStart(2, "0")}`}</div>
          <div>⚡ {combo}</div>
          <div>🏆 {score}</div>
        </div>
      )}

      {/* Leaderboard */}
      {state === "playing" && (
        <div
          style={{
            position: "absolute",
            top: 90,
            right: 20,
            zIndex: 30,
            background: "rgba(0,0,0,0.6)",
            padding: 16,
            borderRadius: 12,
            minWidth: 210,
          }}
        >
          <h3>Players</h3>
          {leaderboard.map((p) => (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", margin: "4px 0" }}>
              <span>{p.name ?? p.id.slice(0, 8)}</span>
              <span>{p.score ?? 0}</span>
            </div>
          ))}
        </div>
      )}

      <div ref={areaRef} style={{ position: "absolute", inset: 0 }}>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: "scaleX(-1)",
            opacity: 0.28,
          }}
        />
        <canvas
          ref={canvasRef}
          style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
        />

        {/* Idle Screen */}
        {state === "idle" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,0,0,0.8)",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <h1>🥊 Punch Targets</h1>
              <p>Waiting for host to start the game...</p>
            </div>
          </div>
        )}

        {/* Loading */}
        {state === "loading" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,0,0,0.9)",
            }}
          >
            <h1>Loading AI Model...</h1>
          </div>
        )}

        {/* Game Over */}
        {state === "ended" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,0,0,0.85)",
            }}
          >
            <div
              style={{
                textAlign: "center",
                background: "#151528",
                padding: 50,
                borderRadius: 20,
              }}
            >
              <h1>Game Over</h1>
              <div style={{ fontSize: "6rem", fontWeight: 900, color: "#00d4ff" }}>{score}</div>
              <button
                onClick={() => setState("idle")}
                style={{
                  marginTop: 20,
                  padding: "14px 40px",
                  background: "#0066ff",
                  color: "white",
                  border: "none",
                  borderRadius: 12,
                }}
              >
                Exit
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
