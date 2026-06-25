"use client";

import {
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";

// ─────────────────────────────────────────────
// Multiplayer Props
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────
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
  const rafDetectRef = useRef<number>(0);
  const rafRenderRef = useRef<number>(0);
  const spawnRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const targetsRef = useRef<Target[]>([]);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const idRef = useRef(0);
  const isHost = useRef(false);

  const [state, setState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [time, setTime] = useState(GAME_DURATION);

  // ─────────────────────────────────────────────
  // Host selection
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!players.length) return;
    const host = [...players].sort((a, b) => a.id.localeCompare(b.id))[0];
    isHost.current = host.id === userId;
  }, [players, userId]);

  // ─────────────────────────────────────────────
  // Load AI model
  // ─────────────────────────────────────────────
  const loadModel = useCallback(async () => {
    setState("loading");
    const tf = await import("@tensorflow/tfjs");
    await import("@tensorflow/tfjs-backend-webgl");
    await tf.setBackend("webgl");
    await tf.ready();

    const pd = await import("@tensorflow-models/pose-detection");
    detectorRef.current = await pd.createDetector(
      pd.SupportedModels.MoveNet,
      {
        modelType: pd.movenet.modelType.SINGLEPOSE_LIGHTNING,
      }
    );
  }, []);

  // ─────────────────────────────────────────────
  // Camera
  // ─────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: 640,
          height: 480,
        },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.error("Camera access failed:", err);
    }
  }, []);

  // ─────────────────────────────────────────────
  // Receive room events
  // ─────────────────────────────────────────────
  useEffect(() => {
    const listener = (e: any) => {
      const data = e.detail;
      if (data.type === "TARGET") {
        targetsRef.current.push({
          id: data.target.id,
          x: data.target.x,
          y: data.target.y,
          r: data.target.r,
          born: Date.now(),
          hit: false,
        });
      }
      // TODO: Add SCORE listener if you want real-time leaderboard updates on this client
    };

    window.addEventListener("game-message", listener);
    return () => window.removeEventListener("game-message", listener);
  }, []);

  // ─────────────────────────────────────────────
  // Spawn synced target (host only)
  // ─────────────────────────────────────────────
  const spawnTarget = () => {
    if (!isHost.current) return;
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
  };

  // ─────────────────────────────────────────────
  // Hit detection
  // ─────────────────────────────────────────────
  const hitTarget = (x: number, y: number) => {
    let hit = false;

    targetsRef.current = targetsRef.current.map((t) => {
      const area = areaRef.current;
      if (!area) return t;

      const tx = t.x * area.clientWidth;
      const ty = t.y * area.clientHeight;

      if (Math.hypot(x - tx, y - ty) < HIT_RADIUS + t.r && !t.hit) {
        hit = true;
        return { ...t, hit: true };
      }
      return t;
    });

    if (hit) {
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
  };

  // ─────────────────────────────────────────────
  // Pose detection loop
  // ─────────────────────────────────────────────
  const detect = useCallback(async () => {
    if (!detectorRef.current || !videoRef.current) {
      rafDetectRef.current = requestAnimationFrame(detect);
      return;
    }

    try {
      const poses = await detectorRef.current.estimatePoses(videoRef.current);
      const pose = poses?.[0];
      if (!pose) {
        rafDetectRef.current = requestAnimationFrame(detect);
        return;
      }

      const area = areaRef.current;
      if (!area) {
        rafDetectRef.current = requestAnimationFrame(detect);
        return;
      }

      const w = area.clientWidth;
      const h = area.clientHeight;
      const videoW = videoRef.current.videoWidth || 640;
      const videoH = videoRef.current.videoHeight || 480;

      // Keypoints 9 = left wrist, 10 = right wrist (MoveNet)
      [9, 10].forEach((i) => {
        const hand = pose.keypoints[i];
        if (hand?.score && hand.score > 0.35) {
          // Mirror correction + normalization
          const screenX = w - hand.x * (w / videoW);
          const screenY = hand.y * (h / videoH);
          hitTarget(screenX, screenY);
        }
      });
    } catch (err) {
      console.error("Pose detection error:", err);
    }

    rafDetectRef.current = requestAnimationFrame(detect);
  }, []);

  // ─────────────────────────────────────────────
  // Start / Stop game
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!gameActive) return;

    const startGame = async () => {
      targetsRef.current = [];
      scoreRef.current = 0;
      comboRef.current = 0;

      setScore(0);
      setCombo(0);
      setTime(GAME_DURATION);
      setState("playing");

      if (!detectorRef.current) {
        await loadModel();
      }

      await startCamera();
      detect();

      // Host spawns targets
      if (isHost.current) {
        spawnRef.current = setInterval(spawnTarget, SPAWN_INTERVAL);
      }

      // Timer
      timerRef.current = setInterval(() => {
        setTime((t) => {
          if (t <= 1) {
            endGame();
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    };

    startGame();

    return () => {
      if (spawnRef.current) clearInterval(spawnRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameActive, loadModel, startCamera, detect]);

  // ─────────────────────────────────────────────
  // End game
  // ─────────────────────────────────────────────
  const endGame = () => {
    setState("ended");
    if (rafDetectRef.current) cancelAnimationFrame(rafDetectRef.current);
    if (rafRenderRef.current) cancelAnimationFrame(rafRenderRef.current);
    if (spawnRef.current) clearInterval(spawnRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  // ─────────────────────────────────────────────
  // Draw loop (targets)
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (state !== "playing") return;

    const canvas = canvasRef.current;
    const area = areaRef.current;
    if (!canvas || !area) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const render = () => {
      const width = area.clientWidth;
      const height = area.clientHeight;

      canvas.width = width;
      canvas.height = height;

      ctx.clearRect(0, 0, width, height);

      const now = Date.now();

      // Remove expired targets
      targetsRef.current = targetsRef.current.filter((t) => {
        return now - t.born <= TARGET_LIFE;
      });

      targetsRef.current.forEach((t) => {
        const x = t.x * width;
        const y = t.y * height;

        ctx.beginPath();
        ctx.arc(x, y, t.r, 0, Math.PI * 2);
        ctx.fillStyle = t.hit ? "#00ff88" : "#ff3355";
        ctx.fill();

        ctx.font = `${t.r * 1.1}px serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#fff";
        ctx.fillText(t.hit ? "💥" : "🎯", x, y);
      });

      rafRenderRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (rafRenderRef.current) cancelAnimationFrame(rafRenderRef.current);
    };
  }, [state]);

  // ─────────────────────────────────────────────
  // Cleanup on unmount
  // ─────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (rafDetectRef.current) cancelAnimationFrame(rafDetectRef.current);
      if (rafRenderRef.current) cancelAnimationFrame(rafRenderRef.current);
      if (spawnRef.current) clearInterval(spawnRef.current);
      if (timerRef.current) clearInterval(timerRef.current);

      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream)
          .getTracks()
          .forEach((t) => t.stop());
      }
    };
  }, []);

  // ─────────────────────────────────────────────
  // Leaderboard (sorted)
  // ─────────────────────────────────────────────
  const leaderboard = [...players].sort(
    (a, b) => (b.score ?? 0) - (a.score ?? 0)
  );

  const formatTime = (s: number) => `00:${String(s).padStart(2, "0")}`;

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        background: "#090914",
        overflow: "hidden",
        position: "relative",
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
            gap: 40,
            padding: "16px 20px",
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(8px)",
            fontSize: "1.4rem",
            fontWeight: 600,
          }}
        >
          <div>⏱ {formatTime(time)}</div>
          <div>⚡ {combo}</div>
          <div>🏆 {score}</div>
        </div>
      )}

      {/* Leaderboard */}
      {state === "playing" && (
        <div
          style={{
            position: "absolute",
            top: 80,
            right: 20,
            zIndex: 30,
            background: "rgba(0,0,0,0.55)",
            padding: 16,
            borderRadius: 12,
            minWidth: 200,
            backdropFilter: "blur(8px)",
          }}
        >
          <h3 style={{ margin: "0 0 12px 0", fontSize: "1.1rem" }}>Players</h3>
          {leaderboard.map((p) => (
            <div
              key={p.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 6,
                fontSize: "1rem",
              }}
            >
              <span>{p.name ?? p.id.slice(0, 8)}</span>
              <span style={{ fontWeight: 600 }}>{p.score ?? 0}</span>
            </div>
          ))}
        </div>
      )}

      {/* Game Area */}
      <div
        ref={areaRef}
        style={{
          position: "absolute",
          inset: 0,
        }}
      >
        {/* Camera Feed */}
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: "scaleX(-1)",
            opacity: 0.25,
          }}
        />

        {/* Targets Canvas */}
        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          }}
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
              background: "rgba(0,0,0,0.75)",
            }}
          >
            <div
              style={{
                background: "#151528",
                padding: "40px 50px",
                borderRadius: 20,
                textAlign: "center",
                maxWidth: 420,
              }}
            >
              <h1 style={{ fontSize: "2.8rem", margin: "0 0 16px 0" }}>
                🥊 Punch Targets
              </h1>
              <p style={{ margin: "8px 0", fontSize: "1.1rem" }}>
                Wait for the room host to start
              </p>
              <p style={{ color: "#aaa" }}>Multiplayer battle mode</p>
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
              background: "rgba(0,0,0,0.8)",
            }}
          >
            <div
              style={{
                background: "#151528",
                padding: 50,
                borderRadius: 20,
                textAlign: "center",
              }}
            >
              <h1 style={{ marginBottom: 10 }}>Game Over</h1>
              <h2 style={{ margin: "10px 0" }}>Your Score</h2>
              <div
                style={{
                  fontSize: "5rem",
                  fontWeight: 900,
                  color: "#00d4ff",
                  margin: "20px 0",
                }}
              >
                {score}
              </div>
              <button
                onClick={() => setState("idle")}
                style={{
                  marginTop: 20,
                  padding: "14px 36px",
                  borderRadius: 12,
                  border: "none",
                  background: "#0066ff",
                  color: "#fff",
                  fontSize: "1.1rem",
                  cursor: "pointer",
                }}
              >
                Exit to Lobby
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
