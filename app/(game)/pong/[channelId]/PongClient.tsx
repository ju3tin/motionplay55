"use client";
import { use, useEffect, useRef, useState } from "react";
import PubNub from "pubnub";

/* ---------------- TYPES ---------------- */
type State = {
  ball: { x: number; y: number; vx: number; vy: number };
  left: number;
  right: number;
  scoreL: number;
  scoreR: number;
};

type PongMessage =
  | { type: "input"; side: "left" | "right"; y: number }
  | { type: "state"; state: State };

/* ---------------- TYPE GUARD ---------------- */
function isPongMessage(msg: unknown): msg is PongMessage {
  return typeof msg === "object" && msg !== null && "type" in msg;
}

/* ---------------- COMPONENT ---------------- */
export default function PongClient({
  params,
}: {
  params: Promise<{ channelId: string }>;
}) {
  const { channelId } = use(params);
  const channel = `pong-${channelId}`;
  const hostKey = `pong-host-${channelId}`;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isHost = useRef(false);
  const pubnubRef = useRef<PubNub | null>(null);
  const gameStateRef = useRef<State>({
    ball: { x: 400, y: 200, vx: 3, vy: 2 },
    left: 150,
    right: 150,
    scoreL: 0,
    scoreR: 0,
  });

  const [, forceRender] = useState({}); // For occasional UI sync

  /* ---------------- HOST SELECTION ---------------- */
  useEffect(() => {
    if (!localStorage.getItem(hostKey)) {
      localStorage.setItem(hostKey, "1");
      isHost.current = true;
    }
  }, [hostKey]);

  /* ---------------- PUBNUB SETUP ---------------- */
  useEffect(() => {
    const client = new PubNub({
      publishKey: process.env.NEXT_PUBLIC_PUBNUB_PUBLISH_KEY!,
      subscribeKey: process.env.NEXT_PUBLIC_PUBNUB_SUBSCRIBE_KEY!,
      userId: `user-${Math.random().toString(36).slice(2)}`,
    });

    pubnubRef.current = client;
    client.subscribe({ channels: [channel] });

    client.addListener({
      message: (msg) => {
        const data: unknown = msg.message;
        if (!isPongMessage(data)) return;

        if (data.type === "input") {
          gameStateRef.current[data.side === "left" ? "left" : "right"] = data.y;
        }

        if (data.type === "state" && !isHost.current) {
          gameStateRef.current = { ...data.state };
          forceRender({});
        }
      },
    });

    return () => {
      client.unsubscribeAll();
      client.stop();
    };
  }, [channel]);

  /* ---------------- INPUT ---------------- */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      let y = e.clientY - rect.top;
      y = Math.max(0, Math.min(320, y)); // 400 - 80 paddle height

      const side = isHost.current ? "left" : "right";
      gameStateRef.current[side] = y;

      pubnubRef.current?.publish({
        channel,
        message: { type: "input", side, y } satisfies PongMessage,
      });
    };

    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, [channel]);

  /* ---------------- GAME LOOP ---------------- */
  useEffect(() => {
    let frame: number;
    let lastSync = 0;

    const reset = (scoreL: number, scoreR: number): State => ({
      ...gameStateRef.current,
      scoreL,
      scoreR,
      ball: {
        x: 400,
        y: 200,
        vx: Math.random() > 0.5 ? 3 : -3,
        vy: (Math.random() - 0.5) * 4, // more variety
      },
    });

    const loop = (now: number) => {
      const state = gameStateRef.current;
      const b = state.ball;

      if (isHost.current) {
        // Update ball
        b.x += b.vx;
        b.y += b.vy;

        // Wall bounce
        if (b.y <= 8 || b.y >= 392) b.vy *= -1;

        // Paddle collision
        if (b.x < 28 && b.y > state.left - 8 && b.y < state.left + 88) {
          b.vx = Math.abs(b.vx);
        }
        if (b.x > 772 && b.y > state.right - 8 && b.y < state.right + 88) {
          b.vx = -Math.abs(b.vx);
        }

        // Scoring
        if (b.x < 0) {
          gameStateRef.current = reset(state.scoreL, state.scoreR + 1);
        } else if (b.x > 800) {
          gameStateRef.current = reset(state.scoreL + 1, state.scoreR);
        }

        // Sync to guests ~every 50ms (20 times/sec)
        if (now - lastSync > 50) {
          pubnubRef.current?.publish({
            channel,
            message: { type: "state", state: gameStateRef.current } satisfies PongMessage,
          });
          lastSync = now;
        }
      }

      draw();
      frame = requestAnimationFrame(loop);
    };

    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const s = gameStateRef.current;

      ctx.clearRect(0, 0, 800, 400);

      // Paddles
      ctx.fillStyle = "white";
      ctx.fillRect(10, s.left, 10, 80);
      ctx.fillRect(780, s.right, 10, 80);

      // Ball
      ctx.beginPath();
      ctx.arc(s.ball.x, s.ball.y, 8, 0, Math.PI * 2);
      ctx.fill();

      // Center line
      ctx.setLineDash([10, 10]);
      ctx.beginPath();
      ctx.moveTo(400, 0);
      ctx.lineTo(400, 400);
      ctx.strokeStyle = "#333";
      ctx.stroke();
      ctx.setLineDash([]);

      // Score
      ctx.font = "bold 36px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`${s.scoreL} : ${s.scoreR}`, 400, 50);
    };

    frame = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(frame);
  }, [channel]);

  /* ---------------- UI ---------------- */
  return (
    <div
      style={{
        textAlign: "center",
        background: "#111",
        color: "white",
        height: "100vh",
        paddingTop: "20px",
      }}
    >
      <h1>Room: {channelId}</h1>
      <p style={{ color: isHost.current ? "#4ade80" : "#60a5fa", fontWeight: "bold" }}>
        {isHost.current ? "🟢 HOST" : "🔵 GUEST"}
      </p>

      <canvas
        ref={canvasRef}
        width={800}
        height={400}
        style={{
          background: "#000",
          border: "2px solid #333",
          imageRendering: "pixelated",
        }}
      />

      <p style={{ marginTop: "10px", opacity: 0.7 }}>
        Move your mouse up/down to control your paddle
      </p>
    </div>
  );
}
