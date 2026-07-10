import * as THREE from
"https://cdn.jsdelivr.net/npm/three@0.160/build/three.module.js";



export function createAvatar()
{

    const group =
    new THREE.Group();



    const material =
    new THREE.MeshBasicMaterial({
        wireframe:true
    });



    // head

    const head =
    new THREE.Mesh(

        new THREE.SphereGeometry(
            0.15
        ),

        material

    );


    head.position.y=1.7;


    group.add(head);



    // body

    const body =
    new THREE.Mesh(

        new THREE.BoxGeometry(
            .3,
            .8,
            .2
        ),

        material

    );


    body.position.y=1.1;


    group.add(body);



    // arms

    const armL =
    new THREE.Mesh(

        new THREE.BoxGeometry(
            .1,
            .6,
            .1
        ),

        material

    );


    armL.position.set(
        -.35,
        1.2,
        0
    );


    group.add(armL);



    const armR =
    armL.clone();


    armR.position.x=.35;


    group.add(armR);



    // legs

    const legL =
    new THREE.Mesh(

        new THREE.BoxGeometry(
            .12,
            .7,
            .12
        ),

        material

    );


    legL.position.set(
        -.12,
        .35,
        0
    );


    group.add(legL);



    const legR =
    legL.clone();


    legR.position.x=.12;


    group.add(legR);



    return group;

}




export function updateAvatar(
avatar,
pose
)
{

    if(!pose)
        return;


    // use nose position
    // to move player


    const nose =
    pose[0];


    if(nose)
    {

        avatar.position.x =
        (nose.x-320)/100;


        avatar.position.z =
        (nose.y-240)/100;

    }

}
