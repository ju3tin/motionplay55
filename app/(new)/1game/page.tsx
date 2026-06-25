"use client";

import { useEffect, useRef, useState } from "react";

interface Keypoint {
  x: number;
  y: number;
  score: number;
  name: string;
}

interface SavedPose {
  name: string;
  pose: {
    x: number;
    y: number;
  }[];
}

const SKELETON_CONNECTIONS: [number, number][] = [
  [0, 1], [0, 2], [1, 3], [2, 4],
  [5, 6],
  [5, 7], [7, 9],
  [6, 8], [8, 10],
  [5, 11], [6, 12],
  [11, 12],
  [11, 13], [13, 15],
  [12, 14], [14, 16],
];

export default function PoseCapturePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const modelRef = useRef<any>(null);
  const keypointsRef = useRef<Keypoint[]>([]);
  const rafRef = useRef<number>(0);

  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("Loading TensorFlow...");
  const [poseName, setPoseName] = useState("");
  const [savedPoses, setSavedPoses] = useState<SavedPose[]>([]);

  function normalizePose(keypoints: Keypoint[]) {
    const leftHip = keypoints[11];
    const rightHip = keypoints[12];

    if (!leftHip || !rightHip) return null;

    const centerX = (leftHip.x + rightHip.x) / 2;
    const centerY = (leftHip.y + rightHip.y) / 2;

    const leftShoulder = keypoints[5];
    const rightShoulder = keypoints[6];

    const torsoSize =
      Math.hypot(
        ((leftShoulder.x + rightShoulder.x) / 2) - centerX,
        ((leftShoulder.y + rightShoulder.y) / 2) - centerY
      ) || 1;

    return keypoints.map((kp) => ({
      x: (kp.x - centerX) / torsoSize,
      y: (kp.y - centerY) / torsoSize,
    }));
  }

  function saveCurrentPose() {
    const pose = normalizePose(keypointsRef.current);

    if (!pose) {
      alert("No pose detected.");
      return;
    }

    const entry: SavedPose = {
      name: poseName || `Pose ${savedPoses.length + 1}`,
      pose,
    };

    setSavedPoses((p) => [...p, entry]);
    setPoseName("");
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const tf = await import("@tensorflow/tfjs");
        await import("@tensorflow/tfjs-backend-webgl");

        await tf.setBackend("webgl");
        await tf.ready();

        const pd = await import("@tensorflow-models/pose-detection");

        const detector = await pd.createDetector(
          pd.SupportedModels.MoveNet,
          {
            modelType:
              pd.movenet.modelType.SINGLEPOSE_LIGHTNING,
          }
        );

        if (cancelled) return;

        modelRef.current = detector;

        const stream =
          await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: "user",
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          });

        const video = videoRef.current!;

        video.srcObject = stream;

        await new Promise<void>((res) => {
          video.onloadedmetadata = () => res();
        });

        await video.play();

        setReady(true);
        setStatus("");
      } catch (err: any) {
        setStatus(err.message);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;

    let active = true;

    const loop = async () => {
      while (active) {
        try {
          const poses =
            await modelRef.current.estimatePoses(
              videoRef.current
            );

          if (poses?.length) {
            keypointsRef.current =
              poses[0].keypoints;
          }
        } catch {}

        await new Promise((r) =>
          setTimeout(r, 80)
        );
      }
    };

    loop();

    return () => {
      active = false;
    };
  }, [ready]);

  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;

      if (!canvas) return;

      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();

    window.addEventListener(
      "resize",
      resize
    );

    return () =>
      window.removeEventListener(
        "resize",
        resize
      );
  }, []);

  useEffect(() => {
    if (!ready) return;

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    const draw = () => {
      rafRef.current =
        requestAnimationFrame(draw);

      const video = videoRef.current!;

      if (video.readyState < 2) return;

      const vw = video.videoWidth;
      const vh = video.videoHeight;

      const cw = canvas.width;
      const ch = canvas.height;

      const scale = Math.min(
        cw / vw,
        ch / vh
      );

      const dw = vw * scale;
      const dh = vh * scale;

      const dx = (cw - dw) / 2;
      const dy = (ch - dh) / 2;

      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, cw, ch);

      ctx.save();
      ctx.translate(dx + dw, dy);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, dw, dh);
      ctx.restore();

      const kps = keypointsRef.current;

      const toCanvas = (kp: Keypoint) => ({
        x: dx + dw - kp.x * scale,
        y: dy + kp.y * scale,
      });

      for (const [a, b] of SKELETON_CONNECTIONS) {
        const ka = kps[a];
        const kb = kps[b];

        if (
          !ka ||
          !kb ||
          ka.score < 0.3 ||
          kb.score < 0.3
        )
          continue;

        const pa = toCanvas(ka);
        const pb = toCanvas(kb);

        ctx.strokeStyle = "#00ffcc";
        ctx.lineWidth = 6;
        ctx.lineCap = "round";

        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.stroke();
      }

      for (const kp of kps) {
        if (kp.score < 0.3) continue;

        const p = toCanvas(kp);

        ctx.fillStyle = "#fff";

        ctx.beginPath();
        ctx.arc(
          p.x,
          p.y,
          8,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    };

    draw();

    return () =>
      cancelAnimationFrame(
        rafRef.current
      );
  }, [ready]);

  const exportedJson = JSON.stringify(
    savedPoses,
    null,
    2
  );

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        position: "relative",
        background: "#000",
      }}
    >
      <video
        ref={videoRef}
        muted
        playsInline
        style={{ display: "none" }}
      />

      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
        }}
      />

      <div
        style={{
          position: "absolute",
          top: 20,
          left: 20,
          width: 420,
          background: "#111",
          padding: 16,
          borderRadius: 12,
          color: "#fff",
          fontFamily: "monospace",
        }}
      >
        <h3>Pose Capture</h3>

        <input
          value={poseName}
          onChange={(e) =>
            setPoseName(e.target.value)
          }
          placeholder="Pose name"
          style={{
            width: "100%",
            marginBottom: 8,
          }}
        />

        <button
          onClick={saveCurrentPose}
          style={{
            width: "100%",
            padding: 12,
            cursor: "pointer",
          }}
        >
          Save Pose
        </button>

        <p>
          Saved: {savedPoses.length}
        </p>

        <textarea
          readOnly
          value={exportedJson}
          style={{
            width: "100%",
            height: 260,
            background: "#000",
            color: "#0f0",
          }}
        />
      </div>

      {status && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            background: "#000",
            color: "#fff",
          }}
        >
          {status}
        </div>
      )}
    </div>
  );
}
