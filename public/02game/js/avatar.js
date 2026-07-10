import * as THREE from
"https://cdn.jsdelivr.net/npm/three@0.160/build/three.module.js";


export function createAvatar()
{

    const group =
    new THREE.Group();


    const material =
    new THREE.MeshNormalMaterial();



    // head

    const head =
    new THREE.Mesh(

        new THREE.SphereGeometry(
            0.25,
            16,
            16
        ),

        material

    );


    head.position.y = 2;


    group.add(head);



    // body

    const body =
    new THREE.Mesh(

        new THREE.BoxGeometry(
            0.5,
            1,
            0.3
        ),

        material

    );


    body.position.y = 1.2;


    group.add(body);



    // arms

    const armGeometry =
    new THREE.BoxGeometry(
        0.12,
        0.8,
        0.12
    );


    const leftArm =
    new THREE.Mesh(
        armGeometry,
        material
    );


    leftArm.position.set(
        -0.45,
        1.3,
        0
    );


    group.add(leftArm);



    const rightArm =
    new THREE.Mesh(
        armGeometry,
        material
    );


    rightArm.position.set(
        0.45,
        1.3,
        0
    );


    group.add(rightArm);



    // legs

    const legGeometry =
    new THREE.BoxGeometry(
        0.15,
        0.9,
        0.15
    );


    const leftLeg =
    new THREE.Mesh(
        legGeometry,
        material
    );


    leftLeg.position.set(
        -0.18,
        0.2,
        0
    );


    group.add(leftLeg);



    const rightLeg =
    leftLeg.clone();


    rightLeg.position.x =
    0.18;


    group.add(rightLeg);



    return group;

}




export function animateAvatar(
avatar,
joints
)
{

    if(!joints)
        return;


    // test movement

    avatar.rotation.y =
    joints.leftShoulder *
    Math.PI/180;


}
