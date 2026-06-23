"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { getPubNub } from "./client";
import { GameMessage } from "./types";

type Options = {
  roomId: string;
  userId: string;
  onMessage?: (message: GameMessage) => void;
};

export function useGameRoom({
  roomId,
  userId,
  onMessage,
}: Options) {
  const pubnub = useMemo(
    () => getPubNub(userId),
    [userId]
  );

  const listenerRef = useRef(onMessage);

  useEffect(() => {
    listenerRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    const channel = `room:${roomId}`;

    const listener = {
      message: (event: any) => {
        const msg = event.message as GameMessage;
        listenerRef.current?.(msg);
      },
    };

    pubnub.addListener(listener);

    pubnub.subscribe({
      channels: [channel],
    });

    return () => {
      pubnub.removeListener(listener);

      pubnub.unsubscribe({
        channels: [channel],
      });
    };
  }, [pubnub, roomId]);

  const publish = useCallback(
    async (message: GameMessage) => {
      await pubnub.publish({
        channel: `room:${roomId}`,
        message,
      });
    },
    [pubnub, roomId]
  );

  return {
    publish,
    channel: `room:${roomId}`,
  };
}
