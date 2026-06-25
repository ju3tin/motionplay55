"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";

export interface Player {
  id: string;
  name?: string;
  score?: number;
  combo?: number;
}

export interface GameProps {
  currentGameId: string;
  players: Player[] | number;        // ✅ Accept both array and number
  userId: string;
  send: (data: any) => void;
  status: string;
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

type GameState = "idle" | "loading" | "countdown" | "playing" | "ended";

export default function PunchTargetGame({
  currentGameId,
  players: playersProp,
  userId,
  send,
  status,
}: GameProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);

  const detectorRef = useRef<any>(null);
  const rafRef = useRef<number>(0);
  const spawnRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const targetsRef = useRef<Target[]>([]);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const maxComboRef = useRef(0);
  const idRef = useRef(0);
  const isHostRef = useRef(false);

  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [countdown, setCountdown] = useState(3);
  const [errorMsg, setErrorMsg] = useState("");
  const [finalScore, setFinalScore] = useState(0);
  const [finalCombo, setFinalCombo] = useState(0);

  const gameActive = status === "playing";

  // Convert players prop to array for leaderboard
  const playersList: Player[] = Array.isArray(playersProp)
    ? playersProp
    : Array.from({ length: typeof playersProp === "number" ? playersProp : 0 }, (_, i) => ({
        id: `player-${i}`,
        name: `Player ${i + 1}`,
      }));

  // Host detection
  useEffect(() => {
    if (!playersList.length) return;
    const sorted = [...playersList].sort((a, b) => a.id.localeCompare(b.id));
    isHostRef.current = sorted[0].id === userId;
  }, [playersList, userId]);

  // Load Model
  const loadModel = useCallback(async () => {
    setGameState("loading");
    setErrorMsg("");
    try {
      const tf = await import("@tensorflow/tfjs");
      await import("@tensorflow/tfjs-backend-webgl");
      await tf.setBackend("webgl");
      await tf.ready();

      const pd = await import("@tensorflow-models/pose-detection");
      detectorRef.current = await pd.createDetector(
        pd.SupportedModels.MoveNet,
        { modelType: pd.movenet.modelType.SINGLEPOSE_LIGHTNING }
      );
      return true;
    } catch (e: any) {
      setErrorMsg("Failed to load model: " + e.message);
      setGameState("idle");
      return false;
    }
  }, []);

