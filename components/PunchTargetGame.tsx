"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Script from "next/script";

export interface GameProps {
  roomId?: string;
  currentGameId?: string;
  players: any[] | number;        // ✅ Support both array and number
  userId: string;
  send: (data: any) => void;
  gameActive?: boolean;
  status?: string;
  onReady?: () => void;
  onLeave?: () => void;
  isSpectator?: boolean;
}

const GAME_DURATION = 60;
const SPAWN_INTERVAL = 800;
const TARGET_LIFETIME = 2200;
const HIT_RADIUS = 55;

type GameState = "idle" | "loading" | "countdown" | "playing" | "ended";

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
  isSpectator = false,
}: GameProps) {
  const effectiveRoomId = roomId || currentGameId || "room1";

  const gameAreaRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [errorMsg, setErrorMsg] = useState("");
  const [scriptsLoaded, setScriptsLoaded] = useState(false);

  const detectorRef = useRef<any>(null);
  const targetsRef = useRef<any[]>([]);
  const animationRef = useRef<number | null>(null);
  const spawnRef = useRef<NodeJS.Timeout | null>(null);

  // Handle both array and number for players
  const playersList = Array.isArray(playersProp)
    ? playersProp
    : Array.from({ length: Number(playersProp) || 1 }, (_, i) => ({
        id: `p${i}`,
        name: `Player ${i + 1}`,
      }));

  const isHost = playersList[0]?.id === userId;

  // Load TensorFlow from CDN
  const loadModel = useCallback(async () => {
    if (!scriptsLoaded || !window.tf || !window.poseDetection) return false;

    try {
      await window.tf.setBackend("webgl");
      await window.tf.ready();

      detectorRef.current = await window.poseDetection.createDetector(
        window.poseDetection.SupportedModels.MoveNet,
        { modelType: "SinglePose.Thunder" }
      );
      console.log("✅ MoveNet Loaded via CDN");
      return true;
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to load pose detector");
      return false;
    }
  }, [scriptsLoaded]);

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

      send({ type: "SCORE_UPDATE", roomId: effectiveRoomId, userId, score: newScore, combo: newCombo });
    }
  }, [score, combo, maxCombo, send, effectiveRoomId, userId]);

  const spawnTarget = useCallback(() => {
    if (!isHost || gameState !== "playing") return;
    const area = gameAreaRef.current;
    if (!area) return;

    const rect = area.getBoundingClientRect();
    const target = {
      id: Date.now(),
      x: 100 + Math.random() * (rect.width - 200),
      y: 100 + Math.random() * (rect.height - 250),
      r: 38,
      born: Date.now(),
      hit: false,
    };
    targetsRef.current.push(target);
    send({ type: "TARGET", roomId: effectiveRoomId, target });
  }, [isHost, gameState, send, effectiveRoomId]);

  // Receive targets
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
    await loadModel();
    await startCamera();
    targetsRef.current = [];
    setScore(0); setCombo(0); setMaxCombo(0); setTimeLeft(GAME_DURATION);
    setGameState("countdown");

    let c = 3;
    const int = setInterval(() => {
      c--;
      if (c <= 0) {
        clearInterval(int);
        setGameState("playing");
      }
    }, 1000);
  };

  // Main Render + Detection Loop
  useEffect(() => {
    if (gameState !== "playing" || isSpectator) return;

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
        const x = t.x, y = t.y;
        ctx.save();
        if (!t.hit) {
          const pulse = 1 + Math.sin(now / 280) * 0.1;
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

        ctx.font = `${t.r * 1.3}px sans-serif`;
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(t.hit ? "💥" : "🎯", x, y);
        ctx.restore();
      });

      // Skeleton + Detection
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
  }, [gameState, isSpectator, checkHit]);

  return (
    <>
      <Script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js" strategy="afterInteractive" />
      <Script 
        src="https://cdn.jsdelivr.net/npm/@tensorflow-models/pose-detection@2.1.3" 
        strategy="afterInteractive"
        onLoad={() => setScriptsLoaded(true)}
      />

      <div style={{ position: "relative", width: "100%", height: "100vh", background: "#0a0a12", overflow: "hidden" }}>
        {!isSpectator && (
          <div ref={gameAreaRef} style={{ position: "relative", width: "100%", height: "100%" }}>
            <video ref={videoRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)", opacity: 0.25 }} autoPlay playsInline muted />
            <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, zIndex: 5 }} />
          </div>
        )}

        {(gameState === "playing" || gameState === "ended") && (
          <div style={{ position: "absolute", top: 20, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.8)", padding: "12px 40px", borderRadius: "50px", zIndex: 100, fontSize: "1.5rem" }}>
            ⏱ {timeLeft} &nbsp; ⚡ {combo} &nbsp; 🏆 {score}
          </div>
        )}

        {gameState === "idle" && !isSpectator && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.85)", zIndex: 20 }}>
            <button 
              onClick={startGame} 
              disabled={!scriptsLoaded}
              style={{ padding: "20px 60px", fontSize: "1.6rem", background: "#0066ff", color: "white", border: "none", borderRadius: "16px", cursor: scriptsLoaded ? "pointer" : "not-allowed" }}
            >
              {scriptsLoaded ? "Start Game" : "Loading AI Model..."}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
