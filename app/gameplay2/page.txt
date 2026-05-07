"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// ── Props interface (matches play-challenge GameProps) ────────────────────────
export interface GameProps {
  onScore?: (score: number) => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const GAME_DURATION  = 60;
const SPAWN_INTERVAL = 800;
const TARGET_LIFE    = 2200;
const HIT_RADIUS     = 55;

interface Target {
  id:     number;
  x:      number;
  y:      number;
  r:      number;
  born:   number;
  hit:    boolean;
}

type GameState = "idle" | "loading" | "countdown" | "playing" | "paused" | "ended";

// ── Component ─────────────────────────────────────────────────────────────────
export default function PunchTargets({ onScore }: GameProps) {
  const videoRef    = useRef<HTMLVideoElement>(null);
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const areaRef     = useRef<HTMLDivElement>(null);
  const detectorRef = useRef<any>(null);
  const rafRef      = useRef<number>(0);
  const spawnRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);

  const targetsRef  = useRef<Target[]>([]);
  const scoreRef    = useRef(0);
  const comboRef    = useRef(0);
  const maxComboRef = useRef(0);
  const timeRef     = useRef(GAME_DURATION);
  const idRef       = useRef(0);

  const [gameState, setGameState] = useState<GameState>("idle");
  const [score,     setScore]     = useState(0);
  const [combo,     setCombo]     = useState(0);
  const [timeLeft,  setTimeLeft]  = useState(GAME_DURATION);
  const [countdown, setCountdown] = useState(3);
  const [errorMsg,  setErrorMsg]  = useState("");
  const [finalScore,setFinalScore]= useState(0);
  const [finalCombo,setFinalCombo]= useState(0);

