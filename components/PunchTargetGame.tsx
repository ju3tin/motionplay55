"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";

export interface Player {
  id: string;
  name?: string;
  score?: number;
  combo?: number;
}

export interface GameProps {
  currentGameId?: string;
  roomId?: string;
  players: any;
  userId: string;
  send: (data: any) => void;
  status: string;
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
  currentGameId,
  roomId,
  players: playersProp,
  userId,
  send,
  status,
  onReady,
  onLeave,
}: GameProps) {
  const effectiveRoomId = roomId || currentGameId || "Unknown";
  const gameActive = status === "playing";

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

  const endGame = useCallback(() => {
    setGameState("ended");
    cancelAnimationFrame(rafRef.current);
    if (spawnRef.current) clearInterval(spawnRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    setFinalScore(scoreRef.current);
    setFinalCombo(maxComboRef.current);
  }, []);

  const startLoop = useCallback(() => { /* same as previous */ }, [checkHit, gameState]);

  // Game Control
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

  // Start loops when playing (same as before)
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

        {/* Waiting Screen */}
        {(gameState === "idle" || gameState === "loading") && (
          <div style={css.overlay}>
            <div style={css.card}>
              <h1 style={css.bigTitle}>🥊 Punch Targets</h1>
              
              <div style={{ margin: "20px 0", textAlign: "left", fontSize: "1.1rem", lineHeight: 1.7 }}>
                <div><strong>Room:</strong> {effectiveRoomId}</div>
                <div><strong>Status:</strong> {status}</div>
                <div><strong>Players:</strong> {playersList.length}</div>
              </div>

              {onLeave && (
                <button 
                  onClick={onLeave}
                  style={{ ...css.btn, background: "#ff4444", marginBottom: 12 }}
                >
                  Leave Game
                </button>
              )}

              {!isReady && onReady && (
                <button 
                  onClick={() => {
                    setIsReady(true);
                    onReady();
                  }}
                  style={{ ...css.btn, background: "#00cc66" }}
                >
                  ✅ I'm Ready
                </button>
              )}

              {isReady && (
                <div style={{ color: "#00cc66", fontWeight: 700, margin: "15px 0" }}>
                  Waiting for other players...
                </div>
              )}

              {gameState === "loading" && <p>Loading AI Model...</p>}
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
  hint: { color: "#aaa", lineHeight: 1.6 },
  error: { color: "#ff5555" },
  btn: { background: "#0066ff", color: "#fff", border: "none", padding: "14px 32px", fontSize: "1.1rem", borderRadius: 12, cursor: "pointer", width: "100%", marginTop: 12, fontWeight: 700 },
  countdownNum: { fontSize: "min(22vw, 18rem)", fontWeight: 900, color: "#00d4ff", textShadow: "0 0 60px #00d4ff" },
  statsGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 30, margin: "30px 0" },
  leaderboard: { position: "absolute", top: 80, right: 20, background: "rgba(0,0,0,0.6)", padding: 16, borderRadius: 12, minWidth: 200, zIndex: 30 },
};
