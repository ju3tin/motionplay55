'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';

declare global {
  interface Window {
    Camera: any;
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
  const loadingRef = useRef<HTMLDivElement>(null);

  const [scriptsLoaded, setScriptsLoaded] = useState(0);

  useEffect(() => {
    if (scriptsLoaded < 3) return;

    let camera: any;
    let holistic: any;
    let isProcessing = false;

    const init = async () => {
      if (
        !window.Camera ||
        !window.Holistic ||
        !videoRef.current ||
        !canvasRef.current
      ) {
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const loading = loadingRef.current;

      const canvasCtx = canvas.getContext('2d');

      if (!canvasCtx) return;

      const ctx = canvasCtx;

      // ---------- CONNECT FUNCTION ----------

      function connect(
        ctx2d: CanvasRenderingContext2D,
        connectors: any[]
      ) {
        const canvasEl = ctx2d.canvas;

        for (const connector of connectors) {
          const from = connector[0];
          const to = connector[1];

          if (!from || !to) continue;

          ctx2d.beginPath();

          ctx2d.moveTo(
            from.x * canvasEl.width,
            from.y * canvasEl.height
          );

          ctx2d.lineTo(
            to.x * canvasEl.width,
            to.y * canvasEl.height
          );

          ctx2d.stroke();
        }
      }

      // ---------- RESULTS ----------

      function onResults(results: any) {
        if (loading) {
          loading.style.display = 'none';
        }

        if (!results.image) return;

        canvas.width = results.image.width;
        canvas.height = results.image.height;

        ctx.save();

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // camera image
        ctx.drawImage(
          results.image,
          0,
          0,
          canvas.width,
          canvas.height
        );

        // ---------- POSE ----------

        if (results.poseLandmarks) {
          window.drawConnectors(
            ctx,
            results.poseLandmarks,
            window.POSE_CONNECTIONS,
            {
              color: '#00FF00',
              lineWidth: 2,
            }
          );

          // reduced landmark rendering for performance
          window.drawLandmarks(
            ctx,
            results.poseLandmarks,
            {
              color: '#00FF00',
              radius: 1,
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

          // connect elbow to hand
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
              color: '#FF0000',
              lineWidth: 2,
            }
          );

          // connect elbow to hand
          if (results.poseLandmarks) {
            ctx.strokeStyle = '#FF0000';

            connect(ctx, [
              [
                results.poseLandmarks[
                  window.POSE_LANDMARKS.LEFT_ELBOW
                ],
                results.leftHandLandmarks[0],
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

      // PERFORMANCE OPTIMIZED SETTINGS
      holistic.setOptions({
        selfieMode: true,

        // LOWEST CPU MODE
        modelComplexity: 0,

        // smoother disabled for speed
        smoothLandmarks: false,

        enableSegmentation: false,

        refineFaceLandmarks: false,

        minDetectionConfidence: 0.5,

        minTrackingConfidence: 0.5,
      });

      holistic.onResults(onResults);

      // ---------- CAMERA ----------

      camera = new window.Camera(video, {
        onFrame: async () => {
          // skip frame while processing
          if (isProcessing) return;

          isProcessing = true;

          try {
            await holistic.send({
              image: video,
            });
          } catch (err) {
            console.error(err);
          }

          isProcessing = false;
        },

        // LOWER RESOLUTION = BETTER FPS
        width: 320,
        height: 240,
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
        {/* Loading */}

        <div
          ref={loadingRef}
          style={{
            position: 'fixed',
            top: 20,
            left: 20,
            color: '#fff',
            zIndex: 10,
            fontSize: 14,
            fontFamily: 'Arial',
          }}
        >
          Loading camera...
        </div>

        {/* Hidden Video */}

        <video
          ref={videoRef}
          playsInline
          autoPlay
          muted
          style={{
            display: 'none',
          }}
        />

        {/* Canvas */}

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
      </main>
    </>
  );
}
