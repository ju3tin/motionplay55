"use client";

import { useEffect, useState } from "react";
import { useGameRoom } from "@/lib/pubnub/useGameRoom";
import { GameMessage } from "@/lib/pubnub/types1";

export default function TestRoomClient({
  roomId,
}: {
  roomId: string;
}) {
  const [userId] = useState(() => crypto.randomUUID());

  const [messages, setMessages] = useState<GameMessage[]>([]);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const { publish, channel } = useGameRoom<GameMessage>({
    roomId,
    onMessage: (msg) => {
      if (msg.type === "chat") {
        setMessages((prev) => [msg, ...prev]);
      }

      if (msg.type === "input") {
        setPos({ x: msg.x, y: msg.y });
      }
    },
  });

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
    <div style={{ padding: 20 }}>
      <h2>Room: {roomId}</h2>
      <p>User: {userId}</p>
      <p>Channel: {channel}</p>

      {/* moving dot */}
      <div
        style={{
          position: "absolute",
          left: pos.x,
          top: pos.y,
          width: 10,
          height: 10,
          background: "red",
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

      <pre>
        {JSON.stringify(messages, null, 2)}
      </pre>
    </div>
  );
}
