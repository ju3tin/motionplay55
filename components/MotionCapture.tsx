"use client";


import { useEffect, useRef } from "react";

import {
  FilesetResolver,
  PoseLandmarker,
  HandLandmarker,
  DrawingUtils
}
from "@mediapipe/tasks-vision";



export default function MotionCapture(){

const videoRef =
useRef<HTMLVideoElement>(null);


const canvasRef =
useRef<HTMLCanvasElement>(null);



useEffect(()=>{

let pose:PoseLandmarker;
let hands:HandLandmarker;

let animation:number;



async function start(){


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

numPoses:1,

minPoseDetectionConfidence:0.5,
minPosePresenceConfidence:0.5,
minTrackingConfidence:0.5

});



hands =
await HandLandmarker.createFromOptions(
vision,
{

baseOptions:{

modelAssetPath:
"/models/hand_landmarker.task"

},

runningMode:"VIDEO",

numHands:2,

minHandDetectionConfidence:0.5,
minHandPresenceConfidence:0.5,
minTrackingConfidence:0.5

});



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



// motion data for your game

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



// draw

const canvas =
canvasRef.current;



if(canvas){


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



// BODY

if(poseResult.landmarks){


for(
const landmark of poseResult.landmarks
){


draw.drawLandmarks(
landmark
);


draw.drawConnectors(
landmark,
PoseLandmarker.POSE_CONNECTIONS
);


}

}



// HANDS

if(handResult.landmarks){


for(
const hand of handResult.landmarks
){


draw.drawLandmarks(
hand
);


draw.drawConnectors(
hand,
HandLandmarker.HAND_CONNECTIONS
);


}

}


}



animation =
requestAnimationFrame(loop);


}





start();



return()=>{


cancelAnimationFrame(animation);


};



},[]);



return(

<div
style={{
position:"relative",
width:"100%"
}}
>


<video

ref={videoRef}

playsInline

muted

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
