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

/* ---------------- MAIN COMPONENT ---------------- */
export default function PongGame({
  params,
}: {
  params: Promise<{ channelId: string }>;
}) {
  const { channelId } = use(params);
  const channel = `pong-${channelId}`;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isHost = useRef(false);
  const pubnubRef = useRef<PubNub | null>(null);

  const gameStateRef = useRef<State>({
    ball: { x: 400, y: 200, vx: 3.5, vy: 2 },
    left: 160,
    right: 160,
    scoreL: 0,
    scoreR: 0,
  });

  const [, forceUpdate] = useState({});

  // ==================== HOST SELECTION ====================
  useEffect(() => {
    const hostKey = `pong-host-${channelId}`;
    if (!localStorage.getItem(hostKey)) {
      localStorage.setItem(hostKey, "true");
      isHost.current = true;
    }
  }, [channelId]);

  // ==================== PUBNUB SETUP ====================
  useEffect(() => {
    const pubnub = new PubNub({
      publishKey: process.env.NEXT_PUBLIC_PUBNUB_PUBLISH_KEY!,
      subscribeKey: process.env.NEXT_PUBLIC_PUBNUB_SUBSCRIBE_KEY!,
      userId: `user-${Math.random().toString(36).substring(2)}`,
    });

    pubnubRef.current = pubnub;
    pubnub.subscribe({ channels: [channel] });

    pubnub.addListener({
      message: (messageEvent) => {
        const data = messageEvent.message;
        if (!isPongMessage(data)) return;

        if (data.type === "input") {
          gameStateRef.current[data.side] = data.y;
        }

        if (data.type === "state" && !isHost.current) {
          gameStateRef.current = { ...data.state };
          forceUpdate({});
        }
      },
    });

    return () => {
      pubnub.unsubscribeAll();
    };
  }, [channel]);

  // ==================== MOUSE INPUT ====================
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      let y = e.clientY - rect.top;
      y = Math.max(0, Math.min(320, y)); // 400 - 80 paddle height

      const side = isHost.current ? "left" : "right";
      gameStateRef.current[side] = y;

      pubnubRef.current?.publish({
        channel,
        message: { type: "input", side, y } as PongMessage,
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [channel]);

  // ==================== GAME LOOP ====================
  useEffect(() => {
    let frame: number;
    let lastSync = 0;

    const resetBall = (scoreL: number, scoreR: number) => {
      gameStateRef.current = {
        ...gameStateRef.current,
        scoreL,
        scoreR,
        ball: {
          x: 400,
          y: 200,
          vx: Math.random() > 0.5 ? 3.8 : -3.8,
          vy: (Math.random() - 0.5) * 5,
        },
      };
    };

    const gameLoop = (timestamp: number) => {
      const state = gameStateRef.current;
      const b = state.ball;

      if (isHost.current) {
        // Ball movement
        b.x += b.vx;
        b.y += b.vy;

        // Top / Bottom wall bounce
        if (b.y <= 10 || b.y >= 390) b.vy *= -1;

        // Paddle collision
        if (b.x <= 30 && b.y >= state.left - 10 && b.y <= state.left + 90) {
          b.vx = Math.abs(b.vx) * 1.03;
        }
        if (b.x >= 770 && b.y >= state.right - 10 && b.y <= state.right + 90) {
          b.vx = -Math.abs(b.vx) * 1.03;
        }

        // Scoring
        if (b.x < 0) resetBall(state.scoreL, state.scoreR + 1);
        if (b.x > 800) resetBall(state.scoreL + 1, state.scoreR);

        // Sync state to other player
        if (timestamp - lastSync > 40) {
          pubnubRef.current?.publish({
            channel,
            message: { type: "state", state: gameStateRef.current } as PongMessage,
          });
          lastSync = timestamp;
        }
      }

      draw();
      frame = requestAnimationFrame(gameLoop);
    };

    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const s = gameStateRef.current;

      ctx.clearRect(0, 0, 800, 400);

      // Background
      ctx.fillStyle = "#000011";
      ctx.fillRect(0, 0, 800, 400);

      // Paddles
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(15, s.left, 12, 80);
      ctx.fillRect(773, s.right, 12, 80);

      // Ball
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(s.ball.x, s.ball.y, 9, 0, Math.PI * 2);
      ctx.fill();

      // Center line
      ctx.strokeStyle = "#334455";
      ctx.setLineDash([12, 8]);
      ctx.beginPath();
      ctx.moveTo(400, 0);
      ctx.lineTo(400, 400);
      ctx.stroke();
      ctx.setLineDash([]);

      // Score
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 52px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`${s.scoreL} : ${s.scoreR}`, 400, 75);
    };

    frame = requestAnimationFrame(gameLoop);

    return () => cancelAnimationFrame(frame);
  }, [channel]);

  // ==================== RENDER ====================
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050505",
        color: "white",
        textAlign: "center",
        padding: "20px",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1 style={{ fontSize: "3rem", margin: "10px 0 5px" }}>PONG</h1>
      <p style={{ fontSize: "1.3rem", marginBottom: "10px" }}>
        Room: <strong>{channelId}</strong>
      </p>

      <div
        style={{
          display: "inline-block",
          padding: "8px 24px",
          backgroundColor: isHost.current ? "#166534" : "#1e3a8a",
          borderRadius: "9999px",
          marginBottom: "20px",
          fontWeight: "bold",
          fontSize: "1.1rem",
        }}
      >
        {isHost.current ? "🟢 YOU ARE THE HOST" : "🔵 YOU ARE THE GUEST"}
      </div>

      <canvas
        ref={canvasRef}
        width={800}
        height={400}
        style={{
          border: "4px solid #444",
          borderRadius: "12px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
          imageRendering: "pixelated",
        }}
      />

      <p style={{ marginTop: "20px", opacity: 0.7 }}>
        Move your mouse up and down to control your paddle
      </p>
    </div>
  );
}
