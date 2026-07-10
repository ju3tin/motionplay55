import * as THREE from
"https://cdn.jsdelivr.net/npm/three@0.160/build/three.module.js";


import socket from "./websocket.js";


import {
createAvatar,
updateAvatar
}
from "./avatar.js";




const scene =
new THREE.Scene();



scene.background =
new THREE.Color(
0x202020
);



const camera =
new THREE.PerspectiveCamera(

60,

window.innerWidth/
window.innerHeight,

0.1,

1000

);



camera.position.set(
0,
2,
5
);





const renderer =
new THREE.WebGLRenderer();


renderer.setSize(
window.innerWidth,
window.innerHeight
);


document.body.appendChild(
renderer.domElement
);





// light

const light =
new THREE.DirectionalLight(
0xffffff,
2
);


light.position.set(
0,
5,
5
);


scene.add(light);





// floor

const floor =
new THREE.Mesh(

new THREE.PlaneGeometry(
20,
20
),

new THREE.MeshBasicMaterial({
color:0x333333
})

);



floor.rotation.x =
-Math.PI/2;


scene.add(floor);





let players={};





socket.onmessage=(event)=>{


const data =
JSON.parse(event.data);



if(data.type==="state")
{


document.getElementById(
"info"
).innerHTML =
"Players: "
+
data.playerCount;



data.players.forEach(player=>{


if(!players[player.id])
{

players[player.id]=
createAvatar();


scene.add(
players[player.id]
);


}



updateAvatar(

players[player.id],

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
