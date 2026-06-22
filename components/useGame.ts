"use client";

import { useEffect, useState } from "react";
import { pubnub } from "@/lib/pubnub";

export function useGame(roomId: string) {
  const [state, setState] = useState<any>(null);

  useEffect(() => {
    const channel = `game-${roomId}`;

    console.log("🔌 SUBSCRIBE:", channel);

    pubnub.subscribe({ channels: [channel] });

    const listener = {
      message(event: any) {
        console.log("📩 RECEIVED:", event.message);

        if (event.message.type === "GAME_STATE") {
          setState(event.message.state);
        }
      },
    };

    pubnub.addListener(listener);

    return () => {
      pubnub.removeListener(listener);
      pubnub.unsubscribeAll();
    };
  }, [roomId]);

  return state;
}
