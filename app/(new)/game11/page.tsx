'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';

declare global {
  interface Window {
    Camera: any;
    ControlPanel: any;
    StaticText: any;
    Toggle: any;
    Slider: any;
    Holistic: any;
    drawConnectors: any;
    drawLandmarks: any;
    POSE_CONNECTIONS: any;
    HAND_CONNECTIONS: any;
    POSE_LANDMARKS: any;
  }
}

export default function Page() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef<HTMLDivElement>(null);

  const [scriptsLoaded, setScriptsLoaded] = useState(0);

  useEffect(() => {
    if (scriptsLoaded < 4) return;

    let camera: any;
    let holistic: any;

    const init = async () => {
      if (
        !window.Camera ||
        !window.Holistic ||
        !videoRef.current ||
        !canvasRef.current
      ) {
        console.log('MediaPipe not ready');
        return;
      }

      const video4 = videoRef.current;
      const out4 = canvasRef.current;
      const controlsElement4 = controlsRef.current;
      const loading = loadingRef.current;

      const canvasCtx4 = out4.getContext('2d');

      if (!canvasCtx4) return;

      const ctx = canvasCtx4;

      // ---------- CONNECT FUNCTION ----------

      function connect(
        ctx2d: CanvasRenderingContext2D,
        connectors: any[]
      ) {
        const canvas = ctx2d.canvas;

        for (const connector of connectors) {
          const from = connector[0];
          const to = connector[1];

          if (!from || !to) continue;

          ctx2d.beginPath();

          ctx2d.moveTo(
            from.x * canvas.width,
            from.y * canvas.height
          );

          ctx2d.lineTo(
            to.x * canvas.width,
            to.y * canvas.height
          );

          ctx2d.stroke();
        }
      }

      // ---------- RESULTS ----------

      function onResultsHolistic(results: any) {
        if (loading) {
          loading.style.display = 'none';
        }

        if (!results.image) return;

        out4.width = results.image.width;
        out4.height = results.image.height;

        ctx.save();

        ctx.clearRect(0, 0, out4.width, out4.height);

        ctx.drawImage(
          results.image,
          0,
          0,
          out4.width,
          out4.height
        );

        // ---------- POSE ----------

        if (results.poseLandmarks) {
          window.drawConnectors(
            ctx,
            results.poseLandmarks,
            window.POSE_CONNECTIONS,
            {
              color: '#00FF00',
              lineWidth: 3,
            }
          );

          window.drawLandmarks(
            ctx,
            results.poseLandmarks,
            {
              color: '#00FF00',
              fillColor: '#FF0000',
              radius: 3,
            }
          );
        }

        // ---------- RIGHT HAND ----------

        if (results.rightHandLandmarks) {
          window.drawConnectors(
            ctx,
            results.rightHandLandmarks,
            window.HAND_CONNECTIONS,
            {
              color: '#00CC00',
              lineWidth: 2,
            }
          );

          window.drawLandmarks(
            ctx,
            results.rightHandLandmarks,
            {
              color: '#00FF00',
              fillColor: '#FF0000',
              radius: 2,
            }
          );

          if (results.poseLandmarks) {
            ctx.strokeStyle = '#00FF00';

            connect(ctx, [
              [
                results.poseLandmarks[
                  window.POSE_LANDMARKS.RIGHT_ELBOW
                ],
                results.rightHandLandmarks[0],
              ],
            ]);
          }
        }

        // ---------- LEFT HAND ----------

        if (results.leftHandLandmarks) {
          window.drawConnectors(
            ctx,
            results.leftHandLandmarks,
            window.HAND_CONNECTIONS,
            {
              color: '#CC0000',
              lineWidth: 2,
            }
          );

          window.drawLandmarks(
            ctx,
            results.leftHandLandmarks,
            {
              color: '#FF0000',
              fillColor: '#00FF00',
              radius: 2,
            }
          );

          if (results.poseLandmarks) {
            ctx.strokeStyle = '#FF0000';

            connect(ctx, [
              [
                results.poseLandmarks[
                  window.POSE_LANDMARKS.LEFT_ELBOW
                ],
                results.rightHandLandmarks[0],
              ],
            ]);
          }
        }

        ctx.restore();
      }

      // ---------- HOLISTIC ----------

      holistic = new window.Holistic({
        locateFile: (file: string) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`;
        },
      });

      holistic.setOptions({
        selfieMode: true,
        modelComplexity: 0,
        smoothLandmarks: true,
        enableSegmentation: false,
        refineFaceLandmarks: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      holistic.onResults(onResultsHolistic);

      // ---------- CAMERA ----------

      camera = new window.Camera(video4, {
        onFrame: async () => {
          await holistic.send({
            image: video4,
          });
        },

        width: 640,
        height: 480,
      });

      try {
        await camera.start();

        console.log('Camera started');
      } catch (err) {
        console.error(err);

        alert(
          'Camera failed. Use HTTPS and allow camera permissions.'
        );
      }

      // ---------- CONTROLS ----------

      if (controlsElement4) {
        new window.ControlPanel(controlsElement4, {
          selfieMode: true,
          smoothLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        })
          .add([
            new window.StaticText({
              title: 'MediaPipe Holistic',
            }),

            new window.Toggle({
              title: 'Selfie Mode',
              field: 'selfieMode',
            }),

            new window.Slider({
              title: 'Min Detection Confidence',
              field: 'minDetectionConfidence',
              range: [0, 1],
              step: 0.01,
            }),

            new window.Slider({
              title: 'Min Tracking Confidence',
              field: 'minTrackingConfidence',
              range: [0, 1],
              step: 0.01,
            }),
          ])
          .on((options: any) => {
            holistic.setOptions(options);
          });
      }
    };

    init();

    return () => {
      if (camera?.stop) {
        camera.stop();
      }
    };
  }, [scriptsLoaded]);

  const onScriptLoad = () => {
    setScriptsLoaded((prev) => prev + 1);
  };

  return (
    <>
      {/* MediaPipe Scripts */}

      <Script
        src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js"
        strategy="afterInteractive"
        onLoad={onScriptLoad}
      />

      <Script
        src="https://cdn.jsdelivr.net/npm/@mediapipe/control_utils/control_utils.js"
        strategy="afterInteractive"
        onLoad={onScriptLoad}
      />

      <Script
        src="https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js"
        strategy="afterInteractive"
        onLoad={onScriptLoad}
      />

      <Script
        src="https://cdn.jsdelivr.net/npm/@mediapipe/holistic/holistic.js"
        strategy="afterInteractive"
        onLoad={onScriptLoad}
      />

      <main
        style={{
          width: '100vw',
          height: '100vh',
          overflow: 'hidden',
          position: 'relative',
          background: '#000',
        }}
      >
        <div
          ref={loadingRef}
          style={{
            position: 'fixed',
            top: 20,
            left: 20,
            color: '#fff',
            zIndex: 10,
          }}
        >
          Loading camera...
        </div>

        <video
          ref={videoRef}
          playsInline
          autoPlay
          muted
          style={{
            display: 'none',
          }}
        />

        <canvas
          ref={canvasRef}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            objectFit: 'cover',
          }}
        />

        <div
          ref={controlsRef}
          style={{
            position: 'fixed',
            bottom: 10,
            left: 10,
            right: 10,
            zIndex: 10,
          }}
        />
      </main>
    </>
  );
}
