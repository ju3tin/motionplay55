"use client";

import {
  useEffect,
  useRef,
  useState
} from "react";

import { POSES } from "./poses";


interface Props {

  roomId:string;

  userId:string;

  players:number;

  send:(data:any)=>void;

  gameActive:boolean;

}



interface Keypoint {

  x:number;

  y:number;

  score:number;

}



const BONES:[number,number][] = [

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

send,

gameActive

}:Props){


const videoRef =
useRef<HTMLVideoElement>(null);


const canvasRef =
useRef<HTMLCanvasElement>(null);


const detector =
useRef<any>(null);


const points =
useRef<Keypoint[]>([]);



const [modelReady,setModelReady] =
useState(false);


const [cameraReady,setCameraReady] =
useState(false);


const [score,setScore] =
useState(0);


const [time,setTime] =
useState(30);


const [target,setTarget] =
useState<any>(
POSES.tPose
);





//
// LOAD TENSORFLOW WHILE WAITING
//

useEffect(()=>{


async function load(){


const tf =
await import("@tensorflow/tfjs");


await import(
"@tensorflow/tfjs-backend-webgl"
);


await tf.setBackend(
"webgl"
);


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



setModelReady(true);



}



load();


},[]);









//
// PICK RANDOM POSE
//

useEffect(()=>{


if(!gameActive)
return;



const keys =
Object.keys(POSES);



const random =
keys[
Math.floor(
Math.random()*keys.length
)
];



setTarget(
POSES[
random as keyof typeof POSES
]
);



setTime(30);



},[
gameActive
]);









//
// CAMERA STARTS ONLY PLAYING
//

useEffect(()=>{


if(
!gameActive ||
!modelReady
)
return;



async function start(){


const stream =
await navigator
.mediaDevices
.getUserMedia({

video:{

width:1280,

height:720,

facingMode:"user"

}

});



videoRef.current!.srcObject =
stream;



await videoRef.current!.play();



setCameraReady(true);



}



start();



},[
gameActive,
modelReady
]);









//
// TIMER
//

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



return()=>{

clearInterval(timer);

};


},[
gameActive
]);











//
// MOVE NET LOOP
//

useEffect(()=>{


if(
!cameraReady
)
return;



let active=true;



async function loop(){


while(active){



const result =

await detector.current
.estimatePoses(

videoRef.current!

);



if(result.length){

points.current =
result[0].keypoints;

}



await new Promise(r=>

setTimeout(r,80)

);



}



}



loop();



return()=>{

active=false;

};



},[
cameraReady
]);









function compare(
a:any[],
b:any[]
){


let total=0;



for(
let i=0;
i<a.length;
i++
){


total += Math.hypot(

a[i].x-b[i].x,

a[i].y-b[i].y

);


}



return Math.max(

0,

100-(total/a.length)*40

);


}











//
// DRAW CAMERA + SKELETON
//

useEffect(()=>{


if(
!cameraReady
)
return;



const canvas =
canvasRef.current!;


const ctx =
canvas.getContext("2d")!;



function resize(){

canvas.width =
window.innerWidth;


canvas.height =
window.innerHeight;

}



resize();



window.addEventListener(
"resize",
resize
);




function draw(){


requestAnimationFrame(draw);



const video =
videoRef.current!;



if(
video.readyState < 2
)
return;



ctx.clearRect(

0,

0,

canvas.width,

canvas.height

);



const scale =
Math.min(

canvas.width/video.videoWidth,

canvas.height/video.videoHeight

);



const w =
video.videoWidth*scale;


const h =
video.videoHeight*scale;


const dx =
(canvas.width-w)/2;


const dy =
(canvas.height-h)/2;





// mirror camera

ctx.save();


ctx.translate(
dx+w,
dy
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









const k =
points.current;



if(k.length){



function map(
p:Keypoint
){


return {

x:

dx+w-(p.x*scale),


y:

dy+(p.y*scale)

};


}






// bones

ctx.lineWidth=8;

ctx.strokeStyle="#00ffcc";


BONES.forEach(([a,b])=>{


if(
k[a].score < .3 ||
k[b].score < .3
)
return;



const A =
map(k[a]);


const B =
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



});





// joints

k.forEach(p=>{


if(p.score < .3)
return;



const pos =
map(p);



ctx.fillStyle="#ffffff";


ctx.beginPath();


ctx.arc(

pos.x,

pos.y,

10,

0,

Math.PI*2

);



ctx.fill();



});







const current =
k.map(p=>({

x:p.x,

y:p.y

}));



const targetPoints =
target.points;



const s =
Math.round(

compare(

current,

targetPoints

)

);



setScore(s);



send({

event:"pose-score",

roomId,

userId,

score:s

});



}









// ghost target


ctx.globalAlpha=.35;

ctx.strokeStyle="#ff0066";

ctx.lineWidth=10;



for(
let i=1;
i<target.points.length;
i++
){


const a =
target.points[i-1];


const b =
target.points[i];



ctx.beginPath();


ctx.moveTo(

canvas.width/2+a[0]*100,

canvas.height/2+a[1]*100

);



ctx.lineTo(

canvas.width/2+b[0]*100,

canvas.height/2+b[1]*100

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

};



},[
cameraReady,
target
]);










return (

<div

style={{

width:"100vw",

height:"100vh",

position:"relative",

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

top:20,

left:20,

color:"#fff",

fontSize:32,

fontFamily:"monospace"

}}

>

POSE: {target.name}

<br/>

MATCH: {score}%

<br/>

TIME: {time}

</div>



</div>

);


}
