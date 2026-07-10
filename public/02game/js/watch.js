import * as THREE from
"https://cdn.jsdelivr.net/npm/three@0.160/build/three.module.js";


import socket from "./websocket.js";

import {
createAvatar,
animateAvatar
}
from "./avatar.js";



const scene =
new THREE.Scene();


scene.background =
new THREE.Color(0x202020);



const camera =
new THREE.PerspectiveCamera(

60,

window.innerWidth /
window.innerHeight,

0.1,

1000

);



camera.position.set(
0,
2,
6
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



// floor

const floor =
new THREE.Mesh(

new THREE.PlaneGeometry(
20,
20
),

new THREE.MeshNormalMaterial()

);


floor.rotation.x =
-Math.PI/2;


scene.add(floor);





let players={};



socket.onmessage=(event)=>{


const data =
JSON.parse(event.data);


console.log(
"SERVER",
data
);



if(data.type==="state")
{


data.players.forEach(player=>{


if(!players[player.id])
{

console.log(
"Creating avatar",
player.id
);


players[player.id] =
createAvatar();


scene.add(
players[player.id]
);


players[player.id].position.x =
Object.keys(players).length-1;


}



animateAvatar(

players[player.id],

player.joints

);



});



}


};





function loop()
{

requestAnimationFrame(loop);


renderer.render(
scene,
camera
);

}


loop();
