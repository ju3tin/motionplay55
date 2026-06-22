"use client";
import { use, useEffect, useRef, useState } from "react";
import PubNub from "pubnub";
import { useRouter, useSearchParams } from "next/navigation";

type State = {
  ball: { x: number; y: number; vx: number; vy: number };
  top: number;
  bottom: number;
  scoreT: number;
  scoreB: number;
};

type PongMessage =
  | { type: "input"; side: "top" | "bottom"; x: number }
  | { type: "state"; state: State }
  | { type: "gameOver"; winner: "top" | "bottom" }
  | { type: "startGame" };

function isPongMessage(msg: unknown): msg is PongMessage {
  return typeof msg === "object" && msg !== null && "type" in msg;
}

export default function VerticalPong({
  params,
}: {
  params: Promise<{ channelId: string }>;
}) {
  const { channelId } = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();
  const channel = `pong-${channelId}`;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pubnubRef = useRef<PubNub | null>(null);

  const [isHost, setIsHost] = useState(false); // Host = Top
  const [gameStarted, setGameStarted] = useState(false);
  const [winner, setWinner] = useState<"top" | "bottom" | null>(null);

  const gameStateRef = useRef<State>({
    ball: { x: 400, y: 300, vx: 4, vy: 5 },
    top: 350,
    bottom: 350,
    scoreT: 0,
    scoreB: 0,
  });

  const gameRunningRef = useRef(false);

  // Role
  useEffect(() => {
    const role = searchParams?.get("as");
    setIsHost(role === "host");
  }, [searchParams]);

  // PubNub
  useEffect(() => {
    const pubnub = new PubNub({
      publishKey: process.env.NEXT_PUBLIC_PUBNUB_PUBLISH_KEY!,
      subscribeKey: process.env.NEXT_PUBLIC_PUBNUB_SUBSCRIBE_KEY!,
      userId: `user-${Math.random().toString(36).substring(2)}`,
    });

    pubnubRef.current = pubnub;
    pubnub.subscribe({ channels: [channel] });

    pubnub.addListener({
      message: (e) => {
        const data = e.message;
        if (!isPongMessage(data)) return;

        if (data.type === "input") {
          gameStateRef.current[data.side] = data.x;
        }
        if (data.type === "state" && !isHost) {
          gameStateRef.current = { ...data.state };
        }
        if (data.type === "gameOver") {
          setWinner(data.winner);
          gameRunningRef.current = false;
        }
        if (data.type === "startGame") {
          setGameStarted(true);
          gameRunningRef.current = true;
        }
      },
    });

    // Auto start after 3 seconds
    const timer = setTimeout(() => {
      setGameStarted(true);
      gameRunningRef.current = true;
    }, 3000);

    return () => {
      clearTimeout(timer);
      pubnub.unsubscribeAll();
    };
  }, [channel, isHost]);

  // Controls - Mouse X for paddle position
  const updatePaddle = (clientX: number) => {
    if (!gameRunningRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    let x = clientX - rect.left;
    x = Math.max(60, Math.min(740, x));

    const side = isHost ? "top" : "bottom";
    gameStateRef.current[side] = x;

    pubnubRef.current?.publish({
      channel,
      message: { type: "input", side, x } as PongMessage,
    });
  };

  useEffect(() => {
    window.addEventListener("mousemove", (e) => updatePaddle(e.clientX));
    return () => window.removeEventListener("mousemove", (e) => updatePaddle(e.clientX));
  }, [isHost]);

  // Game Loop
  useEffect(() => {
    let frame: number;

    const resetBall = (scoreT: number, scoreB: number) => {
      gameStateRef.current = {
        ...gameStateRef.current,
        scoreT,
        scoreB,
        ball: { x: 400, y: 300, vx: (Math.random() - 0.5) * 8, vy: isHost ? 6 : -6 },
      };
    };

    const gameLoop = () => {
      const state = gameStateRef.current;
      const b = state.ball;

      if (isHost && gameRunningRef.current) {
        b.x += b.vx;
        b.y += b.vy;

        if (b.x <= 20 || b.x >= 780) b.vx *= -1;

        // Paddle hit
        if (b.y <= 50 && Math.abs(b.x - state.top) < 70) b.vy *= -1.05;
        if (b.y >= 550 && Math.abs(b.x - state.bottom) < 70) b.vy *= -1.05;

        // Score
        if (b.y < 0) resetBall(state.scoreT, state.scoreB + 1);
        if (b.y > 600) resetBall(state.scoreT + 1, state.scoreB);
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
      ctx.clearRect(0, 0, 800, 600);

      // Background
      ctx.fillStyle = "#05050f";
      ctx.fillRect(0, 0, 800, 600);

      // Paddles
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(s.top - 60, 25, 120, 18);     // Top
      ctx.fillRect(s.bottom - 60, 557, 120, 18); // Bottom

      // Ball
      ctx.beginPath();
      ctx.arc(s.ball.x, s.ball.y, 11, 0, Math.PI * 2);
      ctx.fill();

      // Score
      ctx.font = "bold 60px monospace";
      ctx.textAlign = "center";
      ctx.fillText(s.scoreT.toString(), 400, 120);
      ctx.fillText(s.scoreB.toString(), 400, 520);

      if (winner) {
        ctx.fillStyle = "rgba(0,0,0,0.9)";
        ctx.fillRect(0, 0, 800, 600);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 70px monospace";
        ctx.fillText(winner === "top" ? "TOP WINS!" : "BOTTOM WINS!", 400, 300);
      }
    };

    frame = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(frame);
  }, [winner, isHost]);

  return (
    <div style={{ 
      height: "100vh", 
      width: "100vw", 
      background: "#000", 
      overflow: "hidden",
      position: "relative"
    }}>
      <div style={{ position: "absolute", top: 15, left: 15, zIndex: 100, color: "white" }}>
        <button onClick={() => router.push("/pong")} style={{ padding: "8px 16px" }}>← Lobby</button>
      </div>

      <div style={{ position: "absolute", top: 15, right: 15, zIndex: 100, textAlign: "right", color: "white" }}>
        Room: {channelId}<br />
        {isHost ? "🟢 TOP (Host)" : "🔵 BOTTOM (Guest)"}
      </div>

      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          objectFit: "contain",
          background: "#000"
        }}
      />

      {!gameStarted && (
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center", color: "white" }}>
          <h2>Waiting for opponent...</h2>
        </div>
      )}
    </div>
  );
}
