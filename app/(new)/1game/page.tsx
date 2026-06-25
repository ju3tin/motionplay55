"use client";

import { useEffect, useRef, useState } from "react";

interface Point {
  x:number;
  y:number;
}

interface Keypoint {
  x:number;
  y:number;
  score:number;
}

const CONNECTIONS:[number,number][] = [
 [5,6],[5,7],[7,9],[6,8],[8,10],
 [5,11],[6,12],[11,12],
 [11,13],[13,15],
 [12,14],[14,16],
 [0,1],[1,3],
 [0,2],[2,4]
];


// target poses
const TARGETS = [
{
 name:"T Pose",
 pose:[
 {x:0,y:-2},
 {x:0,y:-2},
 {x:-.5,y:-1.8},
 {x:.5,y:-1.8},
 {x:-1.8,y:-1},
 {x:1.8,y:-1},
 {x:-1,y:0},
 {x:1,y:0},
 {x:-1.2,y:1.2},
 {x:1.2,y:1.2},
 {x:-.7,y:1.5},
 {x:.7,y:1.5},
 {x:-.8,y:2.5},
 {x:.8,y:2.5},
 {x:-.8,y:3.5},
 {x:.8,y:3.5},
 {x:-.8,y:3.5},
 ]
}
];


export default function Page(){

const videoRef=useRef<HTMLVideoElement>(null);
const canvasRef=useRef<HTMLCanvasElement>(null);

const detector=useRef<any>();
const points=useRef<Keypoint[]>([]);

const [ready,setReady]=useState(false);
const [score,setScore]=useState(0);
const [level,setLevel]=useState(0);
const [hold,setHold]=useState(0);



function normalize(k:Keypoint[]){

const hipX=(k[11].x+k[12].x)/2;
const hipY=(k[11].y+k[12].y)/2;

const size=Math.hypot(
 k[5].x-k[6].x,
 k[5].y-k[6].y
)||1;


return k.map(p=>({
x:(p.x-hipX)/size,
y:(p.y-hipY)/size
}));

}



function compare(
a:Point[],
b:Point[]
){

let total=0;

for(let i=0;i<a.length;i++){

const d=Math.hypot(
a[i].x-b[i].x,
a[i].y-b[i].y
);

total+=d;

}

const avg=total/a.length;


return Math.max(
0,
100-avg*35
);

}



useEffect(()=>{

(async()=>{

const tf=await import("@tensorflow/tfjs");
await import("@tensorflow/tfjs-backend-webgl");

await tf.setBackend("webgl");
await tf.ready();


const pd=
await import("@tensorflow-models/pose-detection");


detector.current=
await pd.createDetector(
pd.SupportedModels.MoveNet,
{
modelType:
pd.movenet.modelType
.SINGLEPOSE_LIGHTNING
}
);



const stream=
await navigator.mediaDevices
.getUserMedia({
video:true
});


videoRef.current!.srcObject=stream;


await videoRef.current!.play();


setReady(true);


})();


},[]);



useEffect(()=>{

if(!ready)return;


let live=true;


async function loop(){

while(live){

const poses=
await detector.current
.estimatePoses(
videoRef.current
);


if(poses.length)
points.current=
poses[0].keypoints;


await new Promise(r=>
setTimeout(r,80));

}

}


loop();


return()=>{live=false};


},[ready]);



useEffect(()=>{

if(!ready)return;


const canvas=canvasRef.current!;
const ctx=canvas.getContext("2d")!;


canvas.width=innerWidth;
canvas.height=innerHeight;



function draw(){

requestAnimationFrame(draw);


ctx.fillStyle="#000";
ctx.fillRect(
0,0,
canvas.width,
canvas.height
);


const k=points.current;


if(k.length){

const pose=normalize(k);

const s=
compare(
pose,
TARGETS[level].pose
);


setScore(Math.round(s));


if(s>85){

setHold(h=>{

if(h>100){

setLevel(
(l)=>
(l+1)%TARGETS.length
);

return 0;

}

return h+1;

});

}
else{

setHold(0);

}



for(const [a,b] of CONNECTIONS){

const A=k[a];
const B=k[b];

if(!A||!B)continue;


ctx.strokeStyle="#00ffcc";
ctx.lineWidth=6;


ctx.beginPath();

ctx.moveTo(
A.x,
A.y
);

ctx.lineTo(
B.x,
B.y
);

ctx.stroke();


}

}




// ghost

const ghost=TARGETS[level].pose;

ctx.strokeStyle="#ff0066";
ctx.globalAlpha=.35;
ctx.lineWidth=8;


ghost.forEach((p,i)=>{

if(i===0)return;


const prev=ghost[i-1];


ctx.beginPath();

ctx.moveTo(
innerWidth/2+
prev.x*80,
innerHeight/2+
prev.y*80
);

ctx.lineTo(
innerWidth/2+
p.x*80,
innerHeight/2+
p.y*80
);

ctx.stroke();


});


ctx.globalAlpha=1;


}


draw();


},[ready,level]);



return (

<div
style={{
width:"100vw",
height:"100vh",
background:"#000",
overflow:"hidden"
}}>


<video
ref={videoRef}
style={{display:"none"}}
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
top:30,
left:30,
color:"white",
fontSize:30,
fontFamily:"monospace"
}}
>

<div>
Pose:
{TARGETS[level].name}
</div>


<div>
Match:
{score}%
</div>


</div>



</div>

);


}
