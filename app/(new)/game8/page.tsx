"use client";

import { useEffect, useRef } from "react";

import {
  PoseLandmarker,
  FilesetResolver,
} from "@mediapipe/tasks-vision";

export default function Page() {
  const videoRef =
    useRef<HTMLVideoElement>(null);

  const canvasRef =
    useRef<HTMLCanvasElement>(null);

  const landmarkerRef =
    useRef<PoseLandmarker | null>(null);

  useEffect(() => {
    let rafId: number;

    // -----------------------------
    // INIT CAMERA
    // -----------------------------
    const initCamera = async () => {
      const video =
        videoRef.current;

      if (!video) return;

      const stream =
        await navigator.mediaDevices.getUserMedia(
          {
            video: {
              facingMode: "user",
            },
            audio: false,
          }
        );

      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;

      await new Promise<void>(
        (resolve) => {
          video.onloadedmetadata =
            () => resolve();
        }
      );

      await video.play();

      console.log(
        "Camera ready:",
        video.videoWidth,
        video.videoHeight
      );
    };

    // -----------------------------
    // INIT MEDIAPIPE MODEL (FIXED URL)
    // -----------------------------
    const initModel = async () => {
      const vision =
        await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );

      landmarkerRef.current =
        await PoseLandmarker.createFromOptions(
          vision,
          {
            baseOptions: {
              modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task",
            },
            runningMode: "VIDEO",
            numPoses: 1,
          }
        );
    };

    // -----------------------------
    // DRAW SKELETON
    // -----------------------------
    const drawSkeleton = (
      ctx: CanvasRenderingContext2D,
      lm: any,
      w: number,
      h: number
    ) => {
      const line = (a: number, b: number) => {
        const p1 = lm[a];
        const p2 = lm[b];

        if (!p1 || !p2) return;

        ctx.beginPath();
        ctx.moveTo(
          p1.x * w,
          p1.y * h
        );

        ctx.lineTo(
          p2.x * w,
          p2.y * h
        );

        ctx.strokeStyle =
          "#00ff00";

        ctx.lineWidth = 2;

        ctx.stroke();
      };

      // torso
      line(11, 13);
      line(13, 15);

      line(12, 14);
      line(14, 16);

      line(11, 23);
      line(12, 24);

      // legs
      line(23, 25);
      line(25, 27);

      // arms
      line(11, 13);
      line(13, 15);

      line(12, 14);
      line(14, 16);
    };

    // -----------------------------
    // MAIN LOOP
    // -----------------------------
    const loop = async () => {
      const video =
        videoRef.current;

      const canvas =
        canvasRef.current;

      const landmarker =
        landmarkerRef.current;

      if (
        !video ||
        !canvas ||
        !landmarker
      ) {
        rafId =
          requestAnimationFrame(
            loop
          );
        return;
      }

      if (
        video.videoWidth === 0
      ) {
        rafId =
          requestAnimationFrame(
            loop
          );
        return;
      }

      const ctx =
        canvas.getContext("2d");

      if (!ctx) return;

      const w =
        window.innerWidth;

      const h =
        window.innerHeight;

      canvas.width = w;
      canvas.height = h;

      const result =
        landmarker.detectForVideo(
          video,
          performance.now()
        );

      // -----------------------------
      // CLEAR
      // -----------------------------
      ctx.clearRect(
        0,
        0,
        w,
        h
      );

      // -----------------------------
      // MIRROR CAMERA (SELFIE MODE)
      // -----------------------------
      ctx.save();
      ctx.scale(-1, 1);
      ctx.translate(-w, 0);

      // -----------------------------
      // DRAW CAMERA FEED (IMPORTANT)
      // -----------------------------
      ctx.drawImage(
        video,
        0,
        0,
        w,
        h
      );

      // -----------------------------
      // DRAW POSE OVERLAY
      // -----------------------------
      if (
        result.landmarks?.length
      ) {
        drawSkeleton(
          ctx,
          result.landmarks[0],
          w,
          h
        );
      }

      ctx.restore();

      rafId =
        requestAnimationFrame(
          loop
        );
    };

    // -----------------------------
    // START
    // -----------------------------
    const start = async () => {
      await initCamera();
      await initModel();
      loop();
    };

    start();

    return () =>
      cancelAnimationFrame(rafId);
  }, []);

  return (
    <main className="fixed inset-0 bg-black overflow-hidden">
      {/* hidden camera source */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="hidden"
      />

      {/* visible output */}
      <canvas
        ref={canvasRef}
        className="w-full h-full"
      />
    </main>
  );
}
