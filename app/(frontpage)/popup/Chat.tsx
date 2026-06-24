"use client";

import { useEffect, useRef, useState } from "react";

type Message = {
  type: string;
  room?: string;
  message: string;
};

export default function Chat() {
  const ws = useRef<WebSocket | null>(null);

  const [room, setRoom] = useState("general");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_WS_URL!;
    ws.current = new WebSocket(url);

    ws.current.onopen = () => {
      setConnected(true);
      console.log("WebSocket connected");
    };

    ws.current.onmessage = (event) => {
      const data: Message = JSON.parse(event.data);

      if (data.type === "message") {
        setMessages((prev) => [
          ...prev,
          `[${data.room}] ${data.message}`,
        ]);
      }

      if (data.type === "system") {
        setMessages((prev) => [...prev, `SYSTEM: ${data.message}`]);
      }
    };

    ws.current.onclose = () => {
      setConnected(false);
    };

    return () => {
      ws.current?.close();
    };
  }, []);

  const joinRoom = (roomName: string) => {
    if (!ws.current) return;

    ws.current.send(
      JSON.stringify({
        type: "join",
        room: roomName,
      })
    );

    setRoom(roomName);
  };

  const sendMessage = () => {
    if (!ws.current || !input.trim()) return;

    ws.current.send(
      JSON.stringify({
        type: "message",
        message: input,
      })
    );

    setInput("");
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.sidebar}>
        <h3>Rooms</h3>

        <button onClick={() => joinRoom("general")}>
          # general
        </button>

        <button onClick={() => joinRoom("random")}>
          # random
        </button>

        <p style={{ marginTop: 20 }}>
          Status: {connected ? "🟢 online" : "🔴 offline"}
        </p>
      </div>

      <div style={styles.chat}>
        <h2>Room: {room}</h2>

        <div style={styles.messages}>
          {messages.map((m, i) => (
            <div key={i} style={styles.message}>
              {m}
            </div>
          ))}
        </div>

        <div style={styles.inputBar}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type message..."
            style={styles.input}
          />
          <button onClick={sendMessage} style={styles.button}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: "flex",
    height: "100vh",
    fontFamily: "sans-serif",
  },
  sidebar: {
    width: 200,
    padding: 20,
    borderRight: "1px solid #ddd",
  },
  chat: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    padding: 20,
  },
  messages: {
    flex: 1,
    overflowY: "auto",
    border: "1px solid #eee",
    padding: 10,
    marginBottom: 10,
  },
  message: {
    padding: "6px 0",
  },
  inputBar: {
    display: "flex",
    gap: 10,
  },
  input: {
    flex: 1,
    padding: 10,
  },
  button: {
    padding: "10px 15px",
    cursor: "pointer",
  },
};
