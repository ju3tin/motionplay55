"use client";

import {
  useEffect,
  useRef,
  useState,
  useCallback
} from "react";


// ─────────────────────────────────────────────
// Multiplayer Props
// ─────────────────────────────────────────────

export interface Player {
  id:string;
  name?:string;
  score?:number;
  combo?:number;
}


export interface GameProps {

  roomId:string;

  userId:string;

  players:Player[];

  send:(data:any)=>void;

  gameActive:boolean;

}



// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const GAME_DURATION = 60;

const SPAWN_INTERVAL = 800;

const TARGET_LIFE = 2200;

const HIT_RADIUS = 55;



interface Target {

 id:number;

 x:number;

 y:number;

 r:number;

 born:number;

 hit:boolean;

}



type GameState =
"idle" |
"loading" |
"playing" |
"ended";



// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────


export default function PoseMatchGame({

 roomId,

 userId,

 players,

 send,

 gameActive


}:GameProps){



const videoRef =
useRef<HTMLVideoElement>(null);


const canvasRef =
useRef<HTMLCanvasElement>(null);


const areaRef =
useRef<HTMLDivElement>(null);



const detectorRef =
useRef<any>(null);


const rafRef =
useRef<number>(0);



const spawnRef =
useRef<any>(null);



const timerRef =
useRef<any>(null);



const targetsRef =
useRef<Target[]>([]);



const scoreRef =
useRef(0);



const comboRef =
useRef(0);



const maxComboRef =
useRef(0);



const idRef =
useRef(0);



const isHost =
useRef(false);



const [state,setState]=
useState<GameState>("idle");


const [score,setScore]=
useState(0);


const [combo,setCombo]=
useState(0);


const [time,setTime]=
useState(GAME_DURATION);



// ─────────────────────────────────────────────
// Host selection
// ─────────────────────────────────────────────


useEffect(()=>{


if(!players.length)
return;


const host =
[...players]
.sort((a,b)=>
a.id.localeCompare(b.id)
)[0];


isHost.current =
host.id === userId;



},[
players,
userId
]);




// ─────────────────────────────────────────────
// Load AI model
// ─────────────────────────────────────────────


const loadModel = useCallback(async()=>{


setState("loading");


const tf =
await import("@tensorflow/tfjs");


await import("@tensorflow/tfjs-backend-webgl");


await tf.setBackend("webgl");


await tf.ready();



const pd =
await import("@tensorflow-models/pose-detection");



detectorRef.current =
await pd.createDetector(

pd.SupportedModels.MoveNet,

{

modelType:
pd.movenet.modelType.SINGLEPOSE_LIGHTNING

}

);



},[]);




// ─────────────────────────────────────────────
// Camera
// ─────────────────────────────────────────────


const startCamera =
useCallback(async()=>{


const stream =
await navigator.mediaDevices.getUserMedia({

video:{

facingMode:"user",

width:640,

height:480

}

});


if(videoRef.current){

videoRef.current.srcObject =
stream;


await videoRef.current.play();

}



},[]);




// ─────────────────────────────────────────────
// Receive room events
// ─────────────────────────────────────────────


useEffect(()=>{


const listener=(e:any)=>{


const data=e.detail;



if(data.type==="TARGET"){


targetsRef.current.push({

id:data.target.id,


x:data.target.x,


y:data.target.y,


r:data.target.r,


born:Date.now(),


hit:false


});


}



};



window.addEventListener(
"game-message",
listener
);



return()=>{


window.removeEventListener(
"game-message",
listener
);



}



},[]);





// ─────────────────────────────────────────────
// Spawn synced target
// ─────────────────────────────────────────────


const spawnTarget =
()=>{


if(!isHost.current)
return;



send({

type:"TARGET",


roomId,


target:{


id:idRef.current++,


x:Math.random(),


y:Math.random(),


r:40



}


});



};




// ─────────────────────────────────────────────
// Hit detection
// ─────────────────────────────────────────────


const hitTarget =
(x:number,y:number)=>{


let hit=false;


targetsRef.current =
targetsRef.current.map(t=>{


const tx =
t.x *
(areaRef.current?.clientWidth||1);


const ty =
t.y *
(areaRef.current?.clientHeight||1);



if(

Math.hypot(
x-tx,
y-ty
)
<
HIT_RADIUS+t.r

){

hit=true;

return {
...t,
hit:true
};

}


return t;


});




if(hit){


comboRef.current++;


const points =
100 +
(comboRef.current*15);



scoreRef.current += points;



setScore(scoreRef.current);



setCombo(comboRef.current);



send({

type:"SCORE",

roomId,


userId,


score:
scoreRef.current,


combo:
comboRef.current



});



}



};




// ─────────────────────────────────────────────
// Pose loop
// ─────────────────────────────────────────────


const detect =
useCallback(async()=>{


if(
!detectorRef.current ||
!videoRef.current
)
return;



const poses =
await detectorRef.current
.estimatePoses(
videoRef.current
);



const pose =
poses?.[0];


if(!pose)
return;



const area =
areaRef.current;



if(!area)
return;



const w =
area.clientWidth;


const h =
area.clientHeight;



[
9,
10

].forEach(i=>{


const hand =
pose.keypoints[i];


if(hand?.score>.35){


hitTarget(

w -
hand.x *
(w/
(videoRef.current?.videoWidth||640)),


hand.y *
(h/
(videoRef.current?.videoHeight||480))

);



}


});



rafRef.current =
requestAnimationFrame(detect);



},[]);





// ─────────────────────────────────────────────
// Start / Stop from room state
// ─────────────────────────────────────────────


useEffect(()=>{


if(!gameActive)
return;



(async()=>{


targetsRef.current=[];


scoreRef.current=0;


comboRef.current=0;


setScore(0);


setCombo(0);


setTime(GAME_DURATION);



if(!detectorRef.current)
await loadModel();



await startCamera();



setState("playing");



detect();



if(isHost.current){


spawnRef.current =
setInterval(

spawnTarget,

SPAWN_INTERVAL

);


}



timerRef.current =
setInterval(()=>{


setTime(t=>{


if(t<=1){


endGame();


return 0;


}


return t-1;


});



},1000);



})();



return()=>{


if(spawnRef.current)
clearInterval(spawnRef.current);



if(timerRef.current)
clearInterval(timerRef.current);



};



},[
gameActive
]);





// ─────────────────────────────────────────────
// End game
// ─────────────────────────────────────────────


const endGame = ()=>{


setState("ended");



cancelAnimationFrame(
rafRef.current
);



if(spawnRef.current)
clearInterval(
spawnRef.current
);



if(timerRef.current)
clearInterval(
timerRef.current
);



};






// ─────────────────────────────────────────────
// Draw loop
// ─────────────────────────────────────────────


useEffect(()=>{


if(state!=="playing")
return;



const canvas =
canvasRef.current;


const area =
areaRef.current;



if(!canvas || !area)
return;



const ctx =
canvas.getContext("2d");



if(!ctx)
return;




const render=()=>{


const width =
area.clientWidth;


const height =
area.clientHeight;



canvas.width =
width;


canvas.height =
height;



ctx.clearRect(
0,
0,
width,
height
);



const now =
Date.now();



targetsRef.current =
targetsRef.current.filter(t=>{


if(
now-t.born >
TARGET_LIFE
)
return false;



return true;


});





targetsRef.current.forEach(t=>{


const x =
t.x * width;


const y =
t.y * height;




ctx.beginPath();


ctx.arc(

x,

y,

t.r,

0,

Math.PI*2

);



ctx.fillStyle =
t.hit
?
"#00ff88"
:
"#ff3355";



ctx.fill();



ctx.font =
`${t.r}px serif`;



ctx.textAlign =
"center";


ctx.textBaseline =
"middle";



ctx.fillText(

t.hit
?
"💥"
:
"🎯",

x,

y

);



});




rafRef.current =
requestAnimationFrame(
render
);



};



render();



return()=>{


cancelAnimationFrame(
rafRef.current
);



};



},[
state
]);






// ─────────────────────────────────────────────
// Cleanup
// ─────────────────────────────────────────────


useEffect(()=>{


return()=>{


cancelAnimationFrame(
rafRef.current
);



if(videoRef.current?.srcObject){


(
videoRef.current
.srcObject as MediaStream
)
.getTracks()
.forEach(
t=>t.stop()
);



}



};


},[]);






// ─────────────────────────────────────────────
// Leaderboard
// ─────────────────────────────────────────────


const leaderboard = 
[...players]
.sort(
(a,b)=>
(b.score??0)-(a.score??0)
);






const formatTime=(s:number)=>{


return `00:${String(s).padStart(2,"0")}`;


};

return (

<div
style={{
width:"100%",
height:"100vh",
background:"#090914",
overflow:"hidden",
position:"relative",
color:"#fff",
fontFamily:"system-ui"
}}
>


{/* HUD */}

{state==="playing" && (

<div
style={{
position:"absolute",
top:0,
left:0,
right:0,
zIndex:20,
display:"flex",
justifyContent:"center",
gap:25,
padding:15,
background:"rgba(0,0,0,.55)",
backdropFilter:"blur(8px)"
}}
>


<div>
⏱ {formatTime(time)}
</div>


<div>
⚡ {combo}
</div>


<div>
🏆 {score}
</div>


</div>

)}





{/* Multiplayer leaderboard */}

{state==="playing" && (

<div

style={{

position:"absolute",

top:70,

right:20,

zIndex:30,

background:"rgba(0,0,0,.45)",

padding:15,

borderRadius:12,

minWidth:180

}}

>


<h3
style={{
margin:0,
marginBottom:10
}}
>
Players
</h3>



{

leaderboard.map(p=>(


<div

key={p.id}

style={{

display:"flex",

justifyContent:"space-between",

gap:20,

marginBottom:5

}}

>


<span>

{p.name ?? p.id}

</span>


<span>

{p.score ?? 0}

</span>


</div>


))

}


</div>


)}







{/* Game Area */}

<div

ref={areaRef}

style={{

position:"absolute",

inset:0

}}

>




{/* Camera */}


<video

ref={videoRef}

autoPlay

muted

playsInline


style={{

position:"absolute",

width:"100%",

height:"100%",

objectFit:"cover",

transform:"scaleX(-1)",

opacity:.25

}}


/>







{/* Targets Canvas */}

<canvas

ref={canvasRef}


style={{

position:"absolute",

inset:0,

width:"100%",

height:"100%"

}}


/>






{/* Idle */}


{state==="idle" && (


<div

style={{

position:"absolute",

inset:0,

display:"flex",

alignItems:"center",

justifyContent:"center",

background:"rgba(0,0,0,.7)"

}}

>


<div

style={{

background:"#151528",

padding:40,

borderRadius:20,

textAlign:"center"

}}

>


<h1>

🥊 Punch Targets

</h1>



<p>

Wait for the room host to start

</p>



<p>

Multiplayer battle mode

</p>


</div>


</div>


)}








{/* Loading */}

{state==="loading" && (


<div

style={{

position:"absolute",

inset:0,

display:"flex",

alignItems:"center",

justifyContent:"center",

background:"#000a"

}}

>


<h1>

Loading AI...

</h1>


</div>


)}








{/* Game End */}


{state==="ended" && (


<div

style={{

position:"absolute",

inset:0,

display:"flex",

alignItems:"center",

justifyContent:"center",

background:"rgba(0,0,0,.75)"

}}

>


<div

style={{

background:"#151528",

padding:40,

borderRadius:20,

textAlign:"center"

}}

>


<h1>

Game Over

</h1>


<h2>

Your Score

</h2>



<div

style={{

fontSize:60,

fontWeight:900,

color:"#00d4ff"

}}

>

{score}

</div>



<button

onClick={()=>setState("idle")}

style={{

marginTop:20,

padding:"12px 30px",

borderRadius:12,

border:0,

background:"#0066ff",

color:"#fff",

fontSize:18

}}

>

Exit

</button>


</div>


</div>


)}



</div>


</div>


);
