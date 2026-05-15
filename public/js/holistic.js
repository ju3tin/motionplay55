const video4 = document.querySelector('.input_video4');
const out4 = document.querySelector('.output4');
const controlsElement4 = document.querySelector('.control4');

const canvasCtx4 = out4.getContext('2d');


// iPhone / mobile fixes
video4.setAttribute('playsinline', true);
video4.setAttribute('autoplay', true);
video4.setAttribute('muted', true);


// ---------- HELPERS ----------

function connect(ctx, connectors) {
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

    ctx.moveTo(
      from.x * canvas.width,
      from.y * canvas.height
    );

    ctx.lineTo(
      to.x * canvas.width,
      to.y * canvas.height
    );

    ctx.stroke();
  }
}


// ---------- RESULTS ----------

function onResultsHolistic(results) {

  if (!results.image) return;

  // Responsive canvas sizing
  out4.width = results.image.width;
  out4.height = results.image.height;

  canvasCtx4.save();

  canvasCtx4.clearRect(
    0,
    0,
    out4.width,
    out4.height
  );

  // Draw camera image
  canvasCtx4.drawImage(
    results.image,
    0,
    0,
    out4.width,
    out4.height
  );

  canvasCtx4.lineWidth = 3;

  // ---------- POSE ----------

  if (results.poseLandmarks) {

    drawConnectors(
      canvasCtx4,
      results.poseLandmarks,
      POSE_CONNECTIONS,
      {
        color: '#00FF00',
        lineWidth: 3
      }
    );

    drawLandmarks(
      canvasCtx4,
      results.poseLandmarks,
      {
        color: '#00FF00',
        fillColor: '#FF0000',
        radius: 3
      }
    );
  }


  // ---------- RIGHT HAND ----------

  if (results.rightHandLandmarks) {

    drawConnectors(
      canvasCtx4,
      results.rightHandLandmarks,
      HAND_CONNECTIONS,
      {
        color: '#00CC00',
        lineWidth: 2
      }
    );

    drawLandmarks(
      canvasCtx4,
      results.rightHandLandmarks,
      {
        color: '#00FF00',
        fillColor: '#FF0000',
        radius: 2
      }
    );

    // Connect elbow to hand
    if (results.poseLandmarks) {

      canvasCtx4.strokeStyle = '#00FF00';

      connect(canvasCtx4, [[
        results.poseLandmarks[
          POSE_LANDMARKS.RIGHT_ELBOW
        ],
        results.rightHandLandmarks[0]
      ]]);
    }
  }


  // ---------- LEFT HAND ----------

  if (results.leftHandLandmarks) {

    drawConnectors(
      canvasCtx4,
      results.leftHandLandmarks,
      HAND_CONNECTIONS,
      {
        color: '#CC0000',
        lineWidth: 2
      }
    );

    drawLandmarks(
      canvasCtx4,
      results.leftHandLandmarks,
      {
        color: '#FF0000',
        fillColor: '#00FF00',
        radius: 2
      }
    );

    // Connect elbow to hand
    if (results.poseLandmarks) {

      canvasCtx4.strokeStyle = '#FF0000';

      connect(canvasCtx4, [[
        results.poseLandmarks[
          POSE_LANDMARKS.LEFT_ELBOW
        ],
        results.leftHandLandmarks[0]
      ]]);
    }
  }

  canvasCtx4.restore();
}


// ---------- HOLISTIC ----------

const holistic = new Holistic({
  locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`;
  }
});


// MOBILE OPTIMIZED SETTINGS
holistic.setOptions({

  selfieMode: true,

  modelComplexity: 0,

  smoothLandmarks: true,

  enableSegmentation: false,

  refineFaceLandmarks: false,

  minDetectionConfidence: 0.5,

  minTrackingConfidence: 0.5
});


holistic.onResults(onResultsHolistic);


// ---------- CAMERA ----------

const camera = new Camera(video4, {

  onFrame: async () => {

    try {

      await holistic.send({
        image: video4
      });

    } catch (err) {

      console.error(err);
    }
  },

  width: 640,
  height: 480
});


// ---------- START CAMERA ----------

camera.start()
  .then(() => {

    console.log('Camera started');

  })
  .catch((err) => {

    console.error(
      'Camera failed:',
      err
    );

    alert(
      'Camera failed. Make sure you are using HTTPS and allowed camera permissions.'
    );
  });


// ---------- CONTROLS ----------

new ControlPanel(controlsElement4, {

  selfieMode: true,

  smoothLandmarks: true,

  minDetectionConfidence: 0.5,

  minTrackingConfidence: 0.5

})
.add([

  new StaticText({
    title: 'MediaPipe Holistic'
  }),

  new Toggle({
    title: 'Selfie Mode',
    field: 'selfieMode'
  }),

  new Slider({
    title: 'Min Detection Confidence',
    field: 'minDetectionConfidence',
    range: [0, 1],
    step: 0.01
  }),

  new Slider({
    title: 'Min Tracking Confidence',
    field: 'minTrackingConfidence',
    range: [0, 1],
    step: 0.01
  })

])
.on(options => {

  video4.classList.toggle(
    'selfie',
    options.selfieMode
  );

  holistic.setOptions(options);
});
