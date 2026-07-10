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



const camera =
new THREE.PerspectiveCamera(
60,
innerWidth/innerHeight,
0.1,
1000
);


camera.position.z=5;



const renderer =
new THREE.WebGLRenderer();


renderer.setSize(
innerWidth,
innerHeight
);


document.body.appendChild(
renderer.domElement
);



let players={};



socket.onmessage=e=>{


let data =
JSON.parse(e.data);



if(data.type==="state")
{


data.players.forEach(p=>{


if(!players[p.id])
{

players[p.id]=
createAvatar();

scene.add(
players[p.id]
);

}



animateAvatar(
players[p.id],
p.joints
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
