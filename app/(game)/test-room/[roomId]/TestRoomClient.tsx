"use client";

import { use, useEffect, useState } from "react";
import { useGameRoom } from "@/lib/pubnub/useGameRoom";

type Msg =
  | { type: "chat"; text: string; userId: string }
  | { type: "input"; x: number; y: number };

export default function TestRoomClient({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = use(params);

  const [userId] = useState(() =>
    crypto.randomUUID()
  );

  const [messages, setMessages] = useState<Msg[]>([]);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const { publish, channel } = useGameRoom({
    roomId,
    userId,
    onMessage: (msg: Msg) => {
      setMessages((prev) => [msg, ...prev]);
    },
  });

  // mouse move test (real-time sync)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const x = e.clientX;
      const y = e.clientY;

      setPos({ x, y });

      publish({
        type: "input",
        x,
        y,
      });
    };

    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, [publish]);

  return (
    <div style={{ padding: 20, fontFamily: "sans-serif" }}>
      <h2>Test Room: {roomId}</h2>
      <p>User: {userId}</p>
      <p>Channel: {channel}</p>

      <div
        style={{
          width: 10,
          height: 10,
          background: "red",
          position: "absolute",
          left: pos.x,
          top: pos.y,
          borderRadius: "50%",
        }}
      />

      <hr />

      <button
        onClick={() =>
          publish({
            type: "chat",
            userId,
            text: "hello",
          })
        }
      >
        Send Chat
      </button>

      <h3>Messages</h3>

      {messages.map((m, i) => (
        <pre key={i}>{JSON.stringify(m, null, 2)}</pre>
      ))}
    </div>
  );
}
