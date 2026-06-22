"use client";

import { useGameChannel } from "@/components/pubnub/useGameChannel";
import { GameHUD } from "@/components/game/GameHUD";

export default function GamePage() {
  const roomId = "123"; // later: use params
  const { gameState } = useGameChannel(roomId);

  return (
    <div style={{ padding: 20 }}>
      <h1>🎮 Shape Game</h1>

      <GameHUD gameState={gameState} />
    </div>
  );
}
