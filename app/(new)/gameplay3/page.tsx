"use client";

import PunchTargets from "@/components/PunchTargets";

export default function Gameplay2Page() {
  return (
    <PunchTargets
      onScore={(score) => {
        console.log("Score:", score);

        // optional global hook
        if (typeof window !== "undefined") {
          window.__motionplay_score?.(score);
        }
      }}
    />
  );
}
