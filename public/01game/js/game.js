import socket from "./websocket.js";


const video =
document.getElementById("video");

const canvas =
document.getElementById("canvas");

const ctx =
canvas.getContext("2d");


let detector;



function log(name,data)
{
    console.log(
        `[GAME] ${name}`,
        data
    );
}



socket.onopen=()=>{

    log(
        "WebSocket connected"
    );


    socket.send(JSON.stringify({

        type:"tf_ready"

    }));


    log(
        "Sent TensorFlow ready"
    );

};



socket.onmessage=(event)=>{

    const data =
    JSON.parse(event.data);


    log(
        "SERVER MESSAGE",
        data
    );


};





async function camera()
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


    log(
        "Camera started"
    );

}





function draw(points)
{

    ctx.clearRect(
        0,
        0,
        640,
        480
    );


    points.forEach(p=>{


        if(p.score>.5)
        {

            ctx.beginPath();

            ctx.arc(
                p.x,
                p.y,
                5,
                0,
                Math.PI*2
            );


            ctx.fill();

        }


    });


}




function sendPose(points)
{


    const pose =
    points.map(p=>({

        x:p.x,
        y:p.y,
        score:p.score

    }));



    log(
        "Sending pose",
        pose
    );



    socket.send(JSON.stringify({

        type:"pose",

        keypoints:pose

    }));

}





async function loop()
{

    const poses =
    await detector
    .estimatePoses(video);



    if(poses.length)
    {

        let points =
        poses[0].keypoints;


        draw(points);


        sendPose(points);


    }


    requestAnimationFrame(loop);

}





async function start()
{

    await camera();


    detector =
    await poseDetection
    .createDetector(

        poseDetection.SupportedModels.MoveNet,

        {
        modelType:
        poseDetection.movenet.modelType
        .SINGLEPOSE_LIGHTNING
        }

    );



    log(
        "MoveNet loaded"
    );


    loop();

}



start();
