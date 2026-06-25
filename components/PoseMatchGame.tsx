"use client";


import {

useEffect,

useRef,

useState

} from "react";


import {POSES} from "./poses";


import {

calculatePoseScore

} from "@/lib/poseMatcher";




interface Props{

roomId:string;

userId:string;

send:(data:any)=>void;

gameActive:boolean;

}





const BONES:any=[

[5,7],
[7,9],

[6,8],
[8,10],

[5,6],

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

send,

gameActive

}:Props){



const videoRef =
useRef<any>();

const canvasRef =
useRef<any>();


const detector =
useRef<any>();


const points =
useRef<any[]>([]);



const [score,setScore]=useState(0);


const [time,setTime]=useState(30);


const [target,setTarget]=
useState<any>(
POSES.myPose
);






useEffect(()=>{


async function load(){


const tf =
await import("@tensorflow/tfjs");


await import("@tensorflow/tfjs-backend-webgl");


await tf.setBackend("webgl");


await tf.ready();



const pd =
await import("@tensorflow-models/pose-detection");



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



}



load();



},[]);








useEffect(()=>{


if(!gameActive)
return;


async function camera(){


const stream =

await navigator.mediaDevices.getUserMedia({

video:true

});


videoRef.current.srcObject=stream;


await videoRef.current.play();



loop();


}



camera();



},[gameActive]);







async function loop(){


while(true){


const poses=

await detector.current
.estimatePoses(
videoRef.current
);



if(poses.length){

points.current =
poses[0].keypoints;



const s =

calculatePoseScore(

points.current,

target.points

);



setScore(s);



send({

event:"pose-score",

roomId,

userId,

score:s

});



}


await new Promise(r=>
setTimeout(r,100)
);



}


}









useEffect(()=>{


if(!gameActive)
return;



const t=setInterval(()=>{


setTime(x=>x-1);



},1000);



return()=>clearInterval(t);



},[gameActive]);










useEffect(()=>{


const canvas =
canvasRef.current;


const ctx =
canvas.getContext("2d");



function draw(){


requestAnimationFrame(draw);



if(!videoRef.current)
return;



ctx.drawImage(

videoRef.current,

0,

0,

canvas.width,

canvas.height

);



const k=points.current;



ctx.strokeStyle="#00ffcc";

ctx.lineWidth=6;



BONES.forEach(([a,b])=>{


if(!k[a]||!k[b])
return;



ctx.beginPath();

ctx.moveTo(k[a].x,k[a].y);

ctx.lineTo(k[b].x,k[b].y);

ctx.stroke();



});



}



draw();



},[]);








return (

<div>

<video

ref={videoRef}

style={{

display:"none"

}}

/>


<canvas

ref={canvasRef}

width={1280}

height={720}

/>



<h1>

TIME {time}

</h1>


<h1>

MATCH {score}%

</h1>


<h2>

{target.name}

</h2>


</div>

);



}
