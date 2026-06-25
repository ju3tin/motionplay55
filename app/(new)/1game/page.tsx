"use client";

import { useEffect, useRef, useState } from "react";

interface Keypoint {
  x: number;
  y: number;
  score: number;
}

interface Point {
  x: number;
  y: number;
}

const CONNECTIONS: [number, number][] = [
  [5, 6],
  [5, 7],
  [7, 9],
  [6, 8],
  [8, 10],
  [5, 11],
  [6, 12],
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [0, 1],
  [1, 3],
  [0, 2],
  [2, 4],
];


// Normalized target poses
const TARGETS = [
  {
    name: "T Pose",
    pose: [
      { x: 0, y: -2 },
      { x: 0, y: -2 },

      { x: -0.5, y: -1.8 },
      { x: 0.5, y: -1.8 },

      { x: -1.8, y: -1 },
      { x: 1.8, y: -1 },

      { x: -1, y: 0 },
      { x: 1, y: 0 },

      { x: -1.2, y: 1.2 },
      { x: 1.2, y: 1.2 },

      { x: -0.7, y: 1.5 },
      { x: 0.7, y: 1.5 },

      { x: -0.8, y: 2.5 },
      { x: 0.8, y: 2.5 },

      { x: -0.8, y: 3.5 },
      { x: 0.8, y: 3.5 },

      { x: -0.8, y: 3.5 },
    ],
  },
];


export default function Game() {

  const videoRef =
    useRef<HTMLVideoElement>(null);

  const canvasRef =
    useRef<HTMLCanvasElement>(null);


  const detector =
    useRef<any>(null);


  const points =
    useRef<Keypoint[]>([]);



  const [ready,setReady] =
    useState(false);


  const [score,setScore] =
    useState(0);


  const [level,setLevel] =
    useState(0);


  const [hold,setHold] =
    useState(0);



  function normalizePose(
    k: Keypoint[]
  ): Point[] {


    const hipX =
      (k[11].x + k[12].x) / 2;

    const hipY =
      (k[11].y + k[12].y) / 2;


    const scale =
      Math.hypot(
        k[5].x - k[6].x,
        k[5].y - k[6].y
      ) || 1;



    return k.map(p=>({

      x:
      (p.x - hipX) / scale,

      y:
      (p.y - hipY) / scale

    }));

  }




  function comparePose(
    a:Point[],
    b:Point[]
  ){

    let total = 0;


    for(
      let i=0;
      i<a.length;
      i++
    ){

      total += Math.hypot(
        a[i].x - b[i].x,
        a[i].y - b[i].y
      );

    }


    const avg =
      total / a.length;


    return Math.max(
      0,
      100 - avg * 40
    );

  }





  useEffect(()=>{


    async function start(){


      const tf =
      await import("@tensorflow/tfjs");


      await import(
        "@tensorflow/tfjs-backend-webgl"
      );


      await tf.setBackend(
        "webgl"
      );


      await tf.ready();



      const pd =
      await import(
        "@tensorflow-models/pose-detection"
      );



      detector.current =
      await pd.createDetector(
        pd.SupportedModels.MoveNet,
        {
          modelType:
          pd.movenet
          .modelType
          .SINGLEPOSE_LIGHTNING
        }
      );



      const stream =
      await navigator.mediaDevices
      .getUserMedia({
        video:{
          width:1280,
          height:720
        }
      });



      const video =
      videoRef.current!;


      video.srcObject =
      stream;


      await video.play();



      setReady(true);


    }



    start();


  },[]);





  useEffect(()=>{


    if(!ready)
      return;



    let active=true;



    async function detect(){


      while(active){


        const poses =
        await detector.current
        .estimatePoses(
          videoRef.current!
        );



        if(
          poses &&
          poses.length
        ){

          points.current =
          poses[0].keypoints;

        }



        await new Promise(r=>
          setTimeout(r,80)
        );


      }


    }


    detect();



    return()=>{
      active=false;
    }



  },[ready]);







  useEffect(()=>{


    if(!ready)
      return;



    const canvas =
    canvasRef.current!;


    const ctx =
    canvas.getContext("2d")!;



    canvas.width =
    window.innerWidth;


    canvas.height =
    window.innerHeight;





    function draw(){


      requestAnimationFrame(draw);



      ctx.fillStyle="#000";


      ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
      );



      const k =
      points.current;



      if(k.length){


        const player =
        normalizePose(k);



        const target =
        TARGETS[level].pose;



        const s =
        comparePose(
          player,
          target
        );



        setScore(
          Math.round(s)
        );



        if(s>85){


          setHold(h=>{


            if(h>=25){


              setLevel(
                x=>
                (x+1)
                %
                TARGETS.length
              );


              return 0;


            }


            return h+1;


          });


        }
        else{


          setHold(0);


        }






        ctx.strokeStyle =
        "#00ffcc";


        ctx.lineWidth=6;



        for(
          const [a,b]
          of CONNECTIONS
        ){


          const A=k[a];
          const B=k[b];


          if(!A||!B)
            continue;



          ctx.beginPath();


          ctx.moveTo(
            A.x,
            A.y
          );


          ctx.lineTo(
            B.x,
            B.y
          );


          ctx.stroke();


        }


      }






      // draw ghost


      const ghost =
      TARGETS[level].pose;



      ctx.globalAlpha=.35;


      ctx.strokeStyle="#ff0066";


      ctx.lineWidth=10;



      for(
        let i=1;
        i<ghost.length;
        i++
      ){


        ctx.beginPath();


        ctx.moveTo(
          canvas.width/2+
          ghost[i-1].x*80,

          canvas.height/2+
          ghost[i-1].y*80
        );


        ctx.lineTo(
          canvas.width/2+
          ghost[i].x*80,

          canvas.height/2+
          ghost[i].y*80
        );


        ctx.stroke();


      }



      ctx.globalAlpha=1;



    }



    draw();



  },[
    ready,
    level
  ]);





  return (

<div
style={{
width:"100vw",
height:"100vh",
overflow:"hidden",
background:"#000"
}}
>


<video
ref={videoRef}
style={{
display:"none"
}}
/>


<canvas
ref={canvasRef}
style={{
width:"100%",
height:"100%"
}}
/>



<div
style={{
position:"absolute",
top:30,
left:30,
color:"#fff",
fontSize:32,
fontFamily:"monospace"
}}
>

<div>
Pose:
{TARGETS[level].name}
</div>

<div>
Match:
{score}%
</div>


<div>
Hold:
{Math.round(
hold/25*2
)}s
</div>


</div>


</div>

  );

}
