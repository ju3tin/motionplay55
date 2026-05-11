"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────
interface Keypoint {
  x: number;
  y: number;
  score: number;
  name: string;
}

interface Obstacle {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  speed: number;
  color: string;
  lane: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

type GameState = "idle" | "countdown" | "playing" | "dead";

// ── Constants ─────────────────────────────────────────────────────────────────
const CANVAS_W = 640;
const CANVAS_H = 480;
const OBSTACLE_COLORS = ["#ff2d55", "#ff9f0a", "#30d158", "#0a84ff", "#bf5af2"];
const SKELETON_CONNECTIONS: [number, number][] = [
  [5, 6],   // shoulders
  [5, 7],   // l-shoulder → l-elbow
  [7, 9],   // l-elbow → l-wrist
  [6, 8],   // r-shoulder → r-elbow
  [8, 10],  // r-elbow → r-wrist
  [5, 11],  // l-shoulder → l-hip
  [6, 12],  // r-shoulder → r-hip
  [11, 12], // hips
  [11, 13], // l-hip → l-knee
  [13, 15], // l-knee → l-ankle
  [12, 14], // r-hip → r-knee
  [14, 16], // r-knee → r-ankle
];

// hitbox keypoint indices (wrists, elbows, shoulders, hips, knees, ankles, nose)
const HITBOX_KPS = [0, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];

export default function MoveNetGame() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const gameCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const modelRef = useRef<any>(null);
  const keypointsRef = useRef<Keypoint[]>([]);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const scoreRef = useRef(0);
  const frameRef = useRef(0);
  const gameStateRef = useRef<GameState>("idle");
  const countdownRef = useRef(3);
  const countdownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextObstacleIdRef = useRef(0);
  const nextParticleIdRef = useRef(0);

  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [tfReady, setTfReady] = useState(false);
  const [camError, setCamError] = useState("");
  const [loadingMsg, setLoadingMsg] = useState("");

