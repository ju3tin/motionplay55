"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { POSES } from "./poses";
import { calculatePoseScore, Keypoint } from "@/lib/poseMatcher";

interface Props {
  roomId: string;
  userId: string;
  players: number;
  send: (data: any) => void;
  gameActive: boolean;
}

const BONES: [number, number][] = [
  [0, 1], [0, 2], [1, 3], [2, 4],
  [5, 6], [5, 7], [7, 9], [6, 8], [8, 10],
  [5, 11], [6, 12], [11, 12],
  [11, 13], [13, 15], [12, 14], [14, 16],
];

export default function PoseMatchGame({
  roomId,
  userId,
  players,
  send,
  gameActive,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const detectorRef = useRef<any>(null);
  const pointsRef = useRef<Keypoint[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [score, setScore] = useState(0);
  const [time, setTime] = useState(30);
  const [target, setTarget] = useState<any>(POSES.tPose);
  const [loaded, setLoaded] = useState(false);

  // Load TensorFlow.js + MoveNet
  useEffect(() => {
    async function load() {
      try {
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
        setLoaded(true);
      } catch (err) {
        console.error("Failed to load pose detector:", err);
      }
    }
    load();
  }, []);

  // Start camera and pose detection
  useEffect(() => {
    if (!gameActive || !loaded) return;

    let isActive = true;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: 1280,
            height: 720,
            facingMode: "user",
          },
        });
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (err) {
        console.error("Camera access error:", err);
      }
    }

    // Detection loop
    const detectLoop = async () => {
      while (isActive && detectorRef.current && videoRef.current) {
        try {
          const result = await detectorRef.current.estimatePoses(videoRef.current);
          if (result.length > 0) {
            const keypoints = result[0].keypoints;
            pointsRef.current = keypoints;

            const newScore = calculatePoseScore(keypoints, target.points);
            setScore(Math.round(newScore));

            send({
              event: "pose-score",
              roomId,
              userId,
              score: Math.round(newScore),
            });
          }
        } catch (err) {
          console.error("Pose detection error:", err);
        }

        await new Promise((r) => setTimeout(r, 100)); // ~10 FPS
      }
    };

    startCamera();
    detectLoop();

    return () => {
      isActive = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameActive, loaded, target, roomId, userId, send]);

  // Pick random pose when game starts
  useEffect(() => {
    if (!gameActive) return;

    const poseNames = Object.keys(POSES);
    const randomPoseName = poseNames[Math.floor(Math.random() * poseNames.length)];
    setTarget(POSES[randomPoseName as keyof typeof POSES]);
    setTime(30);
    setScore(0);
  }, [gameActive]);

  // Timer
  useEffect(() => {
    if (!gameActive) return;

    const timer = setInterval(() => {
      setTime((prev) => {
        if (prev <= 1) {
          send({ event: "pose-finished", roomId, userId });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameActive, roomId, userId, send]);

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const resizeCanvas = () => {
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);

      if (video.readyState < 2) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw mirrored camera feed
      ctx.save();
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      ctx.restore();

      const keypoints = pointsRef.current;
      if (keypoints.length === 0) return;

      // Player's skeleton
      ctx.strokeStyle = "#00ffcc";
      ctx.lineWidth = 8;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";

      BONES.forEach(([a, b]) => {
        const A = keypoints[a];
        const B = keypoints[b];
        if (!A || !B) return;

        ctx.beginPath();
        ctx.moveTo(canvas.width - A.x, A.y);
        ctx.lineTo(canvas.width - B.x, B.y);
        ctx.stroke();
      });

      // Target ghost pose
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = "#ff0066";
      ctx.lineWidth = 10;

      const mapTarget = (p: number[]) => ({
        x: canvas.width / 2 + p[0] * 130,
        y: canvas.height / 2 + p[1] * 130,
      });

      BONES.forEach(([a, b]) => {
        const A = mapTarget(target.points[a]);
        const B = mapTarget(target.points[b]);
        ctx.beginPath();
        ctx.moveTo(A.x, A.y);
        ctx.lineTo(B.x, B.y);
        ctx.stroke();
      });

      ctx.globalAlpha = 1;
    };

    draw();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [target]);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "#000",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <video
        ref={videoRef}
        muted
        playsInline
        style={{ display: "none" }}
      />
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: "block" }}
      />

      {/* HUD */}
      <div
        style={{
          position: "absolute",
          top: 20,
          left: 20,
          color: "#fff",
          fontSize: "28px",
          fontFamily: "monospace",
          textShadow: "0 2px 10px rgba(0,0,0,0.9)",
          pointerEvents: "none",
          zIndex: 10,
        }}
      >
        TIME: {time}
        <br />
        MATCH: {score}%
        <br />
        PLAYERS: {players}
        <br />
        TARGET: {target.name}
      </div>
    </div>
  );
}
