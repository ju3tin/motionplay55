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

      tf.env().set("WEBGL_PACK", true);

      // FRONT CAMERA
      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",

            // Keep aspect ratio natural
            aspectRatio: {
              ideal: 9 / 16,
            },

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

      const poses =
        await detector.estimatePoses(video);

      const ctx = canvas.getContext("2d");

      if (!ctx) return;

      // REAL displayed dimensions
      const displayWidth = video.clientWidth;
      const displayHeight = video.clientHeight;

      // Match canvas to displayed video size
      if (
        canvas.width !== displayWidth ||
        canvas.height !== displayHeight
      ) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // MIRROR for selfie camera
      ctx.save();
      ctx.scale(-1, 1);
      ctx.translate(-canvas.width, 0);

      // Scale pose coords correctly
      const scaleX =
        canvas.width / video.videoWidth;

      const scaleY =
        canvas.height / video.videoHeight;

      poses.forEach((pose) => {
        pose.keypoints.forEach((kp) => {
          if (kp.score && kp.score > 0.4) {
            ctx.beginPath();

            ctx.arc(
              kp.x * scaleX,
              kp.y * scaleY,
              5,
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
    <main className="relative w-screen h-screen bg-black overflow-hidden">
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="
          absolute inset-0
          w-full h-full
          object-contain
          scale-x-[-1]
        "
      />

      <canvas
        ref={canvasRef}
        className="
          absolute inset-0
          w-full h-full
          pointer-events-none
        "
      />
    </main>
  );
}
