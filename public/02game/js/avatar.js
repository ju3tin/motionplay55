import * as THREE from
"https://cdn.jsdelivr.net/npm/three@0.160/build/three.module.js";


export function createAvatar()
{

let group =
new THREE.Group();



let mat =
new THREE.MeshBasicMaterial();


let body =
new THREE.Mesh(

new THREE.BoxGeometry(
.4,
1,
.3
),

mat

);


group.add(body);



return group;

}





export function animateAvatar(
avatar,
joints
)
{


if(!joints)
return;



avatar.rotation.x =
joints.leftShoulder
*
Math.PI/180;



}
