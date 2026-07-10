"use client";

import { useEffect, useRef } from "react";

import {
  FilesetResolver,
  PoseLandmarker,
  HandLandmarker,
  DrawingUtils
} from "@mediapipe/tasks-vision";


export default function MotionCapture3() {

  const videoRef =
    useRef<HTMLVideoElement>(null);

  const canvasRef =
    useRef<HTMLCanvasElement>(null);



  useEffect(() => {


    let pose: PoseLandmarker | null = null;
    let hands: HandLandmarker | null = null;

    let frame: number | null = null;



    // Detection frame control

    let lastPoseTime = 0;
    let lastHandTime = 0;


    const POSE_INTERVAL = 1000 / 15; // 15 FPS
    const HAND_INTERVAL = 1000 / 8;  // 8 FPS



    let latestPoseResult: any = null;
    let latestHandResult: any = null;




    async function start() {


      const vision =
        await FilesetResolver.forVisionTasks(

          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"

        );




      pose =
        await PoseLandmarker.createFromOptions(

          vision,

          {

            baseOptions: {

              modelAssetPath:
                "/models/pose_landmarker_lite.task"

            },


            runningMode: "VIDEO",

            numPoses: 1,


            minPoseDetectionConfidence: 0.5,

            minPosePresenceConfidence: 0.5,

            minTrackingConfidence: 0.5

          }

        );





      hands =
        await HandLandmarker.createFromOptions(

          vision,

          {

            baseOptions: {

              modelAssetPath:
                "/models/hand_landmarker.task"

            },


            runningMode: "VIDEO",

            numHands: 2,


            minHandDetectionConfidence: 0.5,

            minHandPresenceConfidence: 0.5,

            minTrackingConfidence: 0.5

          }

        );






      const stream =
        await navigator.mediaDevices.getUserMedia({

          video: {

            width: 320,

            height: 240,

            facingMode: "user"

          }

        });





      if(videoRef.current) {


        videoRef.current.srcObject = stream;


        await videoRef.current.play();


      }




      loop();


    }







    function loop() {


      const video =
        videoRef.current;



      if(!video || !pose || !hands) {

        frame =
          requestAnimationFrame(loop);

        return;

      }



      const now =
        performance.now();





      // ------------------------
      // Pose detection 15 FPS
      // ------------------------

      if(now - lastPoseTime >= POSE_INTERVAL) {


        latestPoseResult =
          pose.detectForVideo(

            video,

            now

          );


        lastPoseTime = now;


      }






      // ------------------------
      // Hand detection 8 FPS
      // ------------------------

      if(now - lastHandTime >= HAND_INTERVAL) {


        latestHandResult =
          hands.detectForVideo(

            video,

            now

          );


        lastHandTime = now;


      }







      const motion = {


        timestamp: now,


        body:
          latestPoseResult?.landmarks ?? [],


        hands:
          latestHandResult?.landmarks ?? [],


        handedness:
          latestHandResult?.handedness ?? []


      };




      // Replace this with websocket.send()

      window.postMessage(

        {

          type: "MOTION_DATA",

          data: motion

        },

        "*"

      );





      draw(

        latestPoseResult,

        latestHandResult

      );





      frame =
        requestAnimationFrame(loop);


    }







    function draw(

      poseResult:any,

      handResult:any

    ) {



      const canvas =
        canvasRef.current;


      const video =
        videoRef.current;



      if(!canvas || !video)
        return;




      canvas.width =
        video.videoWidth;



      canvas.height =
        video.videoHeight;




      const ctx =
        canvas.getContext("2d");



      if(!ctx)
        return;





      ctx.clearRect(

        0,

        0,

        canvas.width,

        canvas.height

      );





      const drawing =
        new DrawingUtils(ctx);






      if(poseResult?.landmarks) {


        for(const body of poseResult.landmarks) {


          drawing.drawLandmarks(body);


          drawing.drawConnectors(

            body,

            PoseLandmarker.POSE_CONNECTIONS

          );


        }

      }






      if(handResult?.landmarks) {


        for(const hand of handResult.landmarks) {


          drawing.drawLandmarks(hand);


          drawing.drawConnectors(

            hand,

            HandLandmarker.HAND_CONNECTIONS

          );


        }

      }



    }






    start();






    return () => {



      if(frame !== null) {

        cancelAnimationFrame(frame);

      }





      if(videoRef.current) {


        const stream =
          videoRef.current.srcObject as MediaStream | null;



        if(stream) {


          stream.getTracks().forEach(

            track => {

              track.stop();

            }

          );


        }



        videoRef.current.srcObject = null;


      }



    };



  }, []);







  return (

    <div

      style={{

        position:"relative"

      }}

    >



      <video

        ref={videoRef}

        muted

        playsInline

        style={{

          width:"100%"

        }}

      />




      <canvas

        ref={canvasRef}

        style={{

          position:"absolute",

          left:0,

          top:0,

          width:"100%"

        }}

      />



    </div>

  );

}
