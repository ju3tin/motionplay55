// app/hooks/usePoseDetection.ts
import { useEffect, useRef, useState } from 'react';
import * as poseDetection from '@tensorflow-models/pose-detection';

export function usePoseDetection() {
  const [detector, setDetector] = useState<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadModel = async () => {
      try {
        const model = await poseDetection.createDetector(
          poseDetection.SupportedModels.BlazePose,
          { runtime: 'mediapipe', modelType: 'lite' }
        );
        setDetector(model);
        setIsLoaded(true);
      } catch (err) {
        console.error(err);
        setError("Failed to load pose model");
      }
    };
    loadModel();
  }, []);

  return { detector, isLoaded, error };
}
