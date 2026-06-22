"use client";

import { ShapeDisplay } from "./ShapeDisplay";
import { PlayerList } from "./PlayerList";

export function GameHUD({ gameState }: { gameState: any }) {
  if (!gameState) {
    return <div>Waiting for game...</div>;
  }

  return (
    <div>
      <ShapeDisplay shape={gameState.targetShape} />
      <PlayerList players={gameState.players} />
    </div>
  );
}
