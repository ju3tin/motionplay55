import {send} from "./websocket.js";

import {
    loadMoveNet,
    detect
}
from "./movenet.js";



const video =
document.getElementById("video");


const status =
document.getElementById("status");



async function startCamera()
{

    const stream =
        await navigator.mediaDevices
        .getUserMedia({

            video:{
                width:640,
                height:480
            }

        });


    video.srcObject =
        stream;


    return new Promise(resolve=>{

        video.onloadedmetadata =
        ()=>resolve();

    });

}



async function start()
{

    await startCamera();


    await loadMoveNet();


    status.innerHTML =
        "MoveNet running";


    send({

        type:"tf_ready"

    });



    detectLoop();

}



async function detectLoop()
{

    const keypoints =
        await detect(video);



    if(keypoints)
    {

        send({

            type:"pose",

            keypoints:
                keypoints.map(k=>({

                    x:k.x,
                    y:k.y,
                    score:k.score

                }))

        });

    }


    requestAnimationFrame(
        detectLoop
    );

}



start();
