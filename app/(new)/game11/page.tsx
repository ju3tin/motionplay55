'use client';

import { useEffect, useRef } from 'react';
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

  useEffect(() => {
    let camera: any;
    let holistic: any;

    const init = async () => {
      if (
        !window.Camera ||
        !window.Holistic ||
        !videoRef.current ||
        !canvasRef.current
      ) {
        return;
      }

      const video4 = videoRef.current;
      const out4 = canvasRef.current;
      const controlsElement4 = controlsRef.current;
      const loading = loadingRef.current;

      const canvasCtx4 = out4.getContext('2d');

      if (!canvasCtx4) return;

      // iPhone fixes
      video4.setAttribute('playsinline', 'true');
      video4.setAttribute('autoplay', 'true');
      video4.setAttribute('muted', 'true');

      // ---------- CONNECT FUNCTION ----------

      function connect(ctx: CanvasRenderingContext2D, connectors: any[]) {
        const canvas = ctx.canvas;

        for (const connector of connectors) {
          const from = connector[0];
          const to = connector[1];

          if (!from || !to) continue;

          if (
            from.visibility &&
            to.visibility &&
            (from.visibility < 0.1 || to.visibility < 0.1)
          ) {
            continue;
          }

          ctx.beginPath();

          ctx.moveTo(from.x * canvas.width, from.y * canvas.height);

          ctx.lineTo(to.x * canvas.width, to.y * canvas.height);

          ctx.stroke();
        }
      }

      // ---------- RESULTS ----------

      function onResultsHolistic(results: any) {
        if (loading) {
          loading.style.display = 'none';
        }

        if (!results.image) return;

        // Match canvas to video size
        out4.width = results.image.width;
        out4.height = results.image.height;

        canvasCtx4.save();

        canvasCtx4.clearRect(0, 0, out4.width, out4.height);

        // Draw camera image
        canvasCtx4.drawImage(results.image, 0, 0, out4.width, out4.height);

        canvasCtx4.lineWidth = 3;

        // ---------- POSE ----------

        if (results.poseLandmarks) {
          window.drawConnectors(
            canvasCtx4,
            results.poseLandmarks,
            window.POSE_CONNECTIONS,
            {
              color: '#00FF00',
              lineWidth: 3,
            }
          );

          window.drawLandmarks(canvasCtx4, results.poseLandmarks, {
            color: '#00FF00',
            fillColor: '#FF0000',
            radius: 3,
          });
        }

        // ---------- RIGHT HAND ----------

        if (results.rightHandLandmarks) {
          window.drawConnectors(
            canvasCtx4,
            results.rightHandLandmarks,
            window.HAND_CONNECTIONS,
            {
              color: '#00CC00',
              lineWidth: 2,
            }
          );

          window.drawLandmarks(
            canvasCtx4,
            results.rightHandLandmarks,
            {
              color: '#00FF00',
              fillColor: '#FF0000',
              radius: 2,
            }
          );

          // Connect elbow to hand
          if (results.poseLandmarks) {
            canvasCtx4.strokeStyle = '#00FF00';

            connect(canvasCtx4, [
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
            canvasCtx4,
            results.leftHandLandmarks,
            window.HAND_CONNECTIONS,
            {
              color: '#CC0000',
              lineWidth: 2,
            }
          );

          window.drawLandmarks(
            canvasCtx4,
            results.leftHandLandmarks,
            {
              color: '#FF0000',
              fillColor: '#00FF00',
              radius: 2,
            }
          );

          // Connect elbow to hand
          if (results.poseLandmarks) {
            canvasCtx4.strokeStyle = '#FF0000';

            connect(canvasCtx4, [
              [
                results.poseLandmarks[
                  window.POSE_LANDMARKS.LEFT_ELBOW
                ],
                results.leftHandLandmarks[0],
              ],
            ]);
          }
        }

        canvasCtx4.restore();
      }

      // ---------- HOLISTIC ----------

      holistic = new window.Holistic({
        locateFile: (file: string) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`;
        },
      });

      // Mobile optimized settings
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
          try {
            await holistic.send({
              image: video4,
            });
          } catch (err) {
            console.error(err);
          }
        },

        width: 640,
        height: 480,
      });

      // ---------- START ----------

      camera
        .start()
        .then(() => {
          console.log('Camera started');
        })
        .catch((err: any) => {
          console.error(err);

          alert(
            'Camera failed. Use HTTPS and allow camera permissions.'
          );
        });

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
            video4.classList.toggle(
              'selfie',
              options.selfieMode
            );

            holistic.setOptions(options);
          });
      }
    };

    const timeout = setTimeout(init, 1000);

    return () => {
      clearTimeout(timeout);

      if (camera && camera.stop) {
        camera.stop();
      }
    };
  }, []);

  return (
    <>
      {/* MediaPipe Scripts */}
      <Script
        src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js"
        strategy="beforeInteractive"
      />

      <Script
        src="https://cdn.jsdelivr.net/npm/@mediapipe/control_utils/control_utils.js"
        strategy="beforeInteractive"
      />

      <Script
        src="https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js"
        strategy="beforeInteractive"
      />

      <Script
        src="https://cdn.jsdelivr.net/npm/@mediapipe/holistic/holistic.js"
        strategy="beforeInteractive"
      />

      <main
        style={{
          margin: 0,
          padding: 0,
          overflow: 'hidden',
          background: '#000',
          width: '100vw',
          height: '100vh',
          position: 'relative',
        }}
      >
        <div
          ref={loadingRef}
          style={{
            position: 'fixed',
            top: '20px',
            left: '20px',
            color: 'white',
            zIndex: 10,
            fontSize: '14px',
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
            zIndex: 1,
          }}
        />

        <div
          ref={controlsRef}
          style={{
            position: 'fixed',
            bottom: '10px',
            left: '10px',
            right: '10px',
            zIndex: 10,
          }}
        />
      </main>
    </>
  );
}
