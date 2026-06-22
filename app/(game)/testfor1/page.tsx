"use client";

import { useGame } from "@/components/useGame";
import { useState } from "react";

export default function GamePage() {
  const roomId = "123";
  const state = useGame(roomId);

  const [pose, setPose] = useState("");

  function sendPose() {
    fetch("/api/game/shape", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId,
        playerId: "p1",
        pose,
      }),
    });
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>🎮 Shape Game</h1>

      <h2>Target: {state?.targetShape}</h2>

      <input
        value={pose}
        onChange={(e) => setPose(e.target.value)}
        placeholder="STAR / SQUAT / ARMS_UP"
      />

      <button onClick={sendPose}>Send Pose</button>

      <pre>{JSON.stringify(state?.players, null, 2)}</pre>
    </div>
  );
}
