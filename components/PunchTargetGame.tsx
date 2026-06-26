"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Script from "next/script";

export interface GameProps {
  roomId?: string;
  players: any[];
  userId: string;
  send: (data: any) => void;
  isSpectator?: boolean;
}

const GAME_DURATION = 60;
const SPAWN_INTERVAL = 800;
const TARGET_LIFETIME = 2200;
const HIT_RADIUS = 55;

type GameState = "idle" | "loading" | "countdown" | "playing" | "ended";

export default function PunchTargetGame({
  roomId = "room1",
  players,
  userId,
  send,
  isSpectator = false,
}: GameProps) {
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

  const isHost = players[0]?.id === userId;

  // Load TensorFlow from CDN (exactly like your original HTML)
  const loadModel = useCallback(async () => {
    if (!scriptsLoaded || !window.tf || !window.poseDetection) {
      setErrorMsg("Scripts not loaded yet");
      return false;
    }

    try {
      await window.tf.setBackend("webgl");
      await window.tf.ready();

      detectorRef.current = await window.poseDetection.createDetector(
        window.poseDetection.SupportedModels.MoveNet,
        { modelType: "SinglePose.Thunder" }
      );

      console.log("✅ MoveNet Thunder Loaded via CDN");
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

  // ... (checkHit, spawnTarget, startGame, render loop remain the same as previous working version)

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

      send({ type: "SCORE_UPDATE", roomId, userId, score: newScore, combo: newCombo });
    }
  }, [score, combo, maxCombo, send, roomId, userId]);

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
      hit: false
    };
    targetsRef.current.push(target);
    send({ type: "TARGET", roomId, target });
  }, [isHost, gameState, send, roomId]);

  // Main render + detection loop (same as last working version)
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

      // Draw Targets
      const now = Date.now();
      targetsRef.current = targetsRef.current.filter(t => now - t.born <= TARGET_LIFETIME);

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

            // Hit detection
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
      {/* Load TensorFlow from CDN */}
      <Script
        src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js"
        strategy="afterInteractive"
        onLoad={() => console.log("✅ tfjs loaded")}
      />
      <Script
        src="https://cdn.jsdelivr.net/npm/@tensorflow-models/pose-detection@2.1.3"
        strategy="afterInteractive"
        onLoad={() => {
          console.log("✅ pose-detection loaded");
          setScriptsLoaded(true);
        }}
      />

      <div style={{ position: "relative", width: "100%", height: "100vh", background: "#0a0a12", overflow: "hidden" }}>
        {!isSpectator && (
          <div ref={gameAreaRef} style={{ position: "relative", width: "100%", height: "100%" }}>
            <video ref={videoRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)", opacity: 0.25 }} autoPlay playsInline muted />
            <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, zIndex: 5 }} />
          </div>
        )}

        {/* HUD */}
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
