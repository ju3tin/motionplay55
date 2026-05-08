"use client";

import { useEffect, useRef } from "react";

import * as tf from "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-webgl";

import * as poseDetection from "@tensorflow-models/pose-detection";

export default function Page() {
  const videoRef = useRef<HTMLVideoElement>(null);

  const canvasRef =
    useRef<HTMLCanvasElement>(null);

  const detectorRef =
    useRef<poseDetection.PoseDetector | null>(
      null
    );

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const setup = async () => {
      await tf.setBackend("webgl");
      await tf.ready();

      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",

            // IMPORTANT:
            // Match phone screen shape
            aspectRatio: 9 / 16,

            width: {
              ideal: 1080,
            },

            height: {
              ideal: 1920,
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

      if (!detector || !video || !canvas)
        return;

      if (video.readyState !== 4) return;

      const ctx = canvas.getContext("2d");

      if (!ctx) return;

      // Fullscreen canvas
      const cw = window.innerWidth;
      const ch = window.innerHeight;

      canvas.width = cw;
      canvas.height = ch;

      ctx.clearRect(0, 0, cw, ch);

      // Mirror selfie camera
      ctx.save();

      ctx.scale(-1, 1);
      ctx.translate(-cw, 0);

      // FULLSCREEN VIDEO
      // NO MANUAL SCALING
      // NO CROP MATH
      ctx.drawImage(video, 0, 0, cw, ch);

      // Detect poses
      const poses =
        await detector.estimatePoses(video);

      // Scale pose points to fullscreen
      const scaleX =
        cw / video.videoWidth;

      const scaleY =
        ch / video.videoHeight;

      poses.forEach((pose) => {
        pose.keypoints.forEach((kp) => {
          if (
            kp.score &&
            kp.score > 0.4
          ) {
            const x = kp.x * scaleX;

            const y = kp.y * scaleY;

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
          .forEach((track) =>
            track.stop()
          );
      }
    };
  }, []);

  return (
    <main className="fixed inset-0 bg-black">
      {/* Hidden camera source */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="hidden"
      />

      {/* Fullscreen canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full"
      />
    </main>
  );
}
