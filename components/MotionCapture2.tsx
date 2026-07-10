"use client";

import { useEffect, useRef } from "react";

import {
  FilesetResolver,
  PoseLandmarker,
  HandLandmarker,
} from "@mediapipe/tasks-vision";


export default function MotionCapture2() {

  const videoRef = useRef<HTMLVideoElement | null>(null);


  useEffect(() => {

    let pose: PoseLandmarker | null = null;
    let hands: HandLandmarker | null = null;

    let animation: number | null = null;

    let latestPose: any = null;
    let latestHands: any = null;


    let lastPoseTime = 0;
    let lastHandTime = 0;


    const POSE_INTERVAL = 1000 / 15; // 15 FPS
    const HAND_INTERVAL = 1000 / 8;  // 8 FPS



    async function start() {

      const vision =
        await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm"
        );



      pose =
        await PoseLandmarker.createFromOptions(
          vision,
          {
            baseOptions: {
              modelAssetPath:
                "/models/pose_landmarker_lite.task",
            },

            runningMode: "VIDEO",

            numPoses: 1,

            minPoseDetectionConfidence: 0.5,
            minPosePresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
          }
        );



      hands =
        await HandLandmarker.createFromOptions(
          vision,
          {
            baseOptions: {
              modelAssetPath:
                "/models/hand_landmarker.task",
            },

            runningMode: "VIDEO",

            numHands: 2,

            minHandDetectionConfidence: 0.5,
            minHandPresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
          }
        );



      const stream =
        await navigator.mediaDevices.getUserMedia(
          {
            video: {
              width: 320,
              height: 240,
              facingMode: "user",
            },
          }
        );



      if (videoRef.current) {

        videoRef.current.srcObject = stream;

        await videoRef.current.play();

      }



      loop();

    }





    function loop() {


      const video =
        videoRef.current;



      if (!video || !pose || !hands) {

        animation =
          requestAnimationFrame(loop);

        return;

      }



      const now =
        performance.now();




      // ------------------------
      // Pose detection 15 FPS
      // ------------------------

      if (now - lastPoseTime >= POSE_INTERVAL) {

        latestPose =
          pose.detectForVideo(
            video,
            now
          );

        lastPoseTime = now;

      }




      // ------------------------
      // Hand detection 8 FPS
      // ------------------------

      if (now - lastHandTime >= HAND_INTERVAL) {

        latestHands =
          hands.detectForVideo(
            video,
            now
          );

        lastHandTime = now;

      }





      // ------------------------
      // Motion packet
      // ------------------------

      const motion = {

        timestamp: now,

        body:
          latestPose?.landmarks?.[0] ?? null,

        hands:
          latestHands?.landmarks ?? null,

        handedness:
          latestHands?.handedness ?? null,

      };



      // Replace this with websocket.send()
      window.postMessage(
        {
          type: "MOTION_DATA",
          data: motion,
        },
        "*"
      );



      animation =
        requestAnimationFrame(loop);

    }





    start();





    return () => {


      if (animation !== null) {

        cancelAnimationFrame(animation);

      }



      if (videoRef.current) {


        const stream =
          videoRef.current.srcObject as MediaStream | null;



        if (stream) {

          stream.getTracks().forEach(
            (track) => {
              track.stop();
            }
          );

        }



        videoRef.current.srcObject = null;

      }


    };



  }, []);





  return (

    <div>

      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{
          width: "320px",
          height: "240px",
          background: "black",
        }}
      />

    </div>

  );

}
