let detector;


export async function loadMoveNet()
{

    detector =
        await poseDetection.createDetector(
            poseDetection.SupportedModels.MoveNet,
            {
                modelType:
                poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING
            }
        );


    console.log(
        "MoveNet loaded"
    );

}



export async function detect(video)
{

    if(!detector)
        return null;


    const poses =
        await detector.estimatePoses(video);


    if(poses.length === 0)
        return null;


    return poses[0].keypoints;

}
