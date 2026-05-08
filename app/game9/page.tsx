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

  let lastTime = 0;

  useEffect(() => {
    let rafId: number;

    // -----------------------------
    // CAMERA INIT
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
    };

    // -----------------------------
    // MODEL INIT
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
    // STABLE DRAWING (NO STRETCH)
    // -----------------------------
    const drawSkeleton = (
      ctx: CanvasRenderingContext2D,
      lm: any,
      vw: number,
      vh: number,
      cw: number,
      ch: number
    ) => {
      // aspect-fit (CRITICAL FIX)
      const scale =
        Math.min(
          cw / vw,
          ch / vh
        );

      const offsetX =
        (cw - vw * scale) / 2;

      const offsetY =
        (ch - vh * scale) / 2;

      const X = (p: any) =>
        p.x * vw * scale +
        offsetX;

      const Y = (p: any) =>
        p.y * vh * scale +
        offsetY;

      const line = (a: number, b: number) => {
        const p1 = lm[a];
        const p2 = lm[b];

        if (!p1 || !p2) return;

        ctx.beginPath();
        ctx.moveTo(
          X(p1),
          Y(p1)
        );

        ctx.lineTo(
          X(p2),
          Y(p2)
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
    // MAIN LOOP (THROTTLED)
    // -----------------------------
    const loop = async (t: number) => {
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
          requestAnimationFrame(loop);
        return;
      }

      // 🔥 throttle to 15 FPS
      if (t - lastTime < 66) {
        rafId =
          requestAnimationFrame(loop);
        return;
      }

      lastTime = t;

      const ctx =
        canvas.getContext("2d");

      if (!ctx) return;

      const cw =
        window.innerWidth;

      const ch =
        window.innerHeight;

      canvas.width = cw;
      canvas.height = ch;

      if (
        video.videoWidth === 0
      ) {
        rafId =
          requestAnimationFrame(loop);
        return;
      }

      const result =
        landmarker.detectForVideo(
          video,
          t
        );

      ctx.clearRect(
        0,
        0,
        cw,
        ch
      );

      // mirror
      ctx.save();
      ctx.scale(-1, 1);
      ctx.translate(-cw, 0);

      if (result.landmarks?.length) {
        drawSkeleton(
          ctx,
          result.landmarks[0],
          video.videoWidth,
          video.videoHeight,
          cw,
          ch
        );
      }

      ctx.restore();

      rafId =
        requestAnimationFrame(loop);
    };

    const start = async () => {
      await initCamera();
      await initModel();

      rafId =
        requestAnimationFrame(loop);
    };

    start();

    return () =>
      cancelAnimationFrame(rafId);
  }, []);

  return (
    <main className="fixed inset-0 bg-black overflow-hidden">
      {/* camera stream (hidden but active) */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="hidden"
      />

      {/* output canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full"
      />
    </main>
  );
}
