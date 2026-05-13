<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>Pushup Counter</title>

    <link rel="icon" href="favicon.ico">

    <script src="/js/camera_utils.js"></script>
    <script src="/js/control_utils.js"></script>
    <script src="/js/drawing_utils.js"></script>
    <script src="/js/pose.js"></script>

    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        html,
        body {
            width: 100%;
            height: 100%;
            overflow: hidden;
            background: black;
            font-family: Arial, sans-serif;
        }

        .container {
            position: relative;
            width: 100vw;
            height: 100vh;
        }

        .input_video,
        .output_canvas {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .input_video {
            display: none;
        }

        .counter {
            position: absolute;
            top: 20px;
            left: 20px;
            z-index: 10;
            color: red;
            font-size: 28px;
            font-weight: bold;
            background: rgba(0, 0, 0, 0.5);
            padding: 10px 15px;
            border-radius: 10px;
        }

        .loading {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            background: black;
            color: white;
            z-index: 20;
        }
    </style>
</head>

<body>

    <div class="container">

        <video class="input_video" autoplay playsinline muted></video>

        <canvas class="output_canvas"></canvas>

        <div class="counter" id="counterText">
            UP: 0
        </div>

        <div class="loading" id="loading">
            Loading Camera...
        </div>

    </div>

    <script>
        const videoElement = document.querySelector('.input_video');
        const canvasElement = document.querySelector('.output_canvas');
        const canvasCtx = canvasElement.getContext('2d');
        const counterText = document.getElementById('counterText');
        const loading = document.getElementById('loading');

        let stage = "UP";
        let counter = 0;

        function resizeCanvas() {
            canvasElement.width = window.innerWidth;
            canvasElement.height = window.innerHeight;
        }

        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        function zColor() {
            return 'white';
        }

        function onResults(results) {

            loading.style.display = "none";

            if (!results.poseLandmarks) {
                return;
            }

            canvasCtx.save();

            canvasCtx.clearRect(
                0,
                0,
                canvasElement.width,
                canvasElement.height
            );

            canvasCtx.drawImage(
                results.image,
                0,
                0,
                canvasElement.width,
                canvasElement.height
            );

            drawConnectors(
                canvasCtx,
                results.poseLandmarks,
                POSE_CONNECTIONS,
                {
                    color: 'white',
                    lineWidth: 4
                }
            );

            drawLandmarks(
                canvasCtx,
                results.poseLandmarks,
                {
                    color: zColor,
                    fillColor: 'red',
                    lineWidth: 2,
                    radius: 4
                }
            );

            const nose = results.poseLandmarks[0];

            if (nose) {

                const noseY = nose.y;

                if (noseY <= 0.5) {
                    stage = "UP";
                }

                if (noseY > 0.7 && stage === "UP") {
                    stage = "DOWN";
                    counter++;
                }

                counterText.innerText = `${stage}: ${counter}`;
            }

            canvasCtx.restore();
        }

        const pose = new Pose({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
            }
        });

        pose.setOptions({
            modelComplexity: 0,
            smoothLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        pose.onResults(onResults);

        const camera = new Camera(videoElement, {
            onFrame: async () => {
                await pose.send({
                    image: videoElement
                });
            },
            width: 640,
            height: 480
        });

        camera.start();
    </script>

</body>

</html>
