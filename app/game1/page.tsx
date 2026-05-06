'use client';

import { useEffect, useRef, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as posedetection from '@tensorflow-models/pose-detection';
import '@tensorflow/tfjs-backend-webgl';

export default function Page() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [detector, setDetector] = useState<posedetection.PoseDetector | null>(null);
  const [score, setScore] = useState(0);
  const [jumping, setJumping] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const handleResize = () => {
      setCanvasSize({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const init = async () => {
      await tf.setBackend('webgl');

      // Load MoveNet detector
      const detector = await posedetection.createDetector(
        posedetection.SupportedModels.MoveNet,
        { modelType: posedetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
      );
      setDetector(detector);

      // Setup webcam
      if (videoRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      requestAnimationFrame(runDetection);
    };

    const runDetection = async () => {
      if (!detector || !videoRef.current || !canvasRef.current) {
        requestAnimationFrame(runDetection);
        return;
      }

      const video = videoRef.current;
      const poses = await detector.estimatePoses(video);
      drawCanvas(poses);

      // Game logic: detect jump
      if (poses[0]) {
        const keypoints = poses[0].keypoints;
        const nose = keypoints.find(k => k.name === 'nose');
        const leftAnkle = keypoints.find(k => k.name === 'left_ankle');
        const rightAnkle = keypoints.find(k => k.name === 'right_ankle');

        if (
          nose &&
          leftAnkle &&
          rightAnkle &&
          nose.y !== undefined &&
          leftAnkle.y !== undefined &&
          rightAnkle.y !== undefined
        ) {
          const avgAnkleY = (leftAnkle.y + rightAnkle.y) / 2;
          // Jump detected
          if (nose.y < avgAnkleY - 50 && !jumping) {
            setJumping(true);
            setScore(prev => prev + 1);
          } else if (nose.y >= avgAnkleY - 50 && jumping) {
            setJumping(false);
          }
        }
      }

      requestAnimationFrame(runDetection);
    };

    const drawCanvas = (poses: posedetection.Pose[]) => {
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext('2d')!;
      const video = videoRef.current!;

      // Calculate scale to maintain aspect ratio
      const videoAspect = video.videoWidth / video.videoHeight;
      const windowAspect = canvasSize.width / canvasSize.height;

      let drawWidth = canvasSize.width;
      let drawHeight = canvasSize.height;

      if (windowAspect > videoAspect) {
        drawWidth = canvasSize.height * videoAspect;
      } else {
        drawHeight = canvasSize.width / videoAspect;
      }

      canvas.width = drawWidth;
      canvas.height = drawHeight;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Draw keypoints
      poses.forEach(pose => {
        pose.keypoints.forEach(k => {
          if ((k.score ?? 0) > 0.3 && k.x !== undefined && k.y !== undefined) {
            // Scale keypoints to canvas size
            const x = (k.x / video.videoWidth) * canvas.width;
            const y = (k.y / video.videoHeight) * canvas.height;
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, 2 * Math.PI);
            ctx.fillStyle = 'red';
            ctx.fill();
          }
        });
      });

      // Draw score
      ctx.fillStyle = 'yellow';
      ctx.font = '30px Arial';
      ctx.fillText(`Score: ${score}`, 20, 40);
    };

    init();
  }, [detector, jumping, score, canvasSize]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white overflow-hidden">
      <h1 className="text-3xl font-bold mb-4 z-10 relative">Jump Game 🕹️</h1>
      <div className="relative w-full h-full">
        <video
          ref={videoRef}
          className="absolute top-0 left-0 w-full h-full"
          style={{ transform: 'scaleX(-1)', display: 'none' }} // hide raw video
        />
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0"
          style={{ width: '100%', height: '100%' }}
        />
      </div>
      <p className="mt-4 z-10 relative">Jump to score points! Your score: {score}</p>
    </div>
  );
}
