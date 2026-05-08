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

  let last = 0;

  useEffect(() => {
    let raf: number;

    // -----------------------------
    // CAMERA
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
        (r) =>
          (video.onloadedmetadata =
            () => r())
      );

      await video.play();
    };

    // -----------------------------
    // MODEL
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
    // FULL 33-POINT SKELETON
    // -----------------------------
    const connections = [
      [11, 12],
      [11, 13],
      [13, 15],
      [12, 14],
      [14, 16],

      [11, 23],
      [12, 24],

      [23, 24],

      [23, 25],
      [25, 27],
      [27, 29],
      [29, 31],

      [24, 26],
      [26, 28],
      [28, 30],
      [30, 32],
    ];

    // -----------------------------
    // DRAW (FIXED SCALING)
    // -----------------------------
    const draw = (
      ctx: CanvasRenderingContext2D,
      lm: any,
      vw: number,
      vh: number,
      cw: number,
      ch: number
    ) => {
      const scale =
        Math.max(
          cw / vw,
          ch / vh
        ); // cover (NOT contain)

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

      ctx.strokeStyle =
        "#00ff00";

      ctx.lineWidth = 2;

      for (
        const [a, b] of connections
      ) {
        const p1 = lm[a];
        const p2 = lm[b];

        if (!p1 || !p2) continue;

        ctx.beginPath();
        ctx.moveTo(
          X(p1),
          Y(p1)
        );
        ctx.lineTo(
          X(p2),
          Y(p2)
        );
        ctx.stroke();
      }
    };

    // -----------------------------
    // LOOP
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
        raf =
          requestAnimationFrame(loop);
        return;
      }

      if (t - last < 66) {
        raf =
          requestAnimationFrame(loop);
        return;
      }

      last = t;

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
        raf =
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
        draw(
          ctx,
          result.landmarks[0],
          video.videoWidth,
          video.videoHeight,
          cw,
          ch
        );
      }

      ctx.restore();

      raf =
        requestAnimationFrame(loop);
    };

    const start = async () => {
      await initCamera();
      await initModel();
      raf =
        requestAnimationFrame(loop);
    };

    start();

    return () =>
      cancelAnimationFrame(raf);
  }, []);

  return (
    <main className="fixed inset-0 bg-black overflow-hidden">
      {/* 👇 NOW YOU CAN SEE CAMERA */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
      />

      {/* overlay */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />
    </main>
  );
}
