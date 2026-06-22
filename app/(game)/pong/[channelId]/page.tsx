"use client";

import { useEffect, useRef, useState } from "react";
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
  | {
      type: "input";
      side: "left" | "right";
      y: number;
      userId?: string;
    }
  | {
      type: "state";
      state: State;
    };

/* ---------------- PAGE ---------------- */

export default function PongGame({
  params,
}: {
  params: { channelId: string };
}) {
  const channelId = params.channelId;
  const channel = `pong-${channelId}`;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isHost = useRef(false);
  const pubnubRef = useRef<PubNub | null>(null);

  /* ---------------- STATE ---------------- */

  const [state, setState] = useState<State>({
    ball: { x: 400, y: 200, vx: 3, vy: 2 },
    left: 150,
    right: 150,
    scoreL: 0,
    scoreR: 0,
  });

  /* ---------------- HOST ELECTION ---------------- */

  useEffect(() => {
    const key = `pong-host-${channelId}`;

    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, "1");
      isHost.current = true;
    }
  }, [channelId]);

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
        const data = msg.message as PongMessage;

        if (!data || typeof data !== "object") return;

        if (data.type === "input") {
          setState((s) => ({
            ...s,
            left: data.side === "left" ? data.y : s.left,
            right: data.side === "right" ? data.y : s.right,
          }));
        }

        if (data.type === "state" && !isHost.current) {
          setState(data.state);
        }
      },
    });

    return () => {
      client.unsubscribeAll();
    };
  }, [channel]);

  /* ---------------- INPUT ---------------- */

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const y = Math.max(0, Math.min(320, e.clientY - rect.top));

      const side = isHost.current ? "left" : "right";

      setState((s) => ({ ...s, [side]: y }));

      pubnubRef.current?.publish({
        channel,
        message: {
          type: "input",
          side,
          y,
        } satisfies PongMessage,
      });
    };

    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, [channel]);

  /* ---------------- GAME LOOP ---------------- */

  useEffect(() => {
    let frame: number;

    const loop = () => {
      if (isHost.current) {
        setState((s) => {
          const b = { ...s.ball };

          b.x += b.vx;
          b.y += b.vy;

          if (b.y <= 0 || b.y >= 400) b.vy *= -1;

          if (b.x < 20 && b.y > s.left && b.y < s.left + 80) b.vx *= -1;
          if (b.x > 780 && b.y > s.right && b.y < s.right + 80) b.vx *= -1;

          let scoreL = s.scoreL;
          let scoreR = s.scoreR;

          if (b.x < 0) {
            scoreR++;
            return reset(s, scoreL, scoreR);
          }

          if (b.x > 800) {
            scoreL++;
            return reset(s, scoreL, scoreR);
          }

          const newState = { ...s, ball: b, scoreL, scoreR };

          pubnubRef.current?.publish({
            channel,
            message: {
              type: "state",
              state: newState,
            } satisfies PongMessage,
          });

          return newState;
        });
      }

      draw();
      frame = requestAnimationFrame(loop);
    };

    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [channel]);

  /* ---------------- RESET ---------------- */

  function reset(s: State, scoreL: number, scoreR: number): State {
    return {
      ...s,
      scoreL,
      scoreR,
      ball: {
        x: 400,
        y: 200,
        vx: Math.random() > 0.5 ? 3 : -3,
        vy: 2,
      },
    };
  }

  /* ---------------- DRAW ---------------- */

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, 800, 400);

    ctx.fillStyle = "white";

    ctx.fillRect(10, state.left, 10, 80);
    ctx.fillRect(780, state.right, 10, 80);

    ctx.beginPath();
    ctx.arc(state.ball.x, state.ball.y, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = "20px monospace";
    ctx.fillText(`${state.scoreL} : ${state.scoreR}`, 370, 30);
  }

  /* ---------------- UI ---------------- */

  return (
    <div
      style={{
        textAlign: "center",
        background: "#111",
        color: "white",
        height: "100vh",
      }}
    >
      <h3>Room: {channelId}</h3>
      <p>{isHost.current ? "HOST" : "GUEST"}</p>

      <canvas
        ref={canvasRef}
        width={800}
        height={400}
        style={{ background: "black" }}
      />
    </div>
  );
}
