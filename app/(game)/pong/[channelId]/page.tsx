"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import PubNub from "pubnub";

type State = {
  ball: { x: number; y: number; vx: number; vy: number };
  left: number;
  right: number;
  scoreL: number;
  scoreR: number;
};

export default function PongGame() {
  const { channelId } = useParams<{ channelId: string }>();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isHost = useRef(false);

  const channel = useMemo(() => `pong-${channelId}`, [channelId]);

  const [state, setState] = useState<State>({
    ball: { x: 400, y: 200, vx: 3, vy: 2 },
    left: 150,
    right: 150,
    scoreL: 0,
    scoreR: 0
  });

  const pubnubRef = useRef<PubNub | null>(null);

  // -------------------------
  // INIT PUBNUB
  // -------------------------
  useEffect(() => {
    const client = new PubNub({
      publishKey: process.env.NEXT_PUBLIC_PUBNUB_PUBLISH_KEY!,
      subscribeKey: process.env.NEXT_PUBLIC_PUBNUB_SUBSCRIBE_KEY!,
      userId: "game-host"
    });

    pubnubRef.current = client;

    client.subscribe({ channels: [channel] });

    client.addListener({
      message: (msg) => {
        const data = msg.message;

        if (data.type === "input") {
          setState((s) => {
            // simple split logic: first user = left, second = right
            if (!s._users) s._users = {};

            s._users[data.userId] = data.y;

            const users = Object.values(s._users);

            return {
              ...s,
              left: users[0] ?? s.left,
              right: users[1] ?? s.right
            };
          });
        }

        if (data.type === "state" && !isHost.current) {
          setState(data.state);
        }
      }
    });

    // host election (simple)
    isHost.current = true;

    return () => {
      client.unsubscribeAll();
    };
  }, [channel]);

  // -------------------------
  // GAME LOOP
  // -------------------------
  useEffect(() => {
    let frame: number;

    const loop = () => {
      if (isHost.current) {
        setState((s) => {
          const b = { ...s.ball };

          b.x += b.vx;
          b.y += b.vy;

          // walls
          if (b.y <= 0 || b.y >= 400) b.vy *= -1;

          // paddles
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
              state: newState
            }
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

  function reset(s: State, scoreL: number, scoreR: number): State {
    return {
      ...s,
      scoreL,
      scoreR,
      ball: {
        x: 400,
        y: 200,
        vx: Math.random() > 0.5 ? 3 : -3,
        vy: 2
      }
    };
  }

  // -------------------------
  // DRAW
  // -------------------------
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

  return (
    <div style={{ textAlign: "center", background: "#111", height: "100vh", color: "white" }}>
      <h3>Pong Room: {channelId}</h3>
      <canvas ref={canvasRef} width={800} height={400} style={{ background: "black" }} />
    </div>
  );
}
