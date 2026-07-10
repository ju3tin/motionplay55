import socket from "./websocket.js";


import * as THREE from
"https://cdn.jsdelivr.net/npm/three@0.160/build/three.module.js";



const scene =
new THREE.Scene();



const camera =
new THREE.PerspectiveCamera(

45,
window.innerWidth/window.innerHeight,
0.1,
1000

);


camera.position.z=5;



const renderer =
new THREE.WebGLRenderer();


renderer.setSize(
window.innerWidth,
window.innerHeight
);


document.body.appendChild(
renderer.domElement
);





let avatars={};





function createAvatar()
{

const group =
new THREE.Group();



const material =
new THREE.LineBasicMaterial();



const geometry =
new THREE.BufferGeometry();



const points=[

new THREE.Vector3(0,1,0),

new THREE.Vector3(0,0,0),

new THREE.Vector3(0,-1,0)

];



geometry.setFromPoints(points);


const body =
new THREE.Line(
geometry,
material
);


group.add(body);



scene.add(group);



return group;

}





function updateAvatar(
avatar,
pose
)
{

if(!pose)
return;



// simple body height mapping

let head =
pose[0];


if(head)
{

avatar.position.y =
-(head.y/100);

}


}





socket.onmessage=(event)=>{


const data =
JSON.parse(event.data);



if(data.type==="state")
{


document.getElementById(
"players"
).innerHTML =
"Players: "
+data.playerCount;



data.players.forEach(player=>{


if(!avatars[player.id])
{

avatars[player.id]=
createAvatar();

}



updateAvatar(

avatars[player.id],

player.pose

);



});



}



};





function animate()
{

requestAnimationFrame(
animate
);


renderer.render(
scene,
camera
);

}


animate();
