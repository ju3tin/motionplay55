import socket from "./websocket.js";


const video =
document.getElementById("video");


const canvas =
document.getElementById("canvas");


const ctx =
canvas.getContext("2d");


const status =
document.getElementById("status");



let detector;



socket.onopen=()=>{


socket.send(JSON.stringify({

type:"tf_ready"

}));



};



async function startCamera()
{

const stream =
await navigator.mediaDevices
.getUserMedia({

video:{
width:640,
height:480
}

});


video.srcObject =
stream;


return new Promise(resolve=>{

video.onloadedmetadata =
()=>resolve();

});

}





function drawSkeleton(points)
{

ctx.clearRect(
0,
0,
640,
480
);



points.forEach(point=>{


if(point.score > .5)
{


ctx.beginPath();


ctx.arc(

point.x,
point.y,
6,
0,
Math.PI*2

);


ctx.fill();


}

});



const bones=[

[5,6],

[5,7],
[7,9],

[6,8],
[8,10],

[5,11],
[6,12],

[11,13],
[13,15],

[12,14],
[14,16]

];



bones.forEach(b=>{


const a =
points[b[0]];


const c =
points[b[1]];



if(
a.score>.5 &&
c.score>.5
)
{


ctx.beginPath();


ctx.moveTo(
a.x,
a.y
);


ctx.lineTo(
c.x,
c.y
);


ctx.stroke();


}


});


}





function sendPose(points)
{


if(socket.readyState !== WebSocket.OPEN)
return;



socket.send(JSON.stringify({

type:"pose",

keypoints:

points.map(p=>({

x:p.x,

y:p.y,

score:p.score

}))


}));



}





async function detectLoop()
{


const poses =
await detector.estimatePoses(video);



if(poses.length)
{


const points =
poses[0].keypoints;



drawSkeleton(points);


sendPose(points);



}



requestAnimationFrame(
detectLoop
);



}





async function start()
{


await startCamera();


detector =
await poseDetection.createDetector(

poseDetection.SupportedModels.MoveNet,

{

modelType:
poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING

}

);



status.innerHTML =
"MoveNet running";


}



start().then(()=>{

detectLoop();

});
