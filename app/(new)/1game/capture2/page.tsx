"use client";

import {
  useEffect,
  useRef,
  useState
} from "react";


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




export default function CapturePage(){


const videoRef =
useRef<HTMLVideoElement>(null);


const canvasRef =
useRef<HTMLCanvasElement>(null);



const detector =
useRef<any>(null);



const points =
useRef<Keypoint[]>([]);



const [ready,setReady] =
useState(false);



const [output,setOutput] =
useState("");









//
// LOAD TENSORFLOW + CAMERA
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



setReady(true);



detect();



}



start();



},[]);











//
// POSE LOOP
//

async function detect(){



while(true){



if(detector.current && videoRef.current){



const poses =

await detector.current
.estimatePoses(

videoRef.current

);



if(poses.length){


points.current =
poses[0].keypoints;


}



}



await new Promise(r=>

setTimeout(r,80)

);



}



}









//
// DRAW CAMERA + SKELETON
//

useEffect(()=>{


if(!ready)
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



function draw(){


requestAnimationFrame(draw);



const video =
videoRef.current!;



if(video.readyState < 2)
return;



ctx.drawImage(

video,

0,

0,

canvas.width,

canvas.height

);




const k =
points.current;



if(!k.length)
return;





ctx.strokeStyle =
"#00ffcc";


ctx.lineWidth=6;



BONES.forEach(([a,b])=>{


if(
k[a].score < .3 ||
k[b].score < .3
)
return;



ctx.beginPath();


ctx.moveTo(
k[a].x,
k[a].y
);



ctx.lineTo(
k[b].x,
k[b].y
);



ctx.stroke();



});





k.forEach(p=>{


if(p.score < .3)
return;



ctx.fillStyle="white";



ctx.beginPath();


ctx.arc(

p.x,

p.y,

8,

0,

Math.PI*2

);



ctx.fill();



});



}



draw();



},[
ready
]);









//
// CAPTURE BUTTON
//

function capture(){



const clean =

points.current.map(p=>[


Number(
p.x.toFixed(15)
),


Number(
p.y.toFixed(15)
)


]);





const result = {


name:"New Pose",


points:clean



};





setOutput(

JSON.stringify(

result,

null,

2

)

);



}










return (

<div

style={{

width:"100vw",

height:"100vh",

background:"#000",

position:"relative",

overflow:"hidden"

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





<button

onClick={capture}

style={{

position:"absolute",

bottom:40,

left:"50%",

transform:"translateX(-50%)",

padding:"20px 50px",

fontSize:24,

background:"#00ffcc"

}}

>

CAPTURE POSE

</button>







{output &&

<pre

style={{

position:"absolute",

top:20,

right:20,

width:450,

height:600,

overflow:"auto",

background:"#111",

color:"#00ff00",

padding:20

}}

>

{output}

</pre>

}



</div>

);


}
