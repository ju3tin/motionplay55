// app/lib/poseDatabase.ts
export interface TargetPose {
  id: number;
  name: string;
  emoji: string;
  keypoints: any[]; // Pre-defined reference keypoints
}

export const targetPoses: TargetPose[] = [
  {
    id: 1,
    name: "Victory Pose",
    emoji: "✌️",
    keypoints: [] // Will be populated with real data pattern
  },
  {
    id: 2,
    name: "T-Pose",
    emoji: "✋",
    keypoints: []
  },
  {
    id: 3,
    name: "Superhero Pose",
    emoji: "🦸",
    keypoints: []
  },
  {
    id: 4,
    name: "Dance Freeze",
    emoji: "🕺",
    keypoints: []
  }
];

// Helper to generate realistic reference keypoints (for demo)
export function getReferenceKeypoints(poseId: number) {
  // In production, you would store real captured keypoints
  // This is a realistic simulation
  return Array.from({ length: 33 }, (_, i) => ({
    x: 0.4 + Math.sin(i) * 0.15,
    y: 0.3 + Math.cos(i) * 0.2,
    score: 0.95,
    name: `keypoint_${i}`
  }));
}
