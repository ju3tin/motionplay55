"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Script from "next/script";

declare global {
  interface Window {
    tf: any;
    poseDetection: any;
  }
}

const GAME_DURATION = 60;
const SPAWN_INTERVAL = 800;
const TARGET_LIFETIME = 2200;
const HIT_RADIUS = 55;

export default function PunchTargetGame1() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const gameAreaRef = useRef<HTMLDivElement>(null);

  const [gameState, setGameState] = useState<"idle" | "loading" | "countdown" | "playing" | "ended">("idle");
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [errorMsg, setErrorMsg] = useState("");
  const [scriptsLoaded, setScriptsLoaded] = useState(false);

  const detectorRef = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);
  const spawnIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load TensorFlow from CDN (exactly like original)
  const loadModel = useCallback(async () => {
    if (!window.tf || !window.poseDetection) return false;

    try {
      await window.tf.setBackend("webgl");
      await window.tf.ready();

      detectorRef.current = await window.poseDetection.createDetector(
        window.poseDetection.SupportedModels.MoveNet,
        { modelType: "SinglePose.Lightning" }
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
    const liveTargets = document.querySelectorAll('.target:not(.hit)');
    let hitAny = false;

    liveTargets.forEach((t: any) => {
      const tx = parseFloat(t.dataset.x);
      const ty = parseFloat(t.dataset.y);
      const tr = parseFloat(t.dataset.radius);
      const dist = Math.hypot(wx - tx, wy - ty);

      if (dist < HIT_RADIUS + tr) {
        t.classList.add('hit');
        hitAny = true;
      }
    });

    if (hitAny) {
      setCombo(prev => {
        const newCombo = prev + 1;
        setScore(s => s + 100 + newCombo * 15);
        if (newCombo > maxCombo) setMaxCombo(newCombo);
        return newCombo;
      });
    }
  }, [maxCombo]);

  const spawnTarget = useCallback(() => {
    const area = gameAreaRef.current;
    if (!area || gameState !== "playing") return;

    const rect = area.getBoundingClientRect();
    const padding = 90;
    const x = padding + Math.random() * (rect.width - padding * 2);
    const y = padding + Math.random() * (rect.height - padding * 2);
    const radius = 32 + Math.random() * 18;

    const target = document.createElement("div");
    target.className = "target";
    target.style.left = `${x - radius}px`;
    target.style.top = `${y - radius}px`;
    target.style.width = `${radius * 2}px`;
    target.style.height = `${radius * 2}px`;

    const inner = document.createElement("div");
    inner.style.width = "100%";
    inner.style.height = "100%";
    inner.style.background = "rgba(220, 20, 60, 0.75)";
    inner.style.border = "4px solid #c00";
    inner.style.borderRadius = "50%";
    inner.style.fontSize = "2rem";
    inner.style.display = "flex";
    inner.style.alignItems = "center";
    inner.style.justifyContent = "center";
    inner.textContent = "🎯";
    target.appendChild(inner);

    target.dataset.id = Date.now().toString();
    target.dataset.x = x.toString();
    target.dataset.y = y.toString();
    target.dataset.radius = radius.toString();

    area.appendChild(target);

    setTimeout(() => {
      if (target && !target.classList.contains("hit")) {
        setCombo(0);
      }
      target.remove();
    }, TARGET_LIFETIME);
  }, [gameState]);

  const startGameLoop = useCallback(() => {
    // Timer
    timerIntervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Spawner
    spawnIntervalRef.current = setInterval(spawnTarget, SPAWN_INTERVAL);

    // Detection
    const detect = async () => {
      if (gameState !== "playing" || !detectorRef.current || !videoRef.current) {
        animationFrameRef.current = requestAnimationFrame(detect);
        return;
      }

      if (videoRef.current.readyState >= 2) {
        try {
          const poses = await detectorRef.current.estimatePoses(videoRef.current);
          if (poses?.length > 0) {
            const pose = poses[0];
            const rect = gameAreaRef.current?.getBoundingClientRect();
            if (!rect) return;

            const scaleX = rect.width / videoRef.current.videoWidth;
            const scaleY = rect.height / videoRef.current.videoHeight;

            [9, 10].forEach(i => {
              const kp = pose.keypoints[i];
              if (kp?.score > 0.35) {
                const x = rect.width - (kp.x * scaleX);
                const y = kp.y * scaleY;
                checkHit(x, y);
              }
            });
          }
        } catch (err) {
          console.error(err);
        }
      }

      animationFrameRef.current = requestAnimationFrame(detect);
    };

    detect();
  }, [gameState, spawnTarget, checkHit]);

  const startGame = async () => {
    setGameState("loading");
    const loaded = await loadModel();
    if (!loaded) return;

    await startCamera();

    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setTimeLeft(GAME_DURATION);

    setGameState("countdown");

    let count = 3;
    const cd = setInterval(() => {
      count--;
      if (count <= 0) {
        clearInterval(cd);
        setGameState("playing");
        startGameLoop();
      }
    }, 1000);
  };

  const endGame = () => {
    setGameState("ended");
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (spawnIntervalRef.current) clearInterval(spawnIntervalRef.current);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
  };

  return (
    <>
      <Script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js" strategy="afterInteractive" />
      <Script 
        src="https://cdn.jsdelivr.net/npm/@tensorflow-models/pose-detection@2.1.3" 
        strategy="afterInteractive"
        onLoad={() => setScriptsLoaded(true)}
      />

      <div style={{ width: "100%", height: "100vh", background: "linear-gradient(to bottom, #0f0f1a, #1a1a2e)", position: "relative", overflow: "hidden", color: "white", fontFamily: "system-ui, sans-serif" }}>
        {/* Header */}
        <header style={{ position: "fixed", top: 0, left: 0, right: 0, background: "rgba(0,0,0,0.6)", padding: "12px 20px", zIndex: 100, display: "flex", justifyContent: "space-between" }}>
          <button onClick={() => window.location.reload()}>← Back</button>
          {(gameState === "playing" || gameState === "ended") && (
            <div style={{ display: "flex", gap: "24px", fontSize: "1.2rem" }}>
              <div>⏱ {`${Math.floor(timeLeft/60).toString().padStart(2,'0')}:${(timeLeft%60).toString().padStart(2,'0')}`}</div>
              <div>⚡ {combo}</div>
              <div>🏆 {score}</div>
            </div>
          )}
        </header>

        <div ref={gameAreaRef} id="game-area" style={{ position: "relative", width: "100%", height: "100vh" }}>
          <video ref={videoRef} id="video" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)", opacity: 0.25 }} autoPlay playsInline muted />

          {/* Idle Screen */}
          {gameState === "idle" && (
            <div className="overlay" style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
              <div className="card" style={{ background: "rgba(30,30,50,0.9)", padding: "40px", borderRadius: "16px", textAlign: "center", maxWidth: "420px" }}>
                <h1 style={{ fontSize: "2.8rem", marginBottom: "16px" }}>Punch Targets</h1>
                <p style={{ color: "#aaa", margin: "16px 0" }}>
                  Use your hands to punch targets!<br />
                  Build combos for bonus points.
                </p>
                {errorMsg && <p style={{ color: "#ff5555" }}>{errorMsg}</p>}
                <button onClick={startGame} disabled={!scriptsLoaded} style={{ padding: "14px 40px", fontSize: "1.3rem" }}>
                  {scriptsLoaded ? "Start Game" : "Loading Model..."}
                </button>
              </div>
            </div>
          )}

          {/* Countdown */}
          {gameState === "countdown" && (
            <div className="overlay" style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
              <div style={{ fontSize: "18rem", fontWeight: 900, color: "#00d4ff" }}>3</div>
            </div>
          )}

          {/* Game Over */}
          {gameState === "ended" && (
            <div className="overlay" style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 20 }}>
              <div className="card" style={{ textAlign: "center" }}>
                <h1>Game Over!</h1>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px", margin: "30px 0" }}>
                  <div>
                    <div style={{ color: "#aaa" }}>Score</div>
                    <div style={{ fontSize: "3.5rem", color: "#00d4ff" }}>{score}</div>
                  </div>
                  <div>
                    <div style={{ color: "#aaa" }}>Max Combo</div>
                    <div style={{ fontSize: "3.5rem", color: "#ffaa00" }}>{maxCombo}</div>
                  </div>
                </div>
                <button onClick={() => window.location.reload()}>Play Again</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
