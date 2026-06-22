"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { pubnub } from "@/lib/pubnub2";

type State = {
  ball: { x: number; y: number; vx: number; vy: number };
  left: number;
  right: number;
  scoreL: number;
  scoreR: number;
};

export default function PongRoom() {
  // -----------------------------
  // ROOM ID
  // -----------------------------
  const params = useParams()
  const roomId = params?.roomId as string

  // -----------------------------
  // REFS
  // -----------------------------
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // deterministic host (first tab to set localStorage wins)
  const isHost = useRef<boolean>(false);

  useEffect(() => {
    const key = `pong-host-${roomId}`;
    const existing = localStorage.getItem(key);

    if (!existing) {
      localStorage.setItem(key, "host");
      isHost.current = true;
    } else {
      isHost.current = false;
    }
  }, [roomId]);

  // -----------------------------
  // STATE
  // -----------------------------
  const [state, setState] = useState<State>({
    ball: { x: 400, y: 200, vx: 3, vy: 2 },
    left: 150,
    right: 150,
    scoreL: 0,
    scoreR: 0
  });

  // -----------------------------
  // PUBNUB SETUP
  // -----------------------------
  useEffect(() => {
    pubnub.subscribe({ channels: [roomId] });

    const listener = {
      message: (msg: any) => {
        const data = msg.message;

        if (data.type === "input") {
          setState((s) => ({
            ...s,
            left: data.side === "left" ? data.y : s.left,
            right: data.side === "right" ? data.y : s.right
          }));
        }

        if (data.type === "state" && !isHost.current) {
          setState(data.state);
        }
      }
    };

    pubnub.addListener(listener);

    return () => {
      pubnub.removeListener(listener);
      pubnub.unsubscribeAll();
    };
  }, [channel]);

  // -----------------------------
  // INPUT
  // -----------------------------
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const clamped = Math.max(0, Math.min(320, y));

      const side = isHost.current ? "left" : "right";

      setState((s) => ({
        ...s,
        [side]: clamped
      }));

      pubnub.publish({
        channel,
        message: {
          type: "input",
          side,
          y: clamped
        }
      });
    };

    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, [channel]);

  // -----------------------------
  // GAME LOOP (HOST ONLY)
  // -----------------------------
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
            return resetBall(s, scoreL, scoreR);
          }

          if (b.x > 800) {
            scoreL++;
            return resetBall(s, scoreL, scoreR);
          }

          const newState = { ...s, ball: b, scoreL, scoreR };

          pubnub.publish({
            channel,
            message: { type: "state", state: newState }
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

  // -----------------------------
  // RESET BALL
  // -----------------------------
  function resetBall(s: State, scoreL: number, scoreR: number): State {
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

  // -----------------------------
  // DRAW
  // -----------------------------
  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // paddles
    ctx.fillStyle = "white";
    ctx.fillRect(10, state.left, 10, 80);
    ctx.fillRect(780, state.right, 10, 80);

    // ball
    ctx.beginPath();
    ctx.arc(state.ball.x, state.ball.y, 8, 0, Math.PI * 2);
    ctx.fill();

    // score
    ctx.font = "20px monospace";
    ctx.fillText(`${state.scoreL} : ${state.scoreR}`, 370, 30);
  }

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <div style={{ textAlign: "center", color: "white", background: "#111", height: "100vh" }}>
      <h3>Room: {roomId}</h3>
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
