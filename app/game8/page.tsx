"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

import {
  PoseLandmarker,
  FilesetResolver,
} from "@mediapipe/tasks-vision";

export default function Page() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const landmarkerRef =
    useRef<PoseLandmarker | null>(null);

  const searchParams = useSearchParams();

  const exercise =
    searchParams.get("exercise") ?? "squat";

  const state = useRef({
    ready: false,
    reps: 0,
    plankStart: 0,
  });

  useEffect(() => {
    let raf: number;

    const initCamera = async () => {
      const video = videoRef.current;
      if (!video) return;

      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
          },
          audio: false,
        });

      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;

      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () =>
          resolve();
      });

      await video.play();

      console.log("Camera ready:", {
        w: video.videoWidth,
        h: video.videoHeight,
      });

      state.current.ready = true;
    };

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
                "https://storage.googleapis.com/mediapipe-models/pose_landmarker/lite/float16/1/pose_landmarker_lite.task",
            },
            runningMode: "VIDEO",
            numPoses: 1,
          }
        );
    };

    const loop = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const landmarker =
        landmarkerRef.current;

      if (
        !video ||
        !canvas ||
        !landmarker
      ) {
        raf = requestAnimationFrame(loop);
        return;
      }

      // 🚨 WAIT UNTIL CAMERA IS READY
      if (
        !state.current.ready ||
        video.videoWidth === 0
      ) {
        raf = requestAnimationFrame(loop);
        return;
      }

      const ctx =
        canvas.getContext("2d");

      if (!ctx) return;

      const cw =
        window.innerWidth;

      const ch =
        window.innerHeight;

      canvas.width = cw;
      canvas.height = ch;

      const result =
        landmarker.detectForVideo(
          video,
          performance.now()
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
        const lm =
          result.landmarks[0];

        drawSkeleton(ctx, lm);
      }

      ctx.restore();

      raf = requestAnimationFrame(loop);
    };

    const drawSkeleton = (
      ctx: CanvasRenderingContext2D,
      lm: any
    ) => {
      const line = (a: number, b: number) => {
        const p1 = lm[a];
        const p2 = lm[b];

        if (!p1 || !p2) return;

        ctx.beginPath();
        ctx.moveTo(
          p1.x * window.innerWidth,
          p1.y * window.innerHeight
        );

        ctx.lineTo(
          p2.x * window.innerWidth,
          p2.y * window.innerHeight
        );

        ctx.strokeStyle =
          "#00ff00";

        ctx.lineWidth = 2;

        ctx.stroke();
      };

      // body
      line(11, 13);
      line(13, 15);

      line(12, 14);
      line(14, 16);

      line(11, 23);
      line(12, 24);

      line(23, 25);
      line(25, 27);
    };

    const start = async () => {
      await initCamera();
      await initModel();
      loop();
    };

    start();

    return () =>
      cancelAnimationFrame(raf);
  }, [exercise]);

  return (
    <main className="fixed inset-0 bg-black overflow-hidden">
      {/* CAMERA */}
      <video
        ref={videoRef}
        playsInline
        autoPlay
        muted
        className="hidden"
      />

      {/* RENDER */}
      <canvas
        ref={canvasRef}
        className="w-full h-full"
      />
    </main>
  );
}
