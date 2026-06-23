"use client";

import { useState } from "react";
import { useGameRoom } from "@/lib/pubnub/useGameRoom";
import { useParams } from "next/navigation";
import { GameMessage } from "@/lib/pubnub/types";

export default function TestRoom() {
  const params = useParams();
  const roomId = params.roomId as string;

  const [userId] = useState(
    () => crypto.randomUUID()
  );

  const [messages, setMessages] = useState<GameMessage[]>([]);

  const { publish } = useGameRoom({
    roomId,
    userId,
    onMessage: (msg) => {
      setMessages((prev) => [msg, ...prev]);
    },
  });

  return (
    <div style={{ padding: 20 }}>
      <h1>Room: {roomId}</h1>

      <button
        onClick={() =>
          publish({
            type: "chat",
            userId,
            text: "hello",
          })
        }
      >
        Send Message
      </button>

      <pre>
        {JSON.stringify(messages, null, 2)}
      </pre>
    </div>
  );
}
