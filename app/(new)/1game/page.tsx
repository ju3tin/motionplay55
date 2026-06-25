"use client";

import { useEffect, useRef, useState } from "react";

interface Keypoint {
  x:number;
  y:number;
  score:number;
}

interface Point {
  x:number;
  y:number;
}


const CONNECTIONS:[number,number][]=[
[0,1],[0,2],
[1,3],[2,4],
[5,6],
[5,7],[7,9],
[6,8],[8,10],
[5,11],[6,12],
[11,12],
[11,13],[13,15],
[12,14],[14,16]
];


const TARGET=[
{x:0,y:-2},
{x:0,y:-2},
{x:-.5,y:-1.7},
{x:.5,y:-1.7},
{x:-1.8,y:-1},
{x:1.8,y:-1},
{x:-1,y:0},
{x:1,y:0},
{x:-1.2,y:1},
{x:1.2,y:1},
{x:-.7,y:1.5},
{x:.7,y:1.5},
{x:-.7,y:2.5},
{x:.7,y:2.5},
{x:-.7,y:3.5},
{x:.7,y:3.5},
{x:.7,y:3.5}
];



export default function Page(){


const videoRef=
useRef<HTMLVideoElement>(null);


const canvasRef=
useRef<HTMLCanvasElement>(null);


const detector=
useRef<any>(null);


const keypoints=
useRef<Keypoint[]>([]);



const [ready,setReady]=
useState(false);


const [score,setScore]=
useState(0);


const [hold,setHold]=
useState(0);





function normalize(k:Keypoint[]):Point[]{


const cx=
(k[11].x+k[12].x)/2;


const cy=
(k[11].y+k[12].y)/2;



const size=
Math.hypot(
k[5].x-k[6].x,
k[5].y-k[6].y
)||1;



return k.map(p=>({

x:(p.x-cx)/size,
y:(p.y-cy)/size

}));

}





function similarity(
a:Point[],
b:Point[]
){

let total=0;


for(let i=0;i<a.length;i++){

total+=Math.hypot(
a[i].x-b[i].x,
a[i].y-b[i].y
);

}


return Math.max(
0,
100-(total/a.length)*40
);

}







useEffect(()=>{


(async()=>{


const tf=
await import("@tensorflow/tfjs");


await import(
"@tensorflow/tfjs-backend-webgl"
);


await tf.setBackend(
"webgl"
);


await tf.ready();



const pd=
await import(
"@tensorflow-models/pose-detection"
);



detector.current=
await pd.createDetector(
pd.SupportedModels.MoveNet,
{
modelType:
pd.movenet
.modelType
.SINGLEPOSE_LIGHTNING
}
);



const stream=
await navigator.mediaDevices
.getUserMedia({

video:{
width:1280,
height:720,
facingMode:"user"
}

});



videoRef.current!.srcObject=
stream;



await videoRef.current!.play();


setReady(true);



})();



},[]);







useEffect(()=>{


if(!ready)return;


let running=true;



async function loop(){


while(running){


const poses=
await detector.current
.estimatePoses(
videoRef.current!
);



if(poses.length)
keypoints.current=
poses[0].keypoints;



await new Promise(r=>
setTimeout(r,80)
);


}


}


loop();



return()=>{
running=false;
}


},[ready]);









useEffect(()=>{


if(!ready)return;


const canvas=
canvasRef.current!;


const ctx=
canvas.getContext("2d")!;



function resize(){

canvas.width=
innerWidth;


canvas.height=
innerHeight;

}


resize();

window.addEventListener(
"resize",
resize
);



function draw(){


requestAnimationFrame(draw);



const video=
videoRef.current!;



if(video.readyState<2)
return;



const vw=
video.videoWidth;


const vh=
video.videoHeight;



const cw=
canvas.width;


const ch=
canvas.height;



const scale=
Math.min(
cw/vw,
ch/vh
);



const w=
vw*scale;


const h=
vh*scale;



const ox=
(cw-w)/2;


const oy=
(ch-h)/2;




ctx.fillStyle="#000";

ctx.fillRect(
0,
0,
cw,
ch
);



// CAMERA MIRROR

ctx.save();


ctx.translate(
ox+w,
oy
);


ctx.scale(
-1,
1
);


ctx.drawImage(
video,
0,
0,
w,
h
);


ctx.restore();





const k=
keypoints.current;



if(k.length){



const points=
normalize(k);


const s=
similarity(
points,
TARGET
);



setScore(
Math.round(s)
);



if(s>85){

setHold(x=>{

if(x>25)
return 0;


return x+1;

});


}else{

setHold(0);

}





function map(p:Keypoint){

return {

x:
ox+w-(p.x*scale),

y:
oy+(p.y*scale)

};

}




// player skeleton

ctx.strokeStyle=
"#00ffcc";


ctx.lineWidth=6;



for(
const [a,b]
of CONNECTIONS
){


const A=
map(k[a]);


const B=
map(k[b]);



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

ctx.globalAlpha=.35;

ctx.strokeStyle="#ff0066";

ctx.lineWidth=8;



for(
let i=1;
i<TARGET.length;
i++
){

ctx.beginPath();


ctx.moveTo(
cw/2+
TARGET[i-1].x*80,

ch/2+
TARGET[i-1].y*80
);



ctx.lineTo(
cw/2+
TARGET[i].x*80,

ch/2+
TARGET[i].y*80
);


ctx.stroke();

}


ctx.globalAlpha=1;



}



draw();



return()=>{

window.removeEventListener(
"resize",
resize
);

}



},[ready]);







return(

<div
style={{
width:"100vw",
height:"100vh",
overflow:"hidden",
background:"#000"
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
top:30,
left:30,
color:"white",
fontSize:30,
fontFamily:"monospace"
}}
>

<div>
MATCH {score}%
</div>

<div>
HOLD {hold}/25
</div>


</div>


</div>


)

}
