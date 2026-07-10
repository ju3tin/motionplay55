"use client";

import { useEffect, useRef } from "react";

import {
  FilesetResolver,
  PoseLandmarker,
  HandLandmarker,
  DrawingUtils
} from "@mediapipe/tasks-vision";


export default function MotionCapture() {

  const videoRef =
    useRef<HTMLVideoElement>(null);

  const canvasRef =
    useRef<HTMLCanvasElement>(null);


  useEffect(() => {

    let pose: PoseLandmarker;
    let hands: HandLandmarker;
    let frame:number;


    async function start() {


      const vision =
        await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm"
        );


      pose =
        await PoseLandmarker.createFromOptions(
          vision,
          {
            baseOptions:{
              modelAssetPath:
              "/models/pose_landmarker_lite.task"
            },

            runningMode:"VIDEO",

            numPoses:1
          }
        );


      hands =
        await HandLandmarker.createFromOptions(
          vision,
          {
            baseOptions:{
              modelAssetPath:
              "/models/hand_landmarker.task"
            },

            runningMode:"VIDEO",

            numHands:2
          }
        );



      const stream =
        await navigator.mediaDevices.getUserMedia({

          video:{
            facingMode:"user",
            width:640,
            height:480
          }

        });


      if(videoRef.current){

        videoRef.current.srcObject =
          stream;

        await videoRef.current.play();

      }


      loop();

    }



    function loop(){


      if(!videoRef.current)
        return;


      const video =
        videoRef.current;


      const time =
        performance.now();



      const poseResult =
        pose.detectForVideo(
          video,
          time
        );


      const handResult =
        hands.detectForVideo(
          video,
          time
        );



      // YOUR MOTION DATA

      const motion = {

        timestamp:time,

        body:
        poseResult.landmarks,

        hands:
        handResult.landmarks,

        handedness:
        handResult.handedness

      };


      console.log(motion);



      draw(
        poseResult,
        handResult
      );



      frame =
        requestAnimationFrame(loop);

    }



    function draw(
      poseResult:any,
      handResult:any
    ){

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
        canvas.getContext("2d")!;


      ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
      );


      const draw =
        new DrawingUtils(ctx);



      if(poseResult.landmarks){

        for(
          const body of poseResult.landmarks
        ){

          draw.drawLandmarks(body);

          draw.drawConnectors(
            body,
            PoseLandmarker.POSE_CONNECTIONS
          );

        }

      }



      if(handResult.landmarks){

        for(
          const hand of handResult.landmarks
        ){

          draw.drawLandmarks(hand);

          draw.drawConnectors(
            hand,
            HandLandmarker.HAND_CONNECTIONS
          );

        }

      }


    }



    start();


    return()=>{

      cancelAnimationFrame(frame);

    };


  },[]);



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