  // ── Load TensorFlow + MoveNet ────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function loadModel() {
      try {
        setLoadingMsg("Loading TensorFlow.js…");
        // Dynamically import so Next.js doesn't SSR these
        const tf = await import("@tensorflow/tfjs");
        await import("@tensorflow/tfjs-backend-webgl");
        await tf.setBackend("webgl");
        await tf.ready();

        setLoadingMsg("Loading MoveNet model…");
        const poseDetection = await import("@tensorflow-models/pose-detection");
        const detector = await poseDetection.createDetector(
          poseDetection.SupportedModels.MoveNet,
          { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
        );
        if (!cancelled) {
          modelRef.current = detector;
          setTfReady(true);
          setLoadingMsg("");
        }
      } catch (e: any) {
        if (!cancelled) setLoadingMsg("⚠ Failed to load model: " + e.message);
      }
    }
    loadModel();
    return () => { cancelled = true; };
  }, []);

  // ── Webcam ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!tfReady) return;
    navigator.mediaDevices
      .getUserMedia({ video: { width: CANVAS_W, height: CANVAS_H, facingMode: "user" } })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      })
      .catch((e) => setCamError("Camera access denied: " + e.message));
  }, [tfReady]);

  // ── Pose estimation loop ─────────────────────────────────────────────────────
  const poseLoopRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!tfReady || !modelRef.current) return;
    poseLoopRef.current = setInterval(async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) return;
      try {
        const poses = await modelRef.current.estimatePoses(videoRef.current);
        if (poses?.length > 0) keypointsRef.current = poses[0].keypoints;
      } catch (_) {}
    }, 80); // ~12 fps pose estimation
    return () => { if (poseLoopRef.current) clearInterval(poseLoopRef.current); };
  }, [tfReady]);

  // ── Spawn obstacle ───────────────────────────────────────────────────────────
  const spawnObstacle = useCallback(() => {
    const lane = Math.floor(Math.random() * 3); // 0=left 1=center 2=right
    const laneX = [60, CANVAS_W / 2 - 40, CANVAS_W - 140];
    const w = 70 + Math.random() * 50;
    const h = 40 + Math.random() * 40;
    const speed = 3 + scoreRef.current * 0.012;
    const color = OBSTACLE_COLORS[Math.floor(Math.random() * OBSTACLE_COLORS.length)];
    obstaclesRef.current.push({
      id: nextObstacleIdRef.current++,
      x: laneX[lane],
      y: -h,
      w, h, speed, color, lane,
    });
  }, []);

  // ── Spawn particles ──────────────────────────────────────────────────────────
  const spawnParticles = useCallback((x: number, y: number, color: string) => {
    for (let i = 0; i < 18; i++) {
      const angle = (Math.PI * 2 * i) / 18 + Math.random() * 0.5;
      const speed = 2 + Math.random() * 4;
      particlesRef.current.push({
        id: nextParticleIdRef.current++,
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        color,
      });
    }
  }, []);

  // ── Collision detection ──────────────────────────────────────────────────────
  const checkCollision = useCallback((obs: Obstacle): boolean => {
    const kps = keypointsRef.current;
    if (!kps.length) return false;
    // Mirror x because video is flipped
    for (const idx of HITBOX_KPS) {
      const kp = kps[idx];
      if (!kp || kp.score < 0.25) continue;
      const mx = CANVAS_W - kp.x; // mirrored
      const my = kp.y;
      if (mx > obs.x - 10 && mx < obs.x + obs.w + 10 &&
          my > obs.y - 10 && my < obs.y + obs.h + 10) {
        return true;
      }
    }
    return false;
  }, []);

  // ── Start countdown then game ────────────────────────────────────────────────
  const startGame = useCallback(() => {
    gameStateRef.current = "countdown";
    setGameState("countdown");
    countdownRef.current = 3;
    setCountdown(3);
    obstaclesRef.current = [];
    particlesRef.current = [];
    scoreRef.current = 0;
    frameRef.current = 0;
    setScore(0);

    let c = 3;
    const tick = () => {
      c--;
      countdownRef.current = c;
      setCountdown(c);
      if (c <= 0) {
        gameStateRef.current = "playing";
        setGameState("playing");
      } else {
        countdownTimerRef.current = setTimeout(tick, 1000);
      }
    };
    countdownTimerRef.current = setTimeout(tick, 1000);
  }, []);

  // ── Main render loop ─────────────────────────────────────────────────────────
  useEffect(() => {
    const gameCanvas = gameCanvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    if (!gameCanvas || !overlayCanvas) return;
    const gc = gameCanvas.getContext("2d")!;
    const oc = overlayCanvas.getContext("2d")!;

    let spawnTimer = 0;
    const SPAWN_INTERVAL = 90;

    function loop() {
      rafRef.current = requestAnimationFrame(loop);

      const state = gameStateRef.current;

      // ── Draw video mirror on game canvas ─────────────────────────────────────
      gc.save();
      gc.scale(-1, 1);
      gc.translate(-CANVAS_W, 0);
      if (videoRef.current && videoRef.current.readyState >= 2) {
        gc.drawImage(videoRef.current, 0, 0, CANVAS_W, CANVAS_H);
      } else {
        gc.fillStyle = "#0a0a0f";
        gc.fillRect(0, 0, CANVAS_W, CANVAS_H);
      }
      gc.restore();

      // dark vignette
      const vignette = gc.createRadialGradient(
        CANVAS_W / 2, CANVAS_H / 2, CANVAS_H * 0.2,
        CANVAS_W / 2, CANVAS_H / 2, CANVAS_H * 0.85
      );
      vignette.addColorStop(0, "rgba(0,0,0,0)");
      vignette.addColorStop(1, "rgba(0,0,0,0.65)");
      gc.fillStyle = vignette;
      gc.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // ── Game logic ────────────────────────────────────────────────────────────
      if (state === "playing") {
        frameRef.current++;
        spawnTimer++;

        const interval = Math.max(30, SPAWN_INTERVAL - Math.floor(scoreRef.current / 5));
        if (spawnTimer >= interval) {
          spawnObstacle();
          spawnTimer = 0;
        }

        // update obstacles
        let hit = false;
        obstaclesRef.current = obstaclesRef.current.filter((obs) => {
          obs.y += obs.speed;
          if (checkCollision(obs)) {
            spawnParticles(obs.x + obs.w / 2, obs.y + obs.h / 2, obs.color);
            hit = true;
            return false;
          }
          if (obs.y > CANVAS_H + 10) {
            scoreRef.current++;
            setScore(scoreRef.current);
            return false;
          }
          return true;
        });

        if (hit) {
          gameStateRef.current = "dead";
          setGameState("dead");
          setFinalScore(scoreRef.current);
        }

        // draw obstacles
        for (const obs of obstaclesRef.current) {
          gc.save();
          gc.shadowColor = obs.color;
          gc.shadowBlur = 18;
          gc.fillStyle = obs.color + "cc";
          gc.beginPath();
          roundRect(gc, obs.x, obs.y, obs.w, obs.h, 10);
          gc.fill();
          gc.strokeStyle = obs.color;
          gc.lineWidth = 2;
          gc.stroke();
          gc.restore();

          // warning arrow if near top
          if (obs.y < 30) {
            gc.fillStyle = obs.color;
            gc.font = "bold 18px monospace";
            gc.fillText("▼", obs.x + obs.w / 2 - 9, 20);
          }
        }
      }

      // update + draw particles
      particlesRef.current = particlesRef.current.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15;
        p.life -= 0.04;
        if (p.life <= 0) return false;
        gc.save();
        gc.globalAlpha = p.life;
        gc.fillStyle = p.color;
        gc.beginPath();
        gc.arc(p.x, p.y, 4 * p.life, 0, Math.PI * 2);
        gc.fill();
        gc.restore();
        return true;
      });

      // ── Pose overlay ──────────────────────────────────────────────────────────
      oc.clearRect(0, 0, CANVAS_W, CANVAS_H);
      const kps = keypointsRef.current;
      if (kps.length > 0) {
        // skeleton
        oc.save();
        oc.strokeStyle = "rgba(0, 255, 200, 0.7)";
        oc.lineWidth = 3;
        oc.shadowColor = "#00ffc8";
        oc.shadowBlur = 8;
        for (const [a, b] of SKELETON_CONNECTIONS) {
          const ka = kps[a], kb = kps[b];
          if (!ka || !kb || ka.score < 0.25 || kb.score < 0.25) continue;
          oc.beginPath();
          oc.moveTo(CANVAS_W - ka.x, ka.y);
          oc.lineTo(CANVAS_W - kb.x, kb.y);
          oc.stroke();
        }
        // keypoints
        for (const kp of kps) {
          if (kp.score < 0.25) continue;
          oc.fillStyle = "#00ffc8";
          oc.shadowColor = "#00ffc8";
          oc.shadowBlur = 12;
          oc.beginPath();
          oc.arc(CANVAS_W - kp.x, kp.y, 5, 0, Math.PI * 2);
          oc.fill();
        }
        oc.restore();
      }

      // ── HUD ───────────────────────────────────────────────────────────────────
      if (state === "playing" || state === "dead") {
        gc.save();
        gc.font = "bold 28px 'Courier New', monospace";
        gc.fillStyle = "#ffffff";
        gc.shadowColor = "#00ffc8";
        gc.shadowBlur = 12;
        gc.fillText(`SCORE  ${scoreRef.current}`, 16, 36);
        gc.restore();
      }
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [spawnObstacle, checkCollision, spawnParticles]);

  function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div style={styles.root}>
      {/* Background grid */}
      <div style={styles.gridBg} />

      <h1 style={styles.title}>DODGE<span style={styles.titleAccent}>BODY</span></h1>
      <p style={styles.subtitle}>dodge falling blocks with your whole body</p>

      <div style={styles.canvasWrapper}>
        {/* Stacked canvases */}
        <canvas ref={gameCanvasRef} width={CANVAS_W} height={CANVAS_H} style={styles.canvas} />
        <canvas ref={overlayCanvasRef} width={CANVAS_W} height={CANVAS_H} style={{ ...styles.canvas, position: "absolute", top: 0, left: 0, pointerEvents: "none" }} />

        {/* Hidden video */}
        <video ref={videoRef} style={styles.hiddenVideo} muted playsInline />

        {/* Overlays */}
        {/* Loading */}
        {loadingMsg && (
          <div style={styles.overlay}>
            <div style={styles.overlayBox}>
              <div style={styles.spinner} />
              <p style={styles.overlayText}>{loadingMsg}</p>
            </div>
          </div>
        )}

        {/* Camera error */}
        {camError && !loadingMsg && (
          <div style={styles.overlay}>
            <div style={styles.overlayBox}>
              <p style={{ ...styles.overlayText, color: "#ff2d55" }}>📷 {camError}</p>
            </div>
          </div>
        )}

        {/* Idle / ready */}
        {tfReady && !camError && !loadingMsg && gameState === "idle" && (
          <div style={styles.overlay}>
            <div style={styles.overlayBox}>
              <p style={styles.overlayHeading}>READY?</p>
              <p style={styles.overlayBody}>Stand back so your full body is visible.<br />Dodge the falling blocks using your body!</p>
              <button style={styles.btn} onClick={startGame}>▶ START GAME</button>
            </div>
          </div>
        )}

        {/* Countdown */}
        {gameState === "countdown" && (
          <div style={styles.overlay}>
            <div style={{ ...styles.overlayBox, background: "transparent", border: "none" }}>
              <p style={styles.countdownNum}>{countdown}</p>
            </div>
          </div>
        )}

        {/* Game over */}
        {gameState === "dead" && (
          <div style={styles.overlay}>
            <div style={styles.overlayBox}>
              <p style={styles.overlayHeading}>GAME OVER</p>
              <p style={{ ...styles.overlayBody, fontSize: "2rem", color: "#00ffc8", fontFamily: "monospace" }}>
                {finalScore} <span style={{ fontSize: "1rem", color: "#aaa" }}>pts</span>
              </p>
              <button style={styles.btn} onClick={startGame}>↩ PLAY AGAIN</button>
            </div>
          </div>
        )}

        {/* Score live badge */}
        {gameState === "playing" && (
          <div style={styles.scoreBadge}>{score}</div>
        )}
      </div>

      {/* Instructions */}
      <div style={styles.instructions}>
        <span style={styles.chip}>🎥 Webcam required</span>
        <span style={styles.chip}>🕺 Move your whole body</span>
        <span style={styles.chip}>⚡ Speed increases over time</span>
      </div>
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: "100vh",
    background: "#04040a",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px 16px 40px",
    fontFamily: "'Courier New', Courier, monospace",
    position: "relative",
    overflow: "hidden",
  },
  gridBg: {
    position: "fixed",
    inset: 0,
    backgroundImage:
      "linear-gradient(rgba(0,255,200,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,200,0.04) 1px, transparent 1px)",
    backgroundSize: "40px 40px",
    pointerEvents: "none",
    zIndex: 0,
  },
  title: {
    fontSize: "clamp(2rem, 6vw, 3.5rem)",
    fontWeight: 900,
    letterSpacing: "0.15em",
    color: "#ffffff",
    margin: "0 0 4px",
    zIndex: 1,
    textTransform: "uppercase",
  },
  titleAccent: {
    color: "#00ffc8",
    textShadow: "0 0 20px #00ffc8aa",
  },
  subtitle: {
    color: "#556",
    fontSize: "0.85rem",
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    marginBottom: "20px",
    zIndex: 1,
  },
  canvasWrapper: {
    position: "relative",
    width: CANVAS_W,
    maxWidth: "100%",
    aspectRatio: `${CANVAS_W} / ${CANVAS_H}`,
    borderRadius: 12,
    overflow: "hidden",
    boxShadow: "0 0 0 2px #00ffc822, 0 0 60px #00ffc811, 0 24px 80px #000a",
    zIndex: 1,
  },
  canvas: {
    display: "block",
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  hiddenVideo: {
    display: "none",
  },
  overlay: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(4,4,10,0.72)",
    backdropFilter: "blur(6px)",
    zIndex: 10,
  },
  overlayBox: {
    border: "1px solid #00ffc833",
    borderRadius: 16,
    padding: "36px 48px",
    background: "rgba(4,4,10,0.85)",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 14,
    maxWidth: 380,
  },
  overlayHeading: {
    color: "#ffffff",
    fontSize: "2rem",
    fontWeight: 900,
    letterSpacing: "0.2em",
    margin: 0,
  },
  overlayBody: {
    color: "#88a",
    fontSize: "0.9rem",
    lineHeight: 1.6,
    margin: 0,
    letterSpacing: "0.05em",
  },
  overlayText: {
    color: "#ccc",
    fontSize: "0.95rem",
    letterSpacing: "0.05em",
    margin: 0,
  },
  btn: {
    marginTop: 8,
    padding: "12px 32px",
    background: "transparent",
    border: "2px solid #00ffc8",
    color: "#00ffc8",
    fontSize: "1rem",
    fontWeight: 700,
    letterSpacing: "0.15em",
    borderRadius: 8,
    cursor: "pointer",
    textTransform: "uppercase",
    transition: "background 0.15s, color 0.15s",
    fontFamily: "'Courier New', monospace",
  },
  countdownNum: {
    fontSize: "10rem",
    fontWeight: 900,
    color: "#00ffc8",
    textShadow: "0 0 60px #00ffc8",
    margin: 0,
    lineHeight: 1,
    animation: "pulse 1s ease-in-out",
  },
  scoreBadge: {
    position: "absolute",
    top: 12,
    right: 16,
    color: "#00ffc8",
    fontSize: "1.4rem",
    fontWeight: 900,
    fontFamily: "monospace",
    textShadow: "0 0 12px #00ffc8",
    pointerEvents: "none",
    zIndex: 5,
  },
  spinner: {
    width: 36,
    height: 36,
    border: "3px solid #00ffc822",
    borderTopColor: "#00ffc8",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  instructions: {
    marginTop: 20,
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    justifyContent: "center",
    zIndex: 1,
  },
  chip: {
    fontSize: "0.75rem",
    color: "#556",
    border: "1px solid #1a1a2e",
    borderRadius: 100,
    padding: "5px 14px",
    letterSpacing: "0.05em",
  },
};
