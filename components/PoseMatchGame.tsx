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



const BONES:[number,number][]=[

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



const playerPoints =
useRef<Keypoint[]>([]);



const [modelReady,setModelReady]=
useState(false);



const [cameraReady,setCameraReady]=
useState(false);



const [target,setTarget]=
useState<any>(
POSES.myPose
);



const [time,setTime]=
useState(30);



const [score,setScore]=
useState(0);









// LOAD AI WHILE WAITING

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



setModelReady(true);



}



load();



},[]);









// START GAME

useEffect(()=>{


if(!gameActive)
return;



const names =
Object.keys(POSES);



const random =
names[
Math.floor(
Math.random()*names.length
)
];



setTarget(
POSES[random as keyof typeof POSES]
);



setTime(30);



},[
gameActive
]);











// CAMERA ONLY PLAYING

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



detect();



}



start();



},[
gameActive,
modelReady
]);









async function detect(){


while(true){



if(
videoRef.current &&
detector.current
){



const poses =

await detector.current
.estimatePoses(

videoRef.current

);



if(poses.length){


playerPoints.current =
poses[0].keypoints;


}



}



await new Promise(r=>

setTimeout(r,80)

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











function compare(
a:any[],
b:number[][]
){


let total=0;



for(
let i=0;
i<a.length;
i++
){


total += Math.hypot(

a[i].x-b[i][0],

a[i].y-b[i][1]

);


}



return Math.max(

0,

100-(total/a.length)*40

);


}












// DRAW

useEffect(()=>{


if(!cameraReady)
return;



const canvas =
canvasRef.current!;


const ctx =
canvas.getContext("2d")!;



function resize(){

canvas.width =
innerWidth;


canvas.height =
innerHeight;

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



if(video.readyState<2)
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





// MIRROR CAMERA

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







// PLAYER SKELETON


const k =
playerPoints.current;



function map(p:Keypoint){

return {

x:

dx+w-(p.x*scale),

y:

dy+(p.y*scale)

};

}



ctx.strokeStyle="#00ffcc";

ctx.lineWidth=8;



BONES.forEach(([a,b])=>{


if(
!k[a] ||
!k[b]
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






k.forEach(p=>{


const pos =
map(p);



ctx.fillStyle="white";


ctx.beginPath();


ctx.arc(

pos.x,

pos.y,

9,

0,

Math.PI*2

);


ctx.fill();



});











// SCORE


if(k.length){


const s =
Math.round(

compare(

k,

target.points

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









// GHOST TARGET


ctx.globalAlpha=.35;


ctx.strokeStyle="#ff0066";


ctx.lineWidth=10;



function targetMap(
p:number[]
){

return {

x:

canvas.width/2+p[0]*120,


y:

canvas.height/2+p[1]*120

};

}



BONES.forEach(([a,b])=>{


const A =
targetMap(
target.points[a]
);


const B =
targetMap(
target.points[b]
);



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





target.points.forEach((p:number[])=>{


const pos =
targetMap(p);



ctx.fillStyle="#ff0066";


ctx.beginPath();


ctx.arc(

pos.x,

pos.y,

8,

0,

Math.PI*2

);



ctx.fill();



});



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

background:"#000",

overflow:"hidden",

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

color:"white",

fontSize:30

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
