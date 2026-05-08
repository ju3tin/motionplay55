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
    reps: 0,
    inRep: false,
    plankStart: 0,
    score: 100,
    lastSpeak: 0,
  });

  const speak = (text: string) => {
    if (!("speechSynthesis" in window)) return;

    const now = Date.now();
    if (now - state.current.lastSpeak < 2000)
      return;

    state.current.lastSpeak = now;

    const msg = new SpeechSynthesisUtterance(
      text
    );

    msg.rate = 1;

    speechSynthesis.speak(msg);
  };

  useEffect(() => {
    let raf: number;

    const setup = async () => {
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

      const stream =
        await navigator.mediaDevices.getUserMedia(
          {
            video: {
              facingMode: "user",
            },
          }
        );

      const video = videoRef.current!;
      video.srcObject = stream;

      await video.play();

      loop();
    };

    const loop = async () => {
      await detect();
      raf = requestAnimationFrame(loop);
    };

    const detect = async () => {
      const landmarker =
        landmarkerRef.current;

      const video =
        videoRef.current;

      const canvas =
        canvasRef.current;

      if (
        !landmarker ||
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

      const result =
        landmarker.detectForVideo(
          video,
          performance.now()
        );

      if (
        !result.landmarks?.length
      )
        return;

      const lm =
        result.landmarks[0];

      ctx.clearRect(
        0,
        0,
        cw,
        ch
      );

      ctx.save();
      ctx.scale(-1, 1);
      ctx.translate(-cw, 0);

      drawSkeleton(ctx, lm);

      ctx.restore();

      runExerciseLogic(lm);
    };

    const angle = (
      a: any,
      b: any,
      c: any
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
        ab.x * cb.x +
        ab.y * cb.y;

      return (
        Math.acos(
          dot /
            (Math.hypot(
              ab.x,
              ab.y
            ) *
              Math.hypot(
                cb.x,
                cb.y
              ))
        ) *
        (180 / Math.PI)
      );
    };

    const runExerciseLogic = (
      lm: any
    ) => {
      const hip = lm[23];
      const knee = lm[25];
      const ankle = lm[27];

      const shoulder = lm[11];
      const elbow = lm[13];
      const wrist = lm[15];

      // ---------------- SQUAT ----------------
      if (exercise === "squat") {
        const a =
          angle(
            hip,
            knee,
            ankle
          );

        if (a < 100)
          state.current.inRep =
            true;

        if (
          state.current.inRep &&
          a > 160
        ) {
          state.current.reps++;
          state.current.inRep = false;

          speak("Good squat");
        }

        state.current.score =
          Math.max(
            0,
            100 - Math.abs(130 - a)
          );
      }

      // ---------------- PUSHUP ----------------
      if (exercise === "pushup") {
        const a =
          angle(
            shoulder,
            elbow,
            wrist
          );

        if (a < 90)
          state.current.inRep =
            true;

        if (
          state.current.inRep &&
          a > 160
        ) {
          state.current.reps++;
          state.current.inRep = false;

          speak("Nice pushup");
        }

        state.current.score =
          Math.max(
            0,
            100 - Math.abs(120 - a)
          );
      }

      // ---------------- PLANK ----------------
      if (exercise === "plank") {
        if (!state.current.plankStart)
          state.current.plankStart =
            Date.now();

        const t =
          (Date.now() -
            state.current.plankStart) /
          1000;

        state.current.score =
          t > 5 ? 100 : 70;

        if (t % 10 < 0.1)
          speak("Hold strong");
      }
    };

    const drawSkeleton = (
      ctx: CanvasRenderingContext2D,
      lm: any
    ) => {
      const line = (a: number, b: number) => {
        const p1 = lm[a];
        const p2 = lm[b];

        if (
          p1 &&
          p2
        ) {
          ctx.beginPath();
          ctx.moveTo(
            p1.x *
              window.innerWidth,
            p1.y *
              window.innerHeight
          );

          ctx.lineTo(
            p2.x *
              window.innerWidth,
            p2.y *
              window.innerHeight
          );

          ctx.strokeStyle =
            "#00ff00";

          ctx.lineWidth = 2;

          ctx.stroke();
        }
      };

      // arms
      line(11, 13);
      line(13, 15);

      // legs
      line(23, 25);
      line(25, 27);

      // torso
      line(11, 23);
      line(12, 24);
    };

    setup();

    return () =>
      cancelAnimationFrame(raf);
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

      {/* HUD */}
      <div className="absolute top-4 left-4 text-white text-lg">
        {exercise.toUpperCase()}
        <br />
        REPS:{" "}
        {state.current.reps}
        <br />
        SCORE:{" "}
        {state.current.score}
      </div>
    </main>
  );
}
