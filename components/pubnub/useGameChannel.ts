// components/pubnub/useGameChannel.ts
"use client";

import { useEffect, useState } from "react";
import { pubnub } from "@/lib/pubnub";

export function useGameChannel(roomId: string, token?: string) {
  const [gameState, setGameState] = useState<any>(null);

  useEffect(() => {
    if (!roomId) return;

    const channel = `game-${roomId}`;

    console.log("🔌 Subscribing to:", channel);

    if (token) {
      pubnub.setToken(token);
    }

    pubnub.subscribe({
      channels: [channel],
    });

    const listener = {
      message(event: any) {
        console.log("📩 EVENT RECEIVED:", event.message);

        const msg = event.message;

        if (msg.type === "GAME_STATE") {
          setGameState(msg.state);
        }
      },
    };

    pubnub.addListener(listener);

    return () => {
      console.log("❌ Unsubscribing:", channel);
      pubnub.removeListener(listener);
      pubnub.unsubscribeAll();
    };
  }, [roomId, token]);

  return { gameState };
}
