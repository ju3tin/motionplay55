import styles from "@/styles/Home.module.css";
import { useEffect, useRef, useState } from 'react';
import { createDetector as createHandDetector, SupportedModels as HandModels } from "@tensorflow-models/hand-pose-detection";
import { drawHands } from "@/lib/utils3";
import Link from "next/link";
import { useAnimationFrame } from "@/lib/hooks/useAnimationFrame";

export default function CombinedPoseDetection() {
    const handDetectorRef = useRef<any>(null);
    const poseDetectorRef = useRef<any>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const keypointsRef = useRef<any[]>([]);

    const [ready, setReady] = useState(false);
    const [status, setStatus] = useState("Loading models...");

    // Dynamic import + setup (both detectors)
    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                // Core TF.js
                const tf = await import("@tensorflow/tfjs");
                await import("@tensorflow/tfjs-backend-webgl");
                await tf.setBackend("webgl");
                await tf.ready();

                if (cancelled) return;

                setStatus("Loading MoveNet...");
                
                // Pose Detector (MoveNet)
                const pd = await import("@tensorflow-models/pose-detection");
                poseDetectorRef.current = await pd.createDetector(
                    pd.SupportedModels.MoveNet,
                    { modelType: pd.movenet.modelType.SINGLEPOSE_LIGHTNING }
                );

                if (cancelled) return;

                setStatus("Loading Hand Detector...");
                
                // Hand Detector
                handDetectorRef.current = await createHandDetector(
                    HandModels.MediaPipeHands,
                    {
                        runtime: "mediapipe",
                        maxHands: 2,
                        solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/hands'
                    }
                );

                setStatus("Requesting camera...");
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }
                });

                if (cancelled) {
                    stream.getTracks().forEach(t => t.stop());
                    return;
                }

                const video = videoRef.current!;
                video.srcObject = stream;
                await new Promise<void>(res => { video.onloadedmetadata = () => res(); });
                await video.play();

                setReady(true);
                setStatus("");
            } catch (e: any) {
                if (!cancelled) setStatus("Error: " + e.message);
            }
        })();

        return () => { cancelled = true; };
    }, []);

    // Separate pose estimation loop (non-blocking)
    useEffect(() => {
        if (!ready) return;
        let active = true;

        const loop = async () => {
            while (active) {
                const video = videoRef.current;
                if (video?.readyState >= 2 && poseDetectorRef.current) {
                    try {
                        const poses = await poseDetectorRef.current.estimatePoses(video, { flipHorizontal: true });
                        if (poses?.length) {
                            keypointsRef.current = poses[0].keypoints;
                        }
                    } catch (_) {}
                }
                await new Promise(r => setTimeout(r, 66)); // ~15fps for pose
            }
        };
        loop();

        return () => { active = false; };
    }, [ready]);

    // Main render + hand detection loop
    useAnimationFrame(async () => {
        if (!ready || !canvasRef.current || !videoRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d')!;
        const video = videoRef.current;

        // Draw mirrored video
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
        ctx.restore();

        // Draw Hands
        if (handDetectorRef.current) {
            try {
                const hands = await handDetectorRef.current.estimateHands(video, { flipHorizontal: true });
                drawHands(hands, ctx);
            } catch (_) {}
        }

        // Draw Pose Keypoints (from background loop)
        const kps = keypointsRef.current;
        if (kps.length > 0) {
            drawKeypoints(kps, ctx, canvas);
        }
    }, ready);

    return (
        <div className={styles.container}>
            <main className={styles.main}>
                <h2 style={{ fontWeight: "normal" }}>
                    <Link style={{ fontWeight: "bold" }} href={'/'}>Home</Link> / Hand + Pose Detection
                </h2>
                <p>{status}</p>

                <canvas
                    ref={canvasRef}
                    style={{
                        transform: "scaleX(-1)",
                        borderRadius: "1rem",
                        boxShadow: "0 3px 10px rgb(0 0 0)",
                        maxWidth: "90vw",
                        background: "#000"
                    }}
                />

                <video
                    ref={videoRef}
                    style={{ display: "none" }}
                    playsInline
                />
            </main>
        </div>
    );
}

// Simple keypoint drawer
function drawKeypoints(keypoints: any[], ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
    ctx.strokeStyle = "#00ffcc";
    ctx.lineWidth = 4;

    // Example connections (expand as needed)
    const connections = [[0,1],[0,2],[1,3],[2,4],[5,6],[5,7],[6,8],[7,9],[8,10],[11,12],[11,13],[12,14],[13,15],[14,16]];
    
    connections.forEach(([i, j]) => {
        const a = keypoints[i];
        const b = keypoints[j];
        if (a?.score > 0.3 && b?.score > 0.3) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
        }
    });

    // Joints
    ctx.fillStyle = "#fff";
    keypoints.forEach(kp => {
        if (kp.score > 0.3) {
            ctx.beginPath();
            ctx.arc(kp.x, kp.y, 6, 0, Math.PI * 2);
            ctx.fill();
        }
    });
}