  // ── Load model ──────────────────────────────────────────────────────────────
  const loadModel = useCallback(async () => {
    setGameState("loading");
    setErrorMsg("");
    try {
      const tf = await import("@tensorflow/tfjs");
      await import("@tensorflow/tfjs-backend-webgl");
      await tf.setBackend("webgl");
      await tf.ready();

      const pd       = await import("@tensorflow-models/pose-detection");
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

  // ── Camera ──────────────────────────────────────────────────────────────────
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

  // ── Spawn target ─────────────────────────────────────────────────────────────
  const spawnTarget = useCallback(() => {
    const area = areaRef.current;
    if (!area) return;
    const { width, height } = area.getBoundingClientRect();
    const pad = 90;
    const r   = 32 + Math.random() * 18;
    const x   = pad + Math.random() * (width  - pad * 2);
    const y   = pad + Math.random() * (height - pad * 2);
    targetsRef.current.push({ id: idRef.current++, x, y, r, born: Date.now(), hit: false });
  }, []);

  // ── Check hit ────────────────────────────────────────────────────────────────
  const checkHit = useCallback((wx: number, wy: number) => {
    let hitAny = false;
    targetsRef.current = targetsRef.current.map(t => {
      if (t.hit) return t;
      const dist = Math.hypot(wx - t.x, wy - t.y);
      if (dist < HIT_RADIUS + t.r) { hitAny = true; return { ...t, hit: true }; }
      return t;
    });
    if (hitAny) {
      comboRef.current++;
      if (comboRef.current > maxComboRef.current) maxComboRef.current = comboRef.current;
      scoreRef.current += 100 + comboRef.current * 15;
      setScore(scoreRef.current);
      setCombo(comboRef.current);
    }
  }, []);

  // ── End game ─────────────────────────────────────────────────────────────────
  const endGame = useCallback(() => {
    setGameState("ended");
    cancelAnimationFrame(rafRef.current);
    if (spawnRef.current)  clearInterval(spawnRef.current);
    if (timerRef.current)  clearInterval(timerRef.current);
    setFinalScore(scoreRef.current);
    setFinalCombo(maxComboRef.current);
    // Report to play-challenge page
    onScore?.(scoreRef.current);
    if (typeof window !== "undefined") window.__motionplay_score?.(scoreRef.current);
  }, [onScore]);

  // ── Main detection + render loop ─────────────────────────────────────────────
  const startLoop = useCallback(() => {
    const canvas = canvasRef.current;
    const area   = areaRef.current;
    if (!canvas || !area) return;
    const ctx = canvas.getContext("2d")!;

    const loop = () => {
      if (gameState === "paused") return; // will be restarted on resume

      const now = Date.now();
      const { width, height } = area.getBoundingClientRect();
      canvas.width  = width;
      canvas.height = height;
      ctx.clearRect(0, 0, width, height);

      // Expire missed targets
      const before = comboRef.current;
      targetsRef.current = targetsRef.current.filter(t => {
        if (!t.hit && now - t.born > TARGET_LIFE) {
          comboRef.current = 0;
          return false;
        }
        if (t.hit && now - t.born > TARGET_LIFE - 200) return false; // remove after hit anim
        return true;
      });
      if (comboRef.current !== before) setCombo(0);

      // Draw targets
      for (const t of targetsRef.current) {
        const age     = now - t.born;
        const lifeRat = age / TARGET_LIFE;

        ctx.save();
        if (t.hit) {
          const hitAge = age / (TARGET_LIFE - 200);
          ctx.globalAlpha = Math.max(0, 1 - hitAge * 2);
          ctx.translate(t.x, t.y);
          ctx.scale(1 + hitAge * 0.8, 1 + hitAge * 0.8);
          ctx.rotate(hitAge * 0.5);
          ctx.translate(-t.x, -t.y);
        } else {
          // pulse
          const pulse = 1 + Math.sin(now / 300) * 0.06;
          ctx.translate(t.x, t.y);
          ctx.scale(pulse, pulse);
          ctx.translate(-t.x, -t.y);
          // fade near expiry
          if (lifeRat > 0.7) ctx.globalAlpha = 1 - ((lifeRat - 0.7) / 0.3) * 0.6;
        }

        // Outer ring
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.r + 6, 0, Math.PI * 2);
        ctx.strokeStyle = t.hit ? "#00ff88" : "rgba(220,20,60,0.6)";
        ctx.lineWidth   = 3;
        ctx.stroke();

        // Fill
        const grad = ctx.createRadialGradient(t.x - t.r * 0.3, t.y - t.r * 0.3, 0, t.x, t.y, t.r);
        grad.addColorStop(0, t.hit ? "#00ff88" : "#ff4466");
        grad.addColorStop(1, t.hit ? "#006633" : "#880022");
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Icon
        ctx.globalAlpha = (ctx.globalAlpha ?? 1) * 1;
        ctx.font        = `${t.r * 1.1}px serif`;
        ctx.textAlign   = "center";
        ctx.textBaseline= "middle";
        ctx.fillText(t.hit ? "💥" : "🎯", t.x, t.y);

        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    // Pose detection
    let detecting = false;
    const detectLoop = async () => {
      if (!detectorRef.current || !videoRef.current || videoRef.current.readyState < 2) {
        setTimeout(detectLoop, 100);
        return;
      }
      if (detecting) { setTimeout(detectLoop, 80); return; }
      detecting = true;
      try {
        const poses = await detectorRef.current.estimatePoses(videoRef.current);
        if (poses?.length && area) {
          const { width, height } = area.getBoundingClientRect();
          const scaleX = width  / (videoRef.current.videoWidth  || 640);
          const scaleY = height / (videoRef.current.videoHeight || 480);
          const pose   = poses[0];

          // Left wrist (idx 9) — mirrored → right side of screen
          const lw = pose.keypoints[9];
          if (lw?.score > 0.35) checkHit(width - lw.x * scaleX, lw.y * scaleY);

          // Right wrist (idx 10) — mirrored → left side
          const rw = pose.keypoints[10];
          if (rw?.score > 0.35) checkHit(width - rw.x * scaleX, rw.y * scaleY);
        }
      } catch (_) {}
      detecting = false;
      if (gameState !== "ended" && gameState !== "paused") setTimeout(detectLoop, 80);
    };
    detectLoop();
  }, [checkHit, gameState]);

  // ── Start game flow ───────────────────────────────────────────────────────────
  const startGame = useCallback(async () => {
    // Reset state
    targetsRef.current = [];
    scoreRef.current   = 0;
    comboRef.current   = 0;
    maxComboRef.current= 0;
    timeRef.current    = GAME_DURATION;
    idRef.current      = 0;
    setScore(0); setCombo(0); setTimeLeft(GAME_DURATION);

    if (!detectorRef.current) {
      const ok = await loadModel();
      if (!ok) return;
    }
    const camOk = await startCamera();
    if (!camOk) return;

    // Countdown
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
  }, [loadModel, startCamera]);

  // ── Start loop when state becomes playing ─────────────────────────────────────
  useEffect(() => {
    if (gameState !== "playing") return;

    startLoop();

    spawnRef.current = setInterval(spawnTarget, SPAWN_INTERVAL);

    timerRef.current = setInterval(() => {
      timeRef.current--;
      setTimeLeft(timeRef.current);
      if (timeRef.current <= 0) endGame();
    }, 1000);

    return () => {
      cancelAnimationFrame(rafRef.current);
      if (spawnRef.current) clearInterval(spawnRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState, startLoop, spawnTarget, endGame]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      if (spawnRef.current)  clearInterval(spawnRef.current);
      if (timerRef.current)  clearInterval(timerRef.current);
      videoRef.current?.srcObject &&
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    };
  }, []);

  const fmt = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div style={css.root}>
      {/* HUD */}
      {(gameState === "playing" || gameState === "paused") && (
        <div style={css.hud}>
          <HudStat icon="⏱" value={fmt(timeLeft)} />
          <HudStat icon="⚡" value={String(combo)} accent={combo >= 3} />
          <HudStat icon="🏆" value={String(score)} />
        </div>
      )}

      {/* Game area */}
      <div ref={areaRef} style={css.area}>
        {/* Mirrored video background */}
        <video
          ref={videoRef}
          style={css.video}
          muted
          playsInline
          autoPlay
        />

        {/* Canvas for targets */}
        <canvas ref={canvasRef} style={css.canvas} />

        {/* ── Overlays ── */}

        {/* Idle */}
        {(gameState === "idle" || gameState === "loading") && (
          <Overlay>
            <Card>
              <h1 style={css.bigTitle}>Punch Targets</h1>
              <p style={css.hint}>
                Use your hands to punch targets!<br />
                Build combos for bonus points.<br />
                60 seconds — go!
              </p>
              {errorMsg && <p style={css.error}>{errorMsg}</p>}
              <GlowBtn
                onClick={startGame}
                disabled={gameState === "loading"}
              >
                {gameState === "loading" ? "Loading…" : "Start Game"}
              </GlowBtn>
            </Card>
          </Overlay>
        )}

        {/* Countdown */}
        {gameState === "countdown" && (
          <Overlay>
            <span style={css.countdownNum}>{countdown || "GO!"}</span>
          </Overlay>
        )}

        {/* Paused */}
        {gameState === "paused" && (
          <Overlay>
            <Card>
              <h2 style={{ fontSize: "3rem", margin: "0 0 28px" }}>PAUSED</h2>
              <GlowBtn onClick={() => { setGameState("playing"); }}>Resume</GlowBtn>
              <GlowBtn
                onClick={() => { setGameState("idle"); targetsRef.current = []; }}
                style={{ background: "rgba(255,255,255,0.08)", marginTop: 8 }}
              >
                Quit
              </GlowBtn>
            </Card>
          </Overlay>
        )}

        {/* Game over */}
        {gameState === "ended" && (
          <Overlay>
            <Card>
              <h1 style={css.bigTitle}>Game Over!</h1>
              <div style={css.statsGrid}>
                <StatBox label="Score"     value={finalScore} color="#00d4ff" />
                <StatBox label="Max Combo" value={finalCombo} color="#ffaa00" />
              </div>
              <GlowBtn onClick={() => { setGameState("idle"); targetsRef.current = []; }}>
                Play Again
              </GlowBtn>
            </Card>
          </Overlay>
        )}

        {/* Pause button during play */}
        {gameState === "playing" && (
          <button
            style={css.pauseBtn}
            onClick={() => setGameState("paused")}
          >
            ⏸
          </button>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function Overlay({ children }: { children: React.ReactNode }) {
  return <div style={css.overlay}>{children}</div>;
}

function Card({ children }: { children: React.ReactNode }) {
  return <div style={css.card}>{children}</div>;
}

function GlowBtn({ onClick, disabled, children, style }: {
  onClick: () => void; disabled?: boolean; children: React.ReactNode; style?: React.CSSProperties;
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ ...css.btn, ...style, opacity: disabled ? 0.5 : 1 }}>
      {children}
    </button>
  );
}

function HudStat({ icon, value, accent }: { icon: string; value: string; accent?: boolean }) {
  return (
    <div style={css.hudStat}>
      <span>{icon}</span>
      <span style={{ color: accent ? "#ffaa00" : "#fff", fontWeight: accent ? 800 : 600 }}>{value}</span>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ color: "#aaa", fontSize: "0.85rem", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: "3.5rem", fontWeight: 900, color }}>{value}</div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const css: Record<string, React.CSSProperties> = {
  root: {
    width: "100%", height: "100%",
    display: "flex", flexDirection: "column",
    background: "linear-gradient(to bottom, #0f0f1a, #1a1a2e)",
    fontFamily: "system-ui, -apple-system, sans-serif",
    color: "#fff",
    position: "relative",
    overflow: "hidden",
    minHeight: 480,
  },
  hud: {
    position: "absolute", top: 0, left: 0, right: 0,
    background: "rgba(0,0,0,0.55)",
    backdropFilter: "blur(8px)",
    padding: "10px 20px",
    display: "flex", justifyContent: "center", gap: 32,
    zIndex: 50,
  },
  hudStat: {
    display: "flex", alignItems: "center", gap: 8, fontSize: "1.05rem",
  },
  area: {
    flex: 1, position: "relative", overflow: "hidden",
  },
  video: {
    position: "absolute", inset: 0,
    width: "100%", height: "100%",
    objectFit: "cover",
    transform: "scaleX(-1)",
    opacity: 0.22,
    pointerEvents: "none",
  },
  canvas: {
    position: "absolute", inset: 0,
    width: "100%", height: "100%",
    pointerEvents: "none",
  },
  overlay: {
    position: "absolute", inset: 0,
    background: "rgba(0,0,0,0.72)",
    backdropFilter: "blur(6px)",
    display: "flex", alignItems: "center", justifyContent: "center",
    flexDirection: "column",
    zIndex: 20,
  },
  card: {
    background: "rgba(20,20,40,0.92)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 20,
    padding: "32px 40px",
    maxWidth: 420, width: "90%",
    textAlign: "center",
    boxShadow: "0 12px 40px rgba(0,0,0,0.7)",
    display: "flex", flexDirection: "column", gap: 0,
  },
  bigTitle: {
    fontSize: "2.6rem", fontWeight: 900, margin: "0 0 16px",
    background: "linear-gradient(135deg, #00d4ff, #0066ff)",
    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
  },
  hint: {
    color: "#aaa", lineHeight: 1.7, margin: "0 0 20px", fontSize: "1rem",
  },
  error: {
    color: "#ff5555", margin: "0 0 16px", fontSize: "0.9rem",
  },
  btn: {
    background: "#0066ff",
    color: "#fff", border: "none",
    padding: "13px 32px", fontSize: "1.1rem",
    borderRadius: 12, cursor: "pointer",
    width: "100%", marginTop: 4,
    fontWeight: 700,
    transition: "background 0.15s",
  },
  countdownNum: {
    fontSize: "min(22vw, 18rem)",
    fontWeight: 900,
    color: "#00d4ff",
    textShadow: "0 0 60px #00d4ff88",
    lineHeight: 1,
  },
  statsGrid: {
    display: "grid", gridTemplateColumns: "1fr 1fr",
    gap: 20, margin: "24px 0 28px",
  },
  pauseBtn: {
    position: "absolute", bottom: 20, right: 20,
    background: "rgba(0,0,0,0.5)",
    border: "1px solid #555",
    backdropFilter: "blur(4px)",
    color: "#fff", fontSize: "1.4rem",
    padding: "10px 14px", borderRadius: "50%",
    cursor: "pointer", zIndex: 30,
  },
};
