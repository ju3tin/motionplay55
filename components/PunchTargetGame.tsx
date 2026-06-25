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
  const detectionRafRef = useRef<number | null>(null);
  const spawnRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const rafRef = useRef<number | null>(null);

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
  const [loaded, setLoaded] = useState(false);

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

  // Optimized Model Loading
  const loadModel = useCallback(async () => {
    if (detectorRef.current) return true;

    try {
      setGameState("loading");
      const tf = await import("@tensorflow/tfjs");
      await import("@tensorflow/tfjs-backend-webgl");
      await tf.setBackend("webgl");
      await tf.ready();

      const pd = await import("@tensorflow-models/pose-detection");

      detectorRef.current = await pd.createDetector(
        pd.SupportedModels.MoveNet,
        {
          modelType: pd.movenet.modelType.SINGLEPOSE_LIGHTNING,
          enableSmoothing: true,
        }
      );

      console.log("✅ MoveNet Lightning + Smoothing Loaded");
      setLoaded(true);
      return true;
    } catch (err) {
      console.error("Failed to load pose detector:", err);
      setErrorMsg("Failed to load AI model");
      setGameState("idle");
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
      console.log("✅ Camera started");
      return true;
    } catch (err) {
      console.error(err);
      setErrorMsg("Camera access denied");
      return false;
    }
  }, []);

  // Receive targets
  useEffect(() => {
    const listener = (e: any) => {
      const data = e.detail;
      if (data.type === "TARGET") {
        const t = data.target;
        targetsRef.current.push({
          id: t.id,
          x: t.x,
          y: t.y,
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
      roomId: effectiveRoomId,
      target: { id: idRef.current++, x: Math.random(), y: Math.random(), r: 40 },
    });
  }, [send, effectiveRoomId]);

  const checkHit = useCallback((wx: number, wy: number) => {
    let hitAny = false;

    targetsRef.current = targetsRef.current.map(t => {
      if (t.hit) return t;
      const area = areaRef.current;
      if (!area) return t;

      const tx = t.x * area.clientWidth;
      const ty = t.y * area.clientHeight;

      if (Math.hypot(wx - tx, wy - ty) < HIT_RADIUS + t.r) {
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

  const endGame = useCallback(() => {
    setGameState("ended");
    if (detectionRafRef.current) cancelAnimationFrame(detectionRafRef.current);
    if (spawnRef.current) clearInterval(spawnRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    setFinalScore(scoreRef.current);
    setFinalCombo(maxComboRef.current);
  }, []);

  // === OPTIMIZED DETECTION LOOP (RAF + Throttling) ===
  const startDetection = useCallback(() => {
    if (detectionRafRef.current) cancelAnimationFrame(detectionRafRef.current);

    let lastDetection = 0;
    const targetInterval = 45; // ~22 FPS detection — excellent balance

    const detectLoop = async (timestamp: number) => {
      if (gameState !== "playing" || !detectorRef.current || !videoRef.current) {
        detectionRafRef.current = requestAnimationFrame(detectLoop);
        return;
      }

      if (timestamp - lastDetection < targetInterval) {
        detectionRafRef.current = requestAnimationFrame(detectLoop);
        return;
      }

      lastDetection = timestamp;

      try {
        const poses = await detectorRef.current.estimatePoses(videoRef.current, {
          maxPoses: 1,
          flipHorizontal: true,
        });

        if (poses?.length) {
          const pose = poses[0];
          const area = areaRef.current;
          if (!area) return;

          const width = area.clientWidth;
          const height = area.clientHeight;
          const videoW = videoRef.current.videoWidth || 640;
          const videoH = videoRef.current.videoHeight || 480;

          const scaleX = width / videoW;
          const scaleY = height / videoH;

          [9, 10].forEach(i => {
            const kp = pose.keypoints[i];
            if (kp?.score > 0.35) {
              const screenX = width - kp.x * scaleX;
              const screenY = kp.y * scaleY;
              checkHit(screenX, screenY);
            }
          });
        }
      } catch (e) {
        console.error("Detection error:", e);
      }

      detectionRafRef.current = requestAnimationFrame(detectLoop);
    };

    detectionRafRef.current = requestAnimationFrame(detectLoop);
  }, [checkHit, gameState]);

  // Main initialization
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
        await loadModel();
      }

      await startCamera();
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
      if (detectionRafRef.current) cancelAnimationFrame(detectionRafRef.current);
      if (spawnRef.current) clearInterval(spawnRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [gameActive, loadModel, startCamera]);

  // Game systems when playing
  useEffect(() => {
    if (gameState !== "playing") return;

    startDetection();

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
      if (detectionRafRef.current) cancelAnimationFrame(detectionRafRef.current);
      if (spawnRef.current) clearInterval(spawnRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState, startDetection, spawnTarget, endGame]);

  // Render loop
  useEffect(() => {
    if (gameState !== "playing") return;

    const canvas = canvasRef.current;
    const area = areaRef.current;
    if (!canvas || !area) return;

    const ctx = canvas.getContext("2d")!;

    const render = () => {
      const width = area.clientWidth;
      const height = area.clientHeight;
      canvas.width = width;
      canvas.height = height;
      ctx.clearRect(0, 0, width, height);

      const now = Date.now();
      targetsRef.current = targetsRef.current.filter(t => now - t.born <= TARGET_LIFE);

      targetsRef.current.forEach(t => {
        const x = t.x * width;
        const y = t.y * height;

        ctx.save();
        if (!t.hit) {
          const pulse = 1 + Math.sin(now / 300) * 0.06;
          ctx.translate(x, y);
          ctx.scale(pulse, pulse);
          ctx.translate(-x, -y);
        }

        ctx.beginPath();
        ctx.arc(x, y, t.r + 6, 0, Math.PI * 2);
        ctx.strokeStyle = t.hit ? "#00ff88" : "rgba(220,20,60,0.6)";
        ctx.lineWidth = 3;
        ctx.stroke();

        const grad = ctx.createRadialGradient(x - t.r * 0.3, y - t.r * 0.3, 0, x, y, t.r);
        grad.addColorStop(0, t.hit ? "#00ff88" : "#ff4466");
        grad.addColorStop(1, t.hit ? "#006633" : "#880022");

        ctx.beginPath();
        ctx.arc(x, y, t.r, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.font = `${t.r * 1.1}px serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(t.hit ? "💥" : "🎯", x, y);

        ctx.restore();
      });

      rafRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [gameState]);

  const leaderboard = [...playersList].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  return (
    <div style={css.root}>
      {(gameState === "playing" || gameState === "ended") && (
        <div style={css.hud}>
          <div>⏱ {`${Math.floor(timeLeft / 60).toString().padStart(2, "0")}:${(timeLeft % 60).toString().padStart(2, "0")}`}</div>
          <div>⚡ {combo}</div>
          <div>🏆 {score}</div>
        </div>
      )}

      <div ref={areaRef} style={css.area}>
        <video ref={videoRef} style={css.video} muted playsInline autoPlay />
        <canvas ref={canvasRef} style={css.canvas} />

        {(gameState === "idle" || gameState === "loading") && (
          <div style={css.overlay}>
            <div style={css.card}>
              <h1 style={css.bigTitle}>🥊 Punch Targets</h1>
              <div style={{ margin: "20px 0", textAlign: "left" }}>
                <div><strong>Room:</strong> {effectiveRoomId}</div>
                <div><strong>Status:</strong> {status}</div>
                <div><strong>Players:</strong> {playersList.length}</div>
              </div>
              {onLeave && (
                <button onClick={onLeave} style={{ ...css.btn, background: "#ff4444", marginBottom: 12 }}>
                  Leave Game
                </button>
              )}
              {onReady && !isReady && (
                <button onClick={() => { setIsReady(true); onReady(); }} style={{ ...css.btn, background: "#00cc66" }}>
                  ✅ I'm Ready
                </button>
              )}
            </div>
          </div>
        )}

        {gameState === "countdown" && (
          <div style={css.overlay}>
            <span style={css.countdownNum}>{countdown || "GO!"}</span>
          </div>
        )}

        {gameState === "ended" && (
          <div style={css.overlay}>
            <div style={css.card}>
              <h1 style={css.bigTitle}>Game Over!</h1>
              <div style={css.statsGrid}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ color: "#aaa" }}>Score</div>
                  <div style={{ fontSize: "3.8rem", fontWeight: 900, color: "#00d4ff" }}>{finalScore}</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ color: "#aaa" }}>Max Combo</div>
                  <div style={{ fontSize: "3.8rem", fontWeight: 900, color: "#ffaa00" }}>{finalCombo}</div>
                </div>
              </div>
              <button onClick={() => setGameState("idle")} style={css.btn}>Play Again</button>
            </div>
          </div>
        )}
      </div>

      {gameState === "playing" && (
        <div style={css.leaderboard}>
          <h3>Players</h3>
          {leaderboard.map(p => (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", margin: "6px 0" }}>
              <span>{p.name ?? p.id.slice(0, 8)}</span>
              <span>{p.score ?? 0}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const css: Record<string, React.CSSProperties> = {
  root: { width: "100%", height: "100vh", background: "linear-gradient(to bottom, #0f0f1a, #1a1a2e)", position: "relative", overflow: "hidden", color: "#fff", fontFamily: "system-ui, sans-serif" },
  hud: { position: "absolute", top: 0, left: 0, right: 0, background: "rgba(0,0,0,0.6)", padding: "12px 20px", display: "flex", justifyContent: "center", gap: 40, zIndex: 50, fontSize: "1.4rem", fontWeight: 700 },
  area: { position: "absolute", inset: 0 },
  video: { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)", opacity: 0.22 },
  canvas: { position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" },
  overlay: { position: "absolute", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 20 },
  card: { background: "rgba(20,20,40,0.95)", borderRadius: 20, padding: "40px", textAlign: "center", maxWidth: 460 },
  bigTitle: { fontSize: "2.8rem", fontWeight: 900, marginBottom: 16, background: "linear-gradient(135deg, #00d4ff, #0066ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
  btn: { background: "#0066ff", color: "#fff", border: "none", padding: "14px 32px", fontSize: "1.1rem", borderRadius: 12, cursor: "pointer", width: "100%", marginTop: 12, fontWeight: 700 },
  countdownNum: { fontSize: "min(22vw, 18rem)", fontWeight: 900, color: "#00d4ff", textShadow: "0 0 60px #00d4ff" },
  statsGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 30, margin: "30px 0" },
  leaderboard: { position: "absolute", top: 80, right: 20, background: "rgba(0,0,0,0.6)", padding: 16, borderRadius: 12, minWidth: 200, zIndex: 30 },
};
