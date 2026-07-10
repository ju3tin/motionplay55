const video =
document.getElementById("video");

const canvas =
document.getElementById("canvas");

const ctx =
canvas.getContext("2d");


// WebSocket connection
const socket = new WebSocket(
    "wss://tensorflowjs-multiplayer-backend-1.onrender.com"
);


socket.onopen = ()=>{

    console.log("WebSocket connected");

    socket.send(JSON.stringify({
        type:"tf_ready"
    }));

};


socket.onmessage = (event)=>{

    const data =
    JSON.parse(event.data);

    console.log(
        "Server:",
        data
    );

};



let detector;



async function setupCamera()
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

        video.onloadedmetadata=()=>{

            resolve();

        };

    });

}



function drawSkeleton(points)
{

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );


    // Draw joints

    points.forEach(p=>{

        if(p.score > 0.5)
        {

            ctx.beginPath();

            ctx.arc(
                p.x,
                p.y,
                6,
                0,
                Math.PI*2
            );

            ctx.fill();

        }

    });



    // Bones

    const bones=[

        [5,6],

        [5,7],
        [7,9],

        [6,8],
        [8,10],

        [5,11],
        [6,12],

        [11,13],
        [13,15],

        [12,14],
        [14,16]

    ];



    bones.forEach(b=>{

        const a =
        points[b[0]];

        const c =
        points[b[1]];


        if(
            a.score > .5 &&
            c.score > .5
        )
        {

            ctx.beginPath();

            ctx.moveTo(
                a.x,
                a.y
            );

            ctx.lineTo(
                c.x,
                c.y
            );

            ctx.stroke();

        }

    });

}




function sendPose(points)
{

    if(socket.readyState !== WebSocket.OPEN)
        return;


    socket.send(JSON.stringify({

        type:"pose",

        keypoints:

        points.map(p=>({

            x:p.x,
            y:p.y,
            score:p.score

        }))

    }));

}





async function run()
{

    await setupCamera();


    detector =
    await poseDetection.createDetector(

        poseDetection.SupportedModels.MoveNet,

        {

        modelType:
        poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING

        }

    );


    console.log(
        "MoveNet ready"
    );


    detectLoop();

}




async function detectLoop()
{

    const poses =
    await detector.estimatePoses(video);



    if(poses.length)
    {

        const points =
        poses[0].keypoints;


        // local skeleton
        drawSkeleton(points);


        // send to server
        sendPose(points);

    }


    requestAnimationFrame(
        detectLoop
    );

}



run();
