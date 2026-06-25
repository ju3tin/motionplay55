import { useEffect, useState } from 'react';
import * as poseDetection from '@tensorflow-models/pose-detection';

export function usePoseDetection() {
  const [detector, setDetector] = useState<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const model = await poseDetection.createDetector(
          poseDetection.SupportedModels.BlazePose,
          { runtime: 'mediapipe', modelType: 'lite' }
        );
        if (mounted) {
          setDetector(model);
          setIsLoaded(true);
        }
      } catch (err) {
        if (mounted) {
          setError("Failed to load pose model");
          console.error(err);
        }
      }
    };

    load();
    return () => { mounted = false; };
  }, []);

  return { detector, isLoaded, error };
}
