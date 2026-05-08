"use client";

import { useEffect, useRef } from "react";

import * as tf from "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-webgl";

import * as poseDetection from "@tensorflow-models/pose-detection";

export default function Page() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const detectorRef =
    useRef<poseDetection.PoseDetector | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const setup = async () => {
      await tf.setBackend("webgl");
      await tf.ready();

      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",

            width: {
              ideal: 720,
            },

            height: {
              ideal: 1280,
            },
          },

          audio: false,
        });

      const video = videoRef.current;

      if (!video) return;

      video.srcObject = stream;

      await video.play();

      detectorRef.current =
        await poseDetection.createDetector(
          poseDetection.SupportedModels.MoveNet,
          {
            modelType:
              poseDetection.movenet.modelType
                .SINGLEPOSE_LIGHTNING,
          }
        );

      interval = setInterval(detect, 100);
    };

    const detect = async () => {
      const detector = detectorRef.current;
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (!detector || !video || !canvas) return;

      if (video.readyState !== 4) return;

      const ctx = canvas.getContext("2d");

      if (!ctx) return;

      // FULLSCREEN CANVAS
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      const cw = canvas.width;
      const ch = canvas.height;

      const vw = video.videoWidth;
      const vh = video.videoHeight;

      // COVER math (like object-cover)
      const scale = Math.max(cw / vw, ch / vh);

      const drawWidth = vw * scale;
      const drawHeight = vh * scale;

      const offsetX = (cw - drawWidth) / 2;
      const offsetY = (ch - drawHeight) / 2;

      ctx.clearRect(0, 0, cw, ch);

      // MIRROR selfie camera
      ctx.save();

      ctx.scale(-1, 1);
      ctx.translate(-cw, 0);

      // DRAW VIDEO INTO CANVAS
      ctx.drawImage(
        video,
        offsetX,
        offsetY,
        drawWidth,
        drawHeight
      );

      // POSE DETECTION
      const poses =
        await detector.estimatePoses(video);

      poses.forEach((pose) => {
        pose.keypoints.forEach((kp) => {
          if (kp.score && kp.score > 0.4) {
            const x =
              offsetX + kp.x * scale;

            const y =
              offsetY + kp.y * scale;

            ctx.beginPath();

            ctx.arc(
              x,
              y,
              6,
              0,
              Math.PI * 2
            );

            ctx.fillStyle = "#00ff00";
            ctx.fill();
          }
        });
      });

      ctx.restore();
    };

    setup();

    return () => {
      clearInterval(interval);

      const video = videoRef.current;

      if (video?.srcObject) {
        const stream =
          video.srcObject as MediaStream;

        stream
          .getTracks()
          .forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <main className="fixed inset-0 bg-black">
      {/* hidden raw video */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="hidden"
      />

      {/* fullscreen render */}
      <canvas
        ref={canvasRef}
        className="w-full h-full"
      />
    </main>
  );
}
