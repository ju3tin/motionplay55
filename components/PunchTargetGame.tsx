"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";

const GAME_DURATION = 60;
const SPAWN_INTERVAL = 800;
const TARGET_LIFETIME = 2200;
const HIT_RADIUS = 55;

export interface GameProps {
  roomId?: string;
  currentGameId?: string;
  players: any[] | number;
  userId: string;
  send: (data: any) => void;
  gameActive?: boolean;
  status?: string;
  onReady?: () => void;
  onLeave?: () => void;
}

export default function PunchTargetGame({
  roomId,
  currentGameId,
  players: playersProp,
  userId,
  send,
  gameActive,
  status,
  onReady,
  onLeave,
}: GameProps) {
  const effectiveRoomId = roomId || currentGameId || "room1";

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameAreaRef = useRef<HTMLDivElement>(null);

  const [gameState, setGameState] = useState<"idle" | "loading" | "countdown" | "playing" | "ended">("idle");
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [errorMsg, setErrorMsg] = useState("");

  const detectorRef = useRef<any>(null);
  const targetsRef = useRef<any[]>([]);
  const animationRef = useRef<number | null>(null);
  const spawnIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Players handling
  const playersList = Array.isArray(playersProp)
    ? playersProp
    : Array.from({ length: Number(playersProp) || 1 }, (_, i) => ({
        id: `p${i}`,
        name: `Player ${i + 1}`,
      }));

  const isHost = playersList[0]?.id === userId;

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
        { modelType: pd.movenet.modelType.SINGLEPOSE_LIGHTNING }
      );
      console.log("✅ Model Loaded");
      return true;
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to load model");
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
    }
  }, []);

  const checkHit = useCallback((wx: number, wy: number) => {
    let hitAny = false;
    targetsRef.current = targetsRef.current.filter(t => {
      if (t.hit) return false;
      if (Math.hypot(wx - t.x, wy - t.y) < HIT_RADIUS + t.r) {
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

      send({
        type: "SCORE_UPDATE",
        roomId: effectiveRoomId,
        userId,
        score: newScore,
        combo: newCombo,
      });
    }
  }, [combo, score, maxCombo, send, effectiveRoomId, userId]);

  const spawnTarget = useCallback(() => {
    if (!isHost || gameState !== "playing") return;
    const area = gameAreaRef.current;
    if (!area) return;

    const rect = area.getBoundingClientRect();
    const padding = 120;
    const target = {
      id: Date.now(),
      x: padding + Math.random() * (rect.width - padding * 2),
      y: padding + Math.random() * (rect.height - padding * 2),
      r: 38,
      born: Date.now(),
      hit: false,
    };
    targetsRef.current.push(target);
    send({ type: "TARGET", roomId: effectiveRoomId, target });
  }, [isHost, gameState, send, effectiveRoomId]);

  // Receive messages from other players / host
  useEffect(() => {
    const handler = (e: any) => {
      const d = e.detail;
      if (d.type === "TARGET") {
        targetsRef.current.push({ ...d.target, born: Date.now() });
      }
    };
    window.addEventListener("game-message", handler);
    return () => window.removeEventListener("game-message", handler);
  }, []);

  const startGame = async () => {
    const loaded = await loadModel();
    if (!loaded) return;

    await startCamera();
    targetsRef.current = [];
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setTimeLeft(GAME_DURATION);

    setGameState("countdown");

    let c = 3;
    const cd = setInterval(() => {
      c--;
      if (c <= 0) {
        clearInterval(cd);
        setGameState("playing");
        startGameSystems();
      }
    }, 1000);
  };

  const startGameSystems = () => {
    // Timer
    timerIntervalRef.current = setInterval(() => {
      setTimeLeft(prev => prev <= 1 ? (endGame(), 0) : prev - 1);
    }, 1000);

    // Host spawns targets
    if (isHost) {
      spawnIntervalRef.current = setInterval(spawnTarget, SPAWN_INTERVAL);
    }
  };

  const endGame = () => {
    setGameState("ended");
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (spawnIntervalRef.current) clearInterval(spawnIntervalRef.current);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
  };

  // Render + Detection Loop
  useEffect(() => {
    if (gameState !== "playing") return;

    const canvas = canvasRef.current;
    const area = gameAreaRef.current;
    if (!canvas || !area) return;

    const ctx = canvas.getContext("2d")!;
    let lastDetection = 0;

    const loop = async (timestamp: number) => {
      const w = area.clientWidth;
      const h = area.clientHeight;
      canvas.width = w;
      canvas.height = h;
      ctx.clearRect(0, 0, w, h);

      const now = Date.now();
      targetsRef.current = targetsRef.current.filter(t => now - t.born <= TARGET_LIFETIME);

      // Draw Targets
      targetsRef.current.forEach(t => {
        const x = t.x;
        const y = t.y;
        ctx.save();
        if (!t.hit) {
          const pulse = 1 + Math.sin(now / 280) * 0.12;
          ctx.translate(x, y);
          ctx.scale(pulse, pulse);
          ctx.translate(-x, -y);
        }

        ctx.beginPath();
        ctx.arc(x, y, t.r + 10, 0, Math.PI * 2);
        ctx.strokeStyle = t.hit ? "#00ff88" : "#ff3366";
        ctx.lineWidth = 8;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(x, y, t.r, 0, Math.PI * 2);
        ctx.fillStyle = t.hit ? "#00ff88" : "#ff2255";
        ctx.fill();

        ctx.font = `${t.r * 1.4}px sans-serif`;
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(t.hit ? "💥" : "🎯", x, y);
        ctx.restore();
      });

      // Pose Detection + Skeleton
      if (timestamp - lastDetection > 45 && detectorRef.current && videoRef.current) {
        lastDetection = timestamp;
        try {
          const poses = await detectorRef.current.estimatePoses(videoRef.current, {
            maxPoses: 1,
            flipHorizontal: true,
          });

          if (poses?.[0]) {
            const pose = poses[0];
            const scaleX = w / (videoRef.current.videoWidth || 640);
            const scaleY = h / (videoRef.current.videoHeight || 480);

            const keypoints = pose.keypoints;

            // Draw Skeleton
            ctx.strokeStyle = "#00ffff";
            ctx.lineWidth = 5;
            const connections = [[5,7],[7,9],[6,8],[8,10],[5,6],[5,11],[6,12],[11,13],[13,15],[12,14],[14,16],[11,12]];

            connections.forEach(([a, b]) => {
              const kpA = keypoints[a];
              const kpB = keypoints[b];
              if (kpA?.score > 0.3 && kpB?.score > 0.3) {
                ctx.beginPath();
                ctx.moveTo(w - kpA.x * scaleX, kpA.y * scaleY);
                ctx.lineTo(w - kpB.x * scaleX, kpB.y * scaleY);
                ctx.stroke();
              }
            });

            // Keypoints
            keypoints.forEach((kp: any, i: number) => {
              if (kp.score > 0.35) {
                const x = w - kp.x * scaleX;
                const y = kp.y * scaleY;
                ctx.fillStyle = (i === 9 || i === 10) ? "#ffff00" : "#00ffff";
                ctx.beginPath();
                ctx.arc(x, y, 7, 0, Math.PI * 2);
                ctx.fill();
              }
            });

            // Hit Detection
            [9, 10].forEach(i => {
              const kp = keypoints[i];
              if (kp?.score > 0.33) {
                const screenX = w - kp.x * scaleX;
                const screenY = kp.y * scaleY;
                checkHit(screenX, screenY);
              }
            });
          }
        } catch (e) {
          console.error(e);
        }
      }

      animationRef.current = requestAnimationFrame(loop);
    };

    animationRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [gameState, checkHit]);

  return (
    <div style={{ width: "100%", height: "100vh", background: "linear-gradient(to bottom, #0f0f1a, #1a1a2e)", position: "relative", overflow: "hidden", color: "white" }}>
      <header style={{ position: "fixed", top: 0, left: 0, right: 0, background: "rgba(0,0,0,0.6)", padding: "12px 20px", zIndex: 100, display: "flex", justifyContent: "space-between" }}>
        <button onClick={onLeave || (() => window.location.reload())}>← Back</button>
        <div style={{ display: "flex", gap: "24px", fontSize: "1.2rem" }}>
          <div>⏱ {`${Math.floor(timeLeft/60).toString().padStart(2,'0')}:${(timeLeft%60).toString().padStart(2,'0')}`}</div>
          <div>⚡ {combo}</div>
          <div>🏆 {score}</div>
          {isHost && <div style={{ color: "#ff0" }}>👑 HOST</div>}
        </div>
      </header>

      <div ref={gameAreaRef} style={{ position: "relative", width: "100%", height: "100vh" }}>
        <video ref={videoRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)", opacity: 0.25 }} autoPlay playsInline muted />
        <canvas ref={canvasRef} style={{ position: "absolute", inset: 0 }} />
      </div>

      {gameState === "idle" && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.8)", zIndex: 10 }}>
          <button onClick={startGame} style={{ padding: "20px 60px", fontSize: "1.6rem", background: "#0066ff", border: "none", borderRadius: "16px" }}>
            Start Game
          </button>
        </div>
      )}

      {gameState === "ended" && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.8)", zIndex: 30 }}>
          <div style={{ textAlign: "center" }}>
            <h1>Game Over!</h1>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px", margin: "30px 0" }}>
              <div>
                <div style={{ color: "#aaa" }}>Score</div>
                <div style={{ fontSize: "3.5rem", color: "#00d4ff" }}>{score}</div>
              </div>
              <div>
                <div style={{ color: "#aaa" }}>Max Combo</div>
                <div style={{ fontSize: "3.5rem", color: "#ffaa00" }}>{maxCombo}</div>
              </div>
            </div>
            <button onClick={() => window.location.reload()} style={{ padding: "14px 40px" }}>Play Again</button>
          </div>
        </div>
      )}
    </div>
  );
}
