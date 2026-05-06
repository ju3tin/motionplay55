"use client";

import { useEffect, useRef, useState } from "react";

interface Keypoint {
  x: number;
  y: number;
  score: number;
  name: string;
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

export default function MoveNetPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modelRef = useRef<any>(null);
  const keypointsRef = useRef<Keypoint[]>([]);
  const rafRef = useRef<number>(0);

  const [status, setStatus] = useState("Loading TensorFlow.js…");
  const [ready, setReady] = useState(false);

  // ── Load TF + MoveNet + Camera ─────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const tf = await import("@tensorflow/tfjs");
        await import("@tensorflow/tfjs-backend-webgl");
        await tf.setBackend("webgl");
        await tf.ready();
        if (cancelled) return;

        setStatus("Loading MoveNet model…");
        const pd = await import("@tensorflow-models/pose-detection");
        const detector = await pd.createDetector(
          pd.SupportedModels.MoveNet,
          { modelType: pd.movenet.modelType.SINGLEPOSE_LIGHTNING }
        );
        if (cancelled) return;
        modelRef.current = detector;

        setStatus("Requesting camera…");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }

        const video = videoRef.current!;
        video.srcObject = stream;
        await new Promise<void>((res) => { video.onloadedmetadata = () => res(); });
        await video.play();

        setReady(true);
        setStatus("");
      } catch (e: any) {
        if (!cancelled) setStatus("Error: " + e.message);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Pose estimation (separate interval so it doesn't block RAF) ────────────
  useEffect(() => {
    if (!ready) return;
    let active = true;
    const loop = async () => {
      while (active) {
        const video = videoRef.current;
        if (video && video.readyState >= 2 && modelRef.current) {
          try {
            const poses = await modelRef.current.estimatePoses(video);
            if (poses?.length) keypointsRef.current = poses[0].keypoints;
          } catch (_) {}
        }
        await new Promise((r) => setTimeout(r, 80));
      }
    };
    loop();
    return () => { active = false; };
  }, [ready]);

  // ── Canvas resize ──────────────────────────────────────────────────────────
  useEffect(() => {
    const resize = () => {
      const c = canvasRef.current;
      if (!c) return;
      c.width = window.innerWidth;
      c.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // ── Render loop ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!ready) return;

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);

      const video = videoRef.current!;
      if (video.readyState < 2) return;

      const vw = video.videoWidth;
      const vh = video.videoHeight;
      const cw = canvas.width;
      const ch = canvas.height;

      // contain: fit video keeping aspect ratio, centred
      const scale = Math.min(cw / vw, ch / vh);
      const dw = vw * scale;
      const dh = vh * scale;
      const dx = (cw - dw) / 2;
      const dy = (ch - dh) / 2;

      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, cw, ch);

      // mirrored video
      ctx.save();
      ctx.translate(dx + dw, dy);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, dw, dh);
      ctx.restore();

      const kps = keypointsRef.current;
      if (!kps.length) return;

      // map kp coords → canvas (accounting for mirror + letterbox)
      const toCanvas = (kp: Keypoint) => ({
        x: dx + dw - kp.x * scale,
        y: dy + kp.y * scale,
      });

      // bones
      const boneWidth = Math.max(2, scale * 2.5);
      for (const [a, b] of SKELETON_CONNECTIONS) {
        const ka = kps[a], kb = kps[b];
        if (!ka || !kb || ka.score < 0.3 || kb.score < 0.3) continue;
        const pa = toCanvas(ka), pb = toCanvas(kb);
        const grad = ctx.createLinearGradient(pa.x, pa.y, pb.x, pb.y);
        grad.addColorStop(0, "#00ffcc");
        grad.addColorStop(1, "#7b61ff");
        ctx.save();
        ctx.lineWidth = boneWidth;
        ctx.lineCap = "round";
        ctx.strokeStyle = grad;
        ctx.shadowColor = "#00ffcc88";
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.stroke();
        ctx.restore();
      }

      // joints
      const r = Math.max(4, scale * 4.5);
      for (const kp of kps) {
        if (kp.score < 0.3) continue;
        const { x, y } = toCanvas(kp);
        ctx.save();
        ctx.fillStyle = "#fff";
        ctx.shadowColor = "#fff";
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [ready]);

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#000", overflow: "hidden", position: "relative" }}>
      <video ref={videoRef} style={{ display: "none" }} muted playsInline />
      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />

      {status && (
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          background: "#000",
          color: "#fff",
          fontFamily: "ui-monospace, monospace",
          gap: 20,
        }}>
          <div style={{
            width: 38, height: 38,
            border: "3px solid #222",
            borderTopColor: "#00ffcc",
            borderRadius: "50%",
            animation: "spin 0.75s linear infinite",
          }} />
          <p style={{ margin: 0, fontSize: "0.9rem", color: "#666", letterSpacing: "0.12em" }}>{status}</p>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}
    </div>
  );
}
