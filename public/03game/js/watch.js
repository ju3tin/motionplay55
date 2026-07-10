import socket from "./websocket.js";


const canvas =
document.getElementById("canvas");


const ctx =
canvas.getContext("2d");


const playersText =
document.getElementById("players");



function drawSkeleton(
points,
offsetX
)
{

const bones=[

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




// draw points

points.forEach(p=>{


if(p.score>.5)
{


ctx.beginPath();


ctx.arc(

p.x + offsetX,

p.y,

6,

0,

Math.PI*2

);


ctx.fill();


}


});




// draw bones

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

a.x+offsetX,
a.y

);


ctx.lineTo(

c.x+offsetX,
c.y

);


ctx.stroke();


}


});


}




socket.onmessage=(event)=>{


const data =
JSON.parse(event.data);



console.log(
"SERVER",
data
);



if(data.type==="state")
{


ctx.clearRect(
0,
0,
canvas.width,
canvas.height
);



playersText.innerHTML =
"Players: "
+
data.playerCount;



data.players.forEach(
(player,index)=>{


if(player.pose)
{


drawSkeleton(

player.pose,

index*200

);


}


});


}



};
