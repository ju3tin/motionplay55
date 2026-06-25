"use client";


import {
useEffect,
useRef,
useState
} from "react";


import {
POSES
} from "./poses";



interface Props{

roomId:string;

userId:string;

players:number;

send:(data:any)=>void;

gameActive:boolean;

}



interface Keypoint{

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



const videoRef=
useRef<HTMLVideoElement>(null);


const canvasRef=
useRef<HTMLCanvasElement>(null);



const detector=
useRef<any>(null);


const points=
useRef<Keypoint[]>([]);



const [modelReady,setModelReady]
=
useState(false);



const [cameraReady,setCameraReady]
=
useState(false);



const [score,setScore]
=
useState(0);



const [time,setTime]
=
useState(30);



const [target,setTarget]
=
useState<any>(POSES.tPose);





//
// Load tensorflow while waiting
//

useEffect(()=>{


async function load(){



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



setModelReady(true);


}



load();



},[]);







//
// Pick pose when game starts
//

useEffect(()=>{


if(!gameActive)
return;


const keys=
Object.keys(POSES);


const random=
keys[
Math.floor(
Math.random()*keys.length
)
];


setTarget(
POSES[random as keyof typeof POSES]
);



setTime(30);



},[gameActive]);








//
// Start camera only playing
//

useEffect(()=>{


if(
!gameActive ||
!modelReady
)
return;



async function camera(){



const stream=
await navigator
.mediaDevices
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



setCameraReady(true);



}



camera();



},[
gameActive,
modelReady
]);









//
// Timer
//

useEffect(()=>{


if(!gameActive)
return;



const t=setInterval(()=>{


setTime(x=>{


if(x<=1){


clearInterval(t);



send({

event:"pose-finished",

roomId,

userId

});



return 0;


}


return x-1;


});



},1000);



return()=>clearInterval(t);



},[
gameActive
]);











//
// Detection
//

useEffect(()=>{


if(
!cameraReady
)
return;



let run=true;



async function loop(){



while(run){



const result=

await detector.current
.estimatePoses(
videoRef.current!
);



if(result.length){

points.current=
result[0].keypoints;

}



await new Promise(r=>
setTimeout(r,80)
);



}


}


loop();



return()=>{

run=false;

};



},[
cameraReady
]);











function compare(
a:any[],
b:any[]
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









//
// Draw
//

useEffect(()=>{


if(!cameraReady)
return;



const canvas=
canvasRef.current!;


const ctx=
canvas.getContext("2d")!;



canvas.width=innerWidth;

canvas.height=innerHeight;



function draw(){


requestAnimationFrame(draw);



const video=
videoRef.current!;


if(video.readyState<2)
return;



ctx.drawImage(

video,

0,

0,

canvas.width,

canvas.height

);



const k=
points.current;



if(k.length){


const current=
k.map(p=>({

x:p.x,

y:p.y

}));



const targetPoints=
target.points.map(
(p:any)=>({

x:p[0],

y:p[1]

})
);



const s=
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



}



draw();



},[
cameraReady,
target
]);









return(

<div

style={{

width:"100vw",

height:"100vh",

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

/>



<div

style={{

position:"absolute",

top:20,

left:20,

color:"white",

fontSize:32

}}

>

{target.name}

<br/>

{score}%

<br/>

{time}s


</div>



</div>


);


}
