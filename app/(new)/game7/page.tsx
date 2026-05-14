"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

import * as tf from "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-webgl";

import * as poseDetection from "@tensorflow-models/pose-detection";

type KP = poseDetection.Keypoint;

export default function Page() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const detectorRef =
    useRef<poseDetection.PoseDetector | null>(null);

  const prevPoseRef = useRef<KP[] | null>(null);

  const stateRef = useRef({
    reps: 0,
    inPosition: false,
    plankStart: 0,
    holding: false,
  });

  const searchParams = useSearchParams();
  const exercise = searchParams?.get("exercise") ?? "squat";

  useEffect(() => {
    let rafId: number;

    const smooth = (a: number, b: number) =>
      a * 0.7 + b * 0.3;

    const angle = (
      a: KP,
      b: KP,
      c: KP
    ) => {
      const ab = {
        x: a.x - b.x,
        y: a.y - b.y,
      };

      const cb = {
        x: c.x - b.x,
        y: c.y - b.y,
      };

      const dot =
        ab.x * cb.x + ab.y * cb.y;

      const mag1 = Math.hypot(
        ab.x,
        ab.y
      );

      const mag2 = Math.hypot(
        cb.x,
        cb.y
      );

      return (
        Math.acos(
          dot / (mag1 * mag2)
        ) *
        (180 / Math.PI)
      );
    };

    const setup = async () => {
      await tf.setBackend("webgl");
      await tf.ready();

      const stream =
        await navigator.mediaDevices.getUserMedia(
          {
            video: {
              facingMode: "user",
            },
            audio: false,
          }
        );

      const video = videoRef.current!;
      video.srcObject = stream;

      await new Promise<void>((r) => {
        video.onloadedmetadata = () =>
          r();
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

      loop();
    };

    const loop = async () => {
      await detect();
      rafId =
        requestAnimationFrame(loop);
    };

    const detect = async () => {
      const detector =
        detectorRef.current;

      const video =
        videoRef.current;

      const canvas =
        canvasRef.current;

      if (
        !detector ||
        !video ||
        !canvas
      )
        return;

      const ctx =
        canvas.getContext("2d");

      if (!ctx) return;

      const cw =
        window.innerWidth;

      const ch =
        window.innerHeight;

      canvas.width = cw;
      canvas.height = ch;

      const poses =
        await detector.estimatePoses(
          video
        );

      if (!poses.length) return;

      const pose = poses[0];

      // smoothing
      if (prevPoseRef.current) {
        pose.keypoints.forEach(
          (kp, i) => {
            const prev =
              prevPoseRef.current?.[i];

            if (prev) {
              kp.x = smooth(
                prev.x,
                kp.x
              );

              kp.y = smooth(
                prev.y,
                kp.y
              );
            }
          }
        );
      }

      prevPoseRef.current =
        pose.keypoints;

      // joints
      const lHip = pose.keypoints[11];
      const lKnee = pose.keypoints[13];
      const lAnkle =
        pose.keypoints[15];

      const lShoulder =
        pose.keypoints[5];
      const lElbow =
        pose.keypoints[7];
      const lWrist =
        pose.keypoints[9];

      // =========================
      // EXERCISE LOGIC ENGINE
      // =========================

      if (
        exercise === "squat"
      ) {
        const kneeAngle =
          angle(
            lHip,
            lKnee,
            lAnkle
          );

        if (kneeAngle < 100) {
          stateRef.current.inPosition =
            true;
        }

        if (
          stateRef.current
            .inPosition &&
          kneeAngle > 150
        ) {
          stateRef.current.reps++;
          stateRef.current.inPosition =
            false;
        }
      }

      if (
        exercise === "pushup"
      ) {
        const elbowAngle =
          angle(
            lShoulder,
            lElbow,
            lWrist
          );

        if (elbowAngle < 90) {
          stateRef.current.inPosition =
            true;
        }

        if (
          stateRef.current
            .inPosition &&
          elbowAngle > 160
        ) {
          stateRef.current.reps++;
          stateRef.current.inPosition =
            false;
        }
      }

      if (
        exercise === "plank"
      ) {
        if (
          !stateRef.current
            .holding
        ) {
          stateRef.current.plankStart =
            Date.now();

          stateRef.current.holding =
            true;
        }
      }

      // =========================
      // RENDERING
      // =========================

      ctx.clearRect(
        0,
        0,
        cw,
        ch
      );

      ctx.save();
      ctx.scale(-1, 1);
      ctx.translate(-cw, 0);

      drawSkeleton(ctx, pose);

      ctx.restore();

      // HUD
      ctx.fillStyle =
        "white";

      ctx.font =
        "20px sans-serif";

      if (
        exercise === "plank"
      ) {
        const time =
          stateRef.current.holding
            ? Math.floor(
                (Date.now() -
                  stateRef.current
                    .plankStart) /
                  1000
              )
            : 0;

        ctx.fillText(
          `PLANK: ${time}s`,
          20,
          40
        );
      } else {
        ctx.fillText(
          `${exercise.toUpperCase()} REPS: ${
            stateRef.current.reps
          }`,
          20,
          40
        );
      }
    };

    const drawSkeleton = (
      ctx: CanvasRenderingContext2D,
      pose: poseDetection.Pose
    ) => {
      const k = pose.keypoints;

      const line = (
        a: number,
        b: number
      ) => {
        const p1 = k[a];
        const p2 = k[b];

        if (
          p1.score! > 0.4 &&
          p2.score! > 0.4
        ) {
          ctx.beginPath();
          ctx.moveTo(
            p1.x,
            p1.y
          );

          ctx.lineTo(
            p2.x,
            p2.y
          );

          ctx.strokeStyle =
            "#00ff00";

          ctx.lineWidth = 2;

          ctx.stroke();
        }
      };

      // legs
      line(11, 13);
      line(13, 15);

      // arms
      line(5, 7);
      line(7, 9);

      // torso
      line(5, 11);
      line(6, 12);
      line(5, 6);
    };

    setup();

    return () => {
      cancelAnimationFrame(
        rafId
      );

      const video =
        videoRef.current;

      if (video?.srcObject) {
        (
          video.srcObject as MediaStream
        )
          .getTracks()
          .forEach((t) =>
            t.stop()
          );
      }
    };
  }, [exercise]);

  return (
    <main className="fixed inset-0 bg-black">
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="hidden"
      />

      <canvas
        ref={canvasRef}
        className="w-full h-full"
      />
    </main>
  );
}