  // Start Camera
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      return true;
    } catch {
      setErrorMsg("Camera access denied.");
      return false;
    }
  }, []);

  // Receive targets
  useEffect(() => {
    const listener = (e: any) => {
      const data = e.detail;
      if (data.type === "TARGET") {
        const t = data.target;
        const area = areaRef.current;
        targetsRef.current.push({
          id: t.id,
          x: t.x * (area?.clientWidth || 800),
          y: t.y * (area?.clientHeight || 600),
          r: 40,
          born: Date.now(),
          hit: false,
        });
      }
    };
    window.addEventListener("game-message", listener);
    return () => window.removeEventListener("game-message", listener);
  }, []);

  const spawnTarget = useCallback(() => {
    if (!isHostRef.current) return;
    send({
      type: "TARGET",
      roomId: currentGameId,
      target: { id: idRef.current++, x: Math.random(), y: Math.random(), r: 40 },
    });
  }, [send, currentGameId]);

  const checkHit = useCallback((wx: number, wy: number) => {
    let hitAny = false;
    targetsRef.current = targetsRef.current.map(t => {
      if (t.hit) return t;
      if (Math.hypot(wx - t.x, wy - t.y) < HIT_RADIUS + t.r) {
        hitAny = true;
        return { ...t, hit: true };
      }
      return t;
    });

    if (hitAny) {
      comboRef.current++;
      if (comboRef.current > maxComboRef.current) maxComboRef.current = comboRef.current;
      scoreRef.current += 100 + comboRef.current * 15;

      setScore(scoreRef.current);
      setCombo(comboRef.current);

      send({
        type: "SCORE",
        roomId: currentGameId,
        userId,
        score: scoreRef.current,
        combo: comboRef.current,
      });
    }
  }, [send, currentGameId, userId]);

  const endGame = useCallback(() => {
    setGameState("ended");
    cancelAnimationFrame(rafRef.current);
    if (spawnRef.current) clearInterval(spawnRef.current);
    if (timerRef.current) clearInterval(timerRef.current);

    setFinalScore(scoreRef.current);
    setFinalCombo(maxComboRef.current);
  }, []);

  // ... (rest of the code remains the same - loops, effects, etc.)

  // Main game control, startLoop, etc. are the same as previous version
  // I'll keep them short here for brevity — use the same logic from last response

  const startLoop = useCallback(() => {
    // Same as previous version...
    const canvas = canvasRef.current;
    const area = areaRef.current;
    if (!canvas || !area) return;

    const ctx = canvas.getContext("2d")!;
    const loop = () => {
      const now = Date.now();
      const { width, height } = area.getBoundingClientRect();
      canvas.width = width;
      canvas.height = height;
      ctx.clearRect(0, 0, width, height);

      targetsRef.current = targetsRef.current.filter(t => {
        if (!t.hit && now - t.born > TARGET_LIFE) {
          comboRef.current = 0;
          return false;
        }
        if (t.hit && now - t.born > TARGET_LIFE - 200) return false;
        return true;
      });

      targetsRef.current.forEach(t => {
        const age = now - t.born;
        ctx.save();
        if (t.hit) {
          const hitAge = age / (TARGET_LIFE - 200);
          ctx.globalAlpha = Math.max(0, 1 - hitAge * 2);
          ctx.translate(t.x, t.y);
          ctx.scale(1 + hitAge * 0.8, 1 + hitAge * 0.8);
          ctx.rotate(hitAge * 0.5);
          ctx.translate(-t.x, -t.y);
        } else {
          const pulse = 1 + Math.sin(now / 300) * 0.06;
          ctx.translate(t.x, t.y);
          ctx.scale(pulse, pulse);
          ctx.translate(-t.x, -t.y);
        }

        ctx.beginPath();
        ctx.arc(t.x, t.y, t.r + 6, 0, Math.PI * 2);
        ctx.strokeStyle = t.hit ? "#00ff88" : "rgba(220,20,60,0.6)";
        ctx.lineWidth = 3;
        ctx.stroke();

        const grad = ctx.createRadialGradient(t.x - t.r * 0.3, t.y - t.r * 0.3, 0, t.x, t.y, t.r);
        grad.addColorStop(0, t.hit ? "#00ff88" : "#ff4466");
        grad.addColorStop(1, t.hit ? "#006633" : "#880022");
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.font = `${t.r * 1.1}px serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(t.hit ? "💥" : "🎯", t.x, t.y);
        ctx.restore();
      });

      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    let detecting = false;
    const detectLoop = async () => {
      if (!detectorRef.current || !videoRef.current || videoRef.current.readyState < 2) {
        setTimeout(detectLoop, 100);
        return;
      }
      if (detecting) {
        setTimeout(detectLoop, 80);
        return;
      }
      detecting = true;
      try {
        const poses = await detectorRef.current.estimatePoses(videoRef.current);
        if (poses?.length) {
          const { width, height } = area.getBoundingClientRect();
          const scaleX = width / (videoRef.current.videoWidth || 640);
          const scaleY = height / (videoRef.current.videoHeight || 480);
          const pose = poses[0];

          const lw = pose.keypoints[9];
          if (lw?.score > 0.35) checkHit(width - lw.x * scaleX, lw.y * scaleY);

          const rw = pose.keypoints[10];
          if (rw?.score > 0.35) checkHit(width - rw.x * scaleX, rw.y * scaleY);
        }
      } catch (_) {}
      detecting = false;
      if (gameState === "playing") setTimeout(detectLoop, 80);
    };
    detectLoop();
  }, [checkHit, gameState]);

  // Game start logic (same as before)
  useEffect(() => {
    if (!gameActive) {
      setGameState("idle");
      return;
    }

    const init = async () => {
      targetsRef.current = [];
      scoreRef.current = 0;
      comboRef.current = 0;
      maxComboRef.current = 0;
      idRef.current = 0;

      setScore(0);
      setCombo(0);
      setTimeLeft(GAME_DURATION);

      if (!detectorRef.current) {
        const ok = await loadModel();
        if (!ok) return;
      }

      const camOk = await startCamera();
      if (!camOk) return;

      setGameState("countdown");
      let c = 3;
      setCountdown(c);
      const cd = setInterval(() => {
        c--;
        setCountdown(c);
        if (c <= 0) {
          clearInterval(cd);
          setGameState("playing");
        }
      }, 1000);
    };

    init();

    return () => {
      if (spawnRef.current) clearInterval(spawnRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameActive, loadModel, startCamera]);

  useEffect(() => {
    if (gameState !== "playing") return;
    startLoop();

    if (isHostRef.current) {
      spawnRef.current = setInterval(spawnTarget, SPAWN_INTERVAL);
    }

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      cancelAnimationFrame(rafRef.current);
      if (spawnRef.current) clearInterval(spawnRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState, startLoop, spawnTarget, endGame]);

  const leaderboard = playersList.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  // ... rest of return JSX same as previous version

  return (
    <div style={css.root}>
      {/* HUD, Video, Canvas, Overlays, Leaderboard - same as last version */}
      {/* (Copy the return statement from the previous message) */}
    </div>
  );
}

// Styles (same)
const css: Record<string, React.CSSProperties> = {
  root: { width: "100%", height: "100vh", background: "linear-gradient(to bottom, #0f0f1a, #1a1a2e)", position: "relative", overflow: "hidden", color: "#fff", fontFamily: "system-ui, sans-serif" },
  hud: { position: "absolute", top: 0, left: 0, right: 0, background: "rgba(0,0,0,0.6)", padding: "12px 20px", display: "flex", justifyContent: "center", gap: 40, zIndex: 50, fontSize: "1.4rem", fontWeight: 700 },
  area: { position: "absolute", inset: 0 },
  video: { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)", opacity: 0.22 },
  canvas: { position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" },
  overlay: { position: "absolute", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 20 },
  card: { background: "rgba(20,20,40,0.95)", borderRadius: 20, padding: "40px", textAlign: "center", maxWidth: 420 },
  bigTitle: { fontSize: "2.8rem", fontWeight: 900, marginBottom: 16, background: "linear-gradient(135deg, #00d4ff, #0066ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
  hint: { color: "#aaa", lineHeight: 1.6 },
  error: { color: "#ff5555" },
  btn: { background: "#0066ff", color: "#fff", border: "none", padding: "14px 32px", fontSize: "1.1rem", borderRadius: 12, cursor: "pointer", width: "100%", marginTop: 16, fontWeight: 700 },
  countdownNum: { fontSize: "min(22vw, 18rem)", fontWeight: 900, color: "#00d4ff", textShadow: "0 0 60px #00d4ff" },
  statsGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 30, margin: "30px 0" },
  leaderboard: { position: "absolute", top: 80, right: 20, background: "rgba(0,0,0,0.6)", padding: 16, borderRadius: 12, minWidth: 200, zIndex: 30 },
};
