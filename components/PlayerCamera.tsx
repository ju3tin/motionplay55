'use client';

import { useEffect, useRef } from 'react';

interface PlayerCameraProps {
  onPoseDetected?: (keypoints: any[]) => void;
  detector: any;
}

export default function PlayerCamera({ onPoseDetected, detector }: PlayerCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const startCamera = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 480, height: 360, facingMode: "user" }
      });
      if (videoRef.current) videoRef.current.srcObject = stream;
    };

    startCamera();
  }, []);

  // Detection loop (you can move this logic to a custom hook later)
  useEffect(() => {
    let raf: number;
    const run = async () => {
      if (detector && videoRef.current && canvasRef.current) {
        const poses = await detector.estimatePoses(videoRef.current);
        if (poses.length > 0 && onPoseDetected) {
          onPoseDetected(poses[0].keypoints);
        }
      }
      raf = requestAnimationFrame(run);
    };
    raf = requestAnimationFrame(run);

    return () => cancelAnimationFrame(raf);
  }, [detector, onPoseDetected]);

  return (
    <div className="relative bg-black rounded-3xl overflow-hidden aspect-video">
      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />
    </div>
  );
}
