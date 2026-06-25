"use client";

import {
  useEffect,
  useRef,
  useState
} from "react";

import { POSES } from "./poses";

import {
  calculatePoseScore,
  Keypoint
} from "@/lib/poseMatcher";


interface Props {

  roomId:string;

  userId:string;

  players:number;

  send:(data:any)=>void;

  gameActive:boolean;

}



const BONES: [number,number][] = [

  [0,1],
  [0,2],
  [1,3],
  [2,4],

  [5,6],

  [5,7],
  [7,9],

  [6,8],
  [8,10],

  [5,11],
  [6,12],

  [11,12],

  [11,13],
  [13,15],

  [12,14],
  [14,16]

];





export default function PoseMatchGame({

  roomId,

  userId,

  players,

  send,

  gameActive

}:Props){



const videoRef =
useRef<HTMLVideoElement|null>(null);


const canvasRef =
useRef<HTMLCanvasElement|null>(null);


const detector =
useRef<any>(null);



const points =
useRef<Keypoint[]>([]);



const [score,setScore] =
useState(0);


const [time,setTime] =
useState(30);



const [target,setTarget] =
useState<any>(
POSES.tPose
);



const [loaded,setLoaded] =
useState(false);





// LOAD TENSORFLOW

useEffect(()=>{


async function load(){


const tf =
await import("@tensorflow/tfjs");


await import(
"@tensorflow/tfjs-backend-webgl"
);



await tf.setBackend("webgl");


await tf.ready();



const pd =
await import(
"@tensorflow-models/pose-detection"
);



detector.current =

await pd.createDetector(

pd.SupportedModels.MoveNet,

{

modelType:

pd.movenet
.modelType
.SINGLEPOSE_LIGHTNING

}

);



setLoaded(true);


}



load();


},[]);









// START GAME CAMERA

useEffect(()=>{


if(
!gameActive ||
!loaded
)
return;



async function start(){



const stream =

await navigator.mediaDevices.getUserMedia({

video:{

width:1280,

height:720,

facingMode:"user"

}

});



if(videoRef.current){


videoRef.current.srcObject =
stream;


await videoRef.current.play();


detect();


}



}



start();



},[
gameActive,
loaded
]);









// PICK RANDOM POSE

useEffect(()=>{


if(!gameActive)
return;



const names =
Object.keys(POSES);



const selected =

names[
Math.floor(
Math.random()*names.length
)
];



setTarget(

POSES[
selected as keyof typeof POSES
]

);



setTime(30);



},[
gameActive
]);









async function detect(){



while(true){



if(

videoRef.current &&

detector.current

){



const result =

await detector.current
.estimatePoses(

videoRef.current

);



if(result.length){



points.current =
result[0].keypoints;



const newScore =

calculatePoseScore(

points.current,

target.points

);



setScore(newScore);



send({

event:"pose-score",

roomId,

userId,

score:newScore

});



}



}



await new Promise(r=>

setTimeout(r,100)

);



}



}









// TIMER

useEffect(()=>{


if(!gameActive)
return;



const timer =

setInterval(()=>{


setTime(t=>{


if(t<=1){


clearInterval(timer);



send({

event:"pose-finished",

roomId,

userId

});



return 0;

}



return t-1;


});



},1000);



return()=>clearInterval(timer);



},[
gameActive
]);









// DRAW
useEffect(() => {
  const canvasEl = canvasRef.current;
  const videoEl = videoRef.current;

  if (!canvasEl || !videoEl) return;

  const ctx = canvasEl.getContext("2d");

  if (!ctx) return;

  function resize() {
    canvasEl.width = window.innerWidth;
    canvasEl.height = window.innerHeight;
  }

  resize();

  window.addEventListener("resize", resize);

  function draw() {
    requestAnimationFrame(draw);

    if (videoEl.readyState < 2) return;

    ctx.clearRect(
      0,
      0,
      canvasEl.width,
      canvasEl.height
    );

    // CAMERA
    ctx.save();

    ctx.translate(canvasEl.width, 0);
    ctx.scale(-1, 1);

    ctx.drawImage(
      videoEl,
      0,
      0,
      canvasEl.width,
      canvasEl.height
    );

    ctx.restore();

    const k = points.current;

    // PLAYER SKELETON
    ctx.strokeStyle = "#00ffcc";
    ctx.lineWidth = 8;

    BONES.forEach(([a, b]) => {
      const A = k[a];
      const B = k[b];

      if (!A || !B) return;

      ctx.beginPath();

      ctx.moveTo(
        canvasEl.width - A.x,
        A.y
      );

      ctx.lineTo(
        canvasEl.width - B.x,
        B.y
      );

      ctx.stroke();
    });

    // TARGET GHOST
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = "#ff0066";
    ctx.lineWidth = 10;

    function mapTarget(p: number[]) {
      return {
        x: canvasEl.width / 2 + p[0] * 120,
        y: canvasEl.height / 2 + p[1] * 120,
      };
    }

    BONES.forEach(([a, b]) => {
      const A = mapTarget(target.points[a]);
      const B = mapTarget(target.points[b]);

      ctx.beginPath();

      ctx.moveTo(A.x, A.y);
      ctx.lineTo(B.x, B.y);

      ctx.stroke();
    });

    ctx.globalAlpha = 1;
  }

  draw();

  return () => {
    window.removeEventListener("resize", resize);
  };
}, [target]);















return (

<div

style={{

width:"100vw",

height:"100vh",

background:"#000",

position:"relative"

}}

>


<video

ref={videoRef}

muted

playsInline

style={{

display:"none"

}}

/>



<canvas

ref={canvasRef}

style={{

width:"100%",

height:"100%"

}}

/>





<div

style={{

position:"absolute",

top:20,

left:20,

color:"#fff",

fontSize:30,

fontFamily:"monospace"

}}

>

TIME: {time}

<br/>

MATCH: {score}%

<br/>

PLAYERS: {players}

<br/>

TARGET: {target.name}

</div>



</div>

);


}
