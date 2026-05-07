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
      // Better mobile precision/performance
      await tf.setBackend("webgl");
      await tf.ready();

      tf.env().set("WEBGL_PACK", true);

      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: 256,
            height: 256,
          },
          audio: false,
        });

      const video = videoRef.current!;

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

      const poses =
        await detector.estimatePoses(video);

      const ctx = canvas.getContext("2d");

      if (!ctx) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      poses.forEach((pose) => {
        pose.keypoints.forEach((kp) => {
          if (kp.score && kp.score > 0.4) {
            ctx.beginPath();
            ctx.arc(kp.x, kp.y, 4, 0, Math.PI * 2);

            ctx.fillStyle = "#00ff00";
            ctx.fill();
          }
        });
      });
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
        className="absolute inset-0 w-full h-full object-cover"
      />

      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />
    </main>
  );
}
