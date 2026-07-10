import socket from "./websocket.js";


const canvas =
document.getElementById("canvas");


const ctx =
canvas.getContext("2d");


const playersText =
document.getElementById("players");





socket.onmessage=(event)=>{


const data =
JSON.parse(event.data);



if(data.type==="state")
{


playersText.innerHTML =
"Players: "
+
data.playerCount;



drawPlayers(
data.players
);



}


};






function drawPlayers(players)
{


ctx.clearRect(
0,
0,
640,
480
);



players.forEach(player=>{


if(!player.pose)
return;



player.pose.forEach(point=>{


if(point.score>.5)
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



});



}
