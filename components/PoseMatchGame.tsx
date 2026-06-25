"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";


interface Player {
  id:string;
  name:string;
  score?:number;
}


interface Props {

  roomId:string;

  userId:string;

  players:Player[];

  onScore:
  (score:number)=>void;

}



interface Keypoint {

  x:number;
  y:number;
  score:number;

}



interface Point {

  x:number;
  y:number;

}



const BONES:[number,number][] = [

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



const TARGET = [

{x:0,y:-2},
{x:0,y:-2},

{x:-.5,y:-1.7},
{x:.5,y:-1.7},

{x:-1.8,y:-1},
{x:1.8,y:-1},

{x:-1,y:0},
{x:1,y:0},

{x:-1.1,y:1},
{x:1.1,y:1},

{x:-.7,y:1.5},
{x:.7,y:1.5},

{x:-.7,y:2.5},
{x:.7,y:2.5},

{x:-.7,y:3.5},
{x:.7,y:3.5},

{x:.7,y:3.5}

];




export default function PoseMatchGame({

roomId,
userId,
players,
onScore

}:Props){



const videoRef =
useRef<HTMLVideoElement>(null);


const canvasRef =
useRef<HTMLCanvasElement>(null);



const detector =
useRef<any>(null);


const keypoints =
useRef<Keypoint[]>([]);



const [score,setScore]
=
useState(0);



const [loaded,setLoaded]
=
useState(false);






function normalize(
k:Keypoint[]
):Point[]{


const cx =
(k[11].x+k[12].x)/2;


const cy =
(k[11].y+k[12].y)/2;


const size =
Math.hypot(
k[5].x-k[6].x,
k[5].y-k[6].y
)||1;



return k.map(p=>({

x:(p.x-cx)/size,

y:(p.y-cy)/size

}));

}




function compare(
a:Point[],
b:Point[]
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
// Load MoveNet
//

useEffect(()=>{


async function start(){


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


setLoaded(true);



}



start();



},[]);









//
// Detection loop
//

useEffect(()=>{


if(!loaded)
return;


let active=true;



async function detect(){


while(active){


const poses =

await detector.current
.estimatePoses(
videoRef.current!
);



if(poses.length){

keypoints.current =
poses[0].keypoints;

}



await new Promise(r=>
setTimeout(r,80)
);


}



}


detect();



return()=>{

active=false;

}


},[loaded]);










//
// Drawing
//

useEffect(()=>{


if(!loaded)
return;



const canvas =
canvasRef.current!;


const ctx =
canvas.getContext("2d")!;



canvas.width =
window.innerWidth;


canvas.height =
window.innerHeight;





function draw(){


requestAnimationFrame(draw);



ctx.fillStyle="#000";

ctx.fillRect(

0,

0,

canvas.width,

canvas.height

);



const video =
videoRef.current!;



if(video.readyState<2)
return;



const scale =
Math.min(

canvas.width/video.videoWidth,

canvas.height/video.videoHeight

);



const w =
video.videoWidth*scale;


const h =
video.videoHeight*scale;


const ox =
(canvas.width-w)/2;


const oy =
(canvas.height-h)/2;



// mirror camera


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







const k =
keypoints.current;



if(k.length){



const p =
normalize(k);



const s =
compare(
p,
TARGET
);



setScore(
Math.round(s)
);


onScore(
Math.round(s)
);





function map(
x:Keypoint
){

return {

x:

ox+w-x.x*scale,


y:

oy+x.y*scale

};

}





ctx.strokeStyle =
"#00ffcc";


ctx.lineWidth=6;




BONES.forEach(([a,b])=>{


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



}






// target ghost


ctx.globalAlpha=.3;

ctx.strokeStyle="#ff0066";

ctx.lineWidth=10;



for(
let i=1;
i<TARGET.length;
i++
){


ctx.beginPath();


ctx.moveTo(

canvas.width/2+
TARGET[i-1].x*80,


canvas.height/2+
TARGET[i-1].y*80

);



ctx.lineTo(

canvas.width/2+
TARGET[i].x*80,


canvas.height/2+
TARGET[i].y*80

);



ctx.stroke();



}



ctx.globalAlpha=1;



}


draw();



},[loaded]);







return (

<div
style={{
position:"relative",
width:"100%",
height:"100%"
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

fontSize:28

}}

>

Score:
{score}%


</div>



</div>


);


}
