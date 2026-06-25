"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";

export interface Player {
  id: string;
  name?: string;
  score?: number;
  combo?: number;
}

export interface GameProps {
  roomId?: string;
  currentGameId?: string;
  players: any;
  userId: string;
  send: (data: any) => void;
  gameActive?: boolean;
  status?: string;
  onReady?: () => void;
  onLeave?: () => void;
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
  roomId,
  currentGameId,
  players: playersProp,
  userId,
  send,
  gameActive: propGameActive,
  status,
  onReady,
  onLeave,
}: GameProps) {
  const effectiveRoomId = roomId || currentGameId || "Unknown";
  const gameActive = propGameActive !== undefined ? propGameActive : status === "playing";

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
  const [isReady, setIsReady] = useState(false);

  const playersList = Array.isArray(playersProp)
    ? playersProp
    : Array.from({ length: Number(playersProp) || 1 }, (_, i) => ({
        id: `p${i}`,
        name: `Player ${i + 1}`,
      }));

  // Host detection
  useEffect(() => {
    if (!playersList.length) return;
    const sorted = [...playersList].sort((a, b) => a.id.localeCompare(b.id));
    isHostRef.current = sorted[0].id === userId;
  }, [playersList, userId]);

  const loadModel = useCallback(async () => {
    setGameState("loading");
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
      console.log("✅ TensorFlow Model Loaded");
      return true;
    } catch (e: any) {
      console.error("Model load failed", e);
      setErrorMsg("Failed to load AI model");
      setGameState("idle");
      return false;
    }
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      console.log("✅ Camera started");
      return true;
    } catch (err) {
      console.error("Camera error", err);
      setErrorMsg("Camera access denied");
      return false;
    }
  }, []);

  // Receive targets from host
  useEffect(() => {
    const listener = (e: any) => {
      const data = e.detail;
      if (data.type === "TARGET") {
        console.log("📍 Received target", data.target);
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
    console.log("🌟 Host spawning target");
    send({
      type: "TARGET",
      roomId: effectiveRoomId,
      target: { id: idRef.current++, x: Math.random(), y: Math.random(), r: 40 },
    });
  }, [send, effectiveRoomId]);

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
        roomId: effectiveRoomId,
        userId,
        score: scoreRef.current,
        combo: comboRef.current,
      });
    }
  }, [send, effectiveRoomId, userId]);

  const startLoop = useCallback(() => {
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

      // Expire targets
      targetsRef.current = targetsRef.current.filter(t => {
        if (!t.hit && now - t.born > TARGET_LIFE) return false;
        if (t.hit && now - t.born > TARGET_LIFE - 200) return false;
        return true;
      });

      // Draw targets
      targetsRef.current.forEach(t => {
        const age = now - t.born;
        ctx.save();
        if (t.hit) {
          const hitAge = age / (TARGET_LIFE - 200);
          ctx.globalAlpha = Math.max(0, 1 - hitAge * 2);
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

    // Pose Detection
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
          const area = areaRef.current;
          if (!area) return;
          const { width, height } = area.getBoundingClientRect();
          const scaleX = width / (videoRef.current.videoWidth || 640);
          const scaleY = height / (videoRef.current.videoHeight || 480);
          const pose = poses[0];

          // Draw skeleton for debugging (optional)
          const canvas = canvasRef.current;
          if (canvas) {
            const ctx = canvas.getContext("2d")!;
            ctx.strokeStyle = "#00ffcc";
            ctx.lineWidth = 6;
            // Simple wrist detection for now
          }

          const lw = pose.keypoints[9];
          if (lw?.score > 0.35) checkHit(width - lw.x * scaleX, lw.y * scaleY);

          const rw = pose.keypoints[10];
          if (rw?.score > 0.35) checkHit(width - rw.x * scaleX, rw.y * scaleY);
        }
      } catch (e) {
        console.error("Pose detection error", e);
      }
      detecting = false;
      if (gameState === "playing") setTimeout(detectLoop, 80);
    };
    detectLoop();
  }, [checkHit, gameState]);

  // Game start
  useEffect(() => {
    if (!gameActive) {
      setGameState("idle");
      return;
    }

    const init = async () => {
      console.log("🚀 Game starting...");
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
          console.log("🎉 Game Started!");
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

  const leaderboard = [...playersList].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  return (
    <div style={css.root}>
      {/* ... same UI as before ... */}
      {/* (Keep the return JSX from previous version) */}
    </div>
  );
}

// Add the css object at the bottom (same as before)
const css: Record<string, React.CSSProperties> = {
  // ... paste the css from previous message
};
