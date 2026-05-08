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
          },

          audio: false,
        });

      const video = videoRef.current;

      if (!video) return;

      video.srcObject = stream;

      // WAIT FOR REAL CAMERA SIZE
      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => {
          resolve();
        };
      });

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

      const ctx = canvas.getContext("2d");

      if (!ctx) return;

      // REAL screen size
      const screenWidth =
        window.innerWidth;

      const screenHeight =
        window.innerHeight;

      // REAL camera size
      const videoWidth =
        video.videoWidth;

      const videoHeight =
        video.videoHeight;

      // Resize canvas
      canvas.width = screenWidth;
      canvas.height = screenHeight;

      // Aspect ratios
      const videoAspect =
        videoWidth / videoHeight;

      const screenAspect =
        screenWidth / screenHeight;

      let drawWidth = screenWidth;
      let drawHeight = screenHeight;

      let offsetX = 0;
      let offsetY = 0;

      // PERFECT FIT WITHOUT STRETCHING
      if (videoAspect > screenAspect) {
        // video wider than screen
        drawWidth =
          screenHeight * videoAspect;

        drawHeight = screenHeight;

        offsetX =
          (screenWidth - drawWidth) / 2;
      } else {
        // video taller than screen
        drawWidth = screenWidth;

        drawHeight =
          screenWidth / videoAspect;

        offsetY =
          (screenHeight - drawHeight) / 2;
      }

      ctx.clearRect(
        0,
        0,
        screenWidth,
        screenHeight
      );

      // Mirror front camera
      ctx.save();

      ctx.scale(-1, 1);

      ctx.translate(-screenWidth, 0);

      // Draw camera correctly
      ctx.drawImage(
        video,
        offsetX,
        offsetY,
        drawWidth,
        drawHeight
      );

      // Pose detection
      const poses =
        await detector.estimatePoses(video);

      // Scale keypoints
      const scaleX =
        drawWidth / videoWidth;

      const scaleY =
        drawHeight / videoHeight;

      poses.forEach((pose) => {
        pose.keypoints.forEach((kp) => {
          if (
            kp.score &&
            kp.score > 0.4
          ) {
            const x =
              offsetX + kp.x * scaleX;

            const y =
              offsetY + kp.y * scaleY;

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
    <main className="fixed inset-0 bg-black overflow-hidden">
      {/* hidden source */}
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
