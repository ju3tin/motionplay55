"use client";

import { useEffect, useMemo, useRef } from "react";
import { pubnub } from "./client";

type Options<T> = {
  roomId: string;
  onMessage: (msg: T) => void;
};

export function useGameRoom<T>({ roomId, onMessage }: Options<T>) {
  const channel = `room:${roomId}`;
  const listenerRef = useRef(onMessage);

  useEffect(() => {
    listenerRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    const listener = {
      message: (event: any) => {
        listenerRef.current(event.message as T);
      },
    };

    pubnub.addListener(listener);
    pubnub.subscribe({ channels: [channel] });

    return () => {
      pubnub.removeListener(listener);
      pubnub.unsubscribe({ channels: [channel] });
    };
  }, [channel]);

  const publish = async (message: T) => {
    await pubnub.publish({
      channel,
      message: message as any,
    });
  };

  return { publish, channel };
}
