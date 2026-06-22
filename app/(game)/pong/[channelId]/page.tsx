"use client";
import { use, useEffect, useRef, useState } from "react";
import PubNub from "pubnub";
import { useRouter, useSearchParams } from "next/navigation";

type State = {
  ball: { x: number; y: number; vx: number; vy: number };
  top: number;     // Top paddle X position
  bottom: number;  // Bottom paddle X position
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

  const [isHost, setIsHost] = useState(false); // Host = Top Player
  const [playerCount, setPlayerCount] = useState(1);
  const [winner, setWinner] = useState<"top" | "bottom" | null>(null);
  const [gameStarted, setGameStarted] = useState(false);

  const gameStateRef = useRef<State>({
    ball: { x: 400, y: 300, vx: 4, vy: 5 },
    top: 350,
    bottom: 350,
    scoreT: 0,
    scoreB: 0,
  });

  const gameRunningRef = useRef(false);
  const [, forceUpdate] = useState({});

  // Role from URL
  useEffect(() => {
    const roleParam = searchParams?.get("as");
    setIsHost(roleParam === "host" || !roleParam);
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
          forceUpdate({});
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
      presence: (e: any) => {
        const count = e.occupancy || 1;
        setPlayerCount(count);
        if (count >= 2 && isHost) {
          pubnub.publish({ channel, message: { type: "startGame" } });
          setGameStarted(true);
          gameRunningRef.current = true;
        }
      },
    });

    setTimeout(() => pubnub.hereNow({ channels: [channel] }), 800);

    return () => pubnub.unsubscribeAll();
  }, [channel, isHost]);

  // Mouse / Touch Control (X position for horizontal paddles)
  const updatePaddle = (clientX: number) => {
    if (!gameRunningRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    let x = clientX - rect.left;
    x = Math.max(60, Math.min(740, x)); // Keep paddle inside bounds

    const side = isHost ? "top" : "bottom";
    gameStateRef.current[side] = x;

    pubnubRef.current?.publish({
      channel,
      message: { type: "input", side, x } as PongMessage,
    });
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => updatePaddle(e.clientX);
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, [isHost]);

  useEffect(() => {
    const handler = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length > 0) updatePaddle(e.touches[0].clientX);
    };
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener("touchmove", handler, { passive: false });
      canvas.addEventListener("touchstart", handler, { passive: false });
    }
    return () => {
      if (canvas) {
        canvas.removeEventListener("touchmove", handler);
        canvas.removeEventListener("touchstart", handler);
      }
    };
  }, [isHost]);

  // Game Loop
  useEffect(() => {
    let frame: number;
    let lastSync = 0;

    const resetBall = (scoreT: number, scoreB: number) => {
      gameStateRef.current = {
        ...gameStateRef.current,
        scoreT,
        scoreB,
        ball: { x: 400, y: 300, vx: (Math.random() - 0.5) * 6, vy: isHost ? 5 : -5 },
      };
    };

    const gameLoop = (timestamp: number) => {
      if (!gameRunningRef.current) {
        draw();
        frame = requestAnimationFrame(gameLoop);
        return;
      }

      const state = gameStateRef.current;
      const b = state.ball;

      if (isHost) {
        b.x += b.vx;
        b.y += b.vy;

        // Wall bounce (left/right)
        if (b.x <= 20 || b.x >= 780) b.vx *= -1;

        // Paddle collision
        if (b.y <= 50 && b.x > state.top - 60 && b.x < state.top + 60) b.vy *= -1.03;
        if (b.y >= 550 && b.x > state.bottom - 60 && b.x < state.bottom + 60) b.vy *= -1.03;

        // Scoring
        if (b.y < 0) resetBall(state.scoreT, state.scoreB + 1);
        if (b.y > 600) resetBall(state.scoreT + 1, state.scoreB);

        if (timestamp - lastSync > 40) {
          pubnubRef.current?.publish({ channel, message: { type: "state", state: gameStateRef.current } });
          lastSync = timestamp;
        }

        if (state.scoreT >= 10 || state.scoreB >= 10) {
          const win = state.scoreT >= 10 ? "top" : "bottom";
          setWinner(win);
          gameRunningRef.current = false;
          pubnubRef.current?.publish({ channel, message: { type: "gameOver", winner: win } });
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
      ctx.clearRect(0, 0, 800, 600);

      ctx.fillStyle = "#000011";
      ctx.fillRect(0, 0, 800, 600);

      // Paddles (horizontal)
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(s.top - 60, 30, 120, 16);     // Top paddle
      ctx.fillRect(s.bottom - 60, 554, 120, 16); // Bottom paddle

      // Ball
      ctx.beginPath();
      ctx.arc(s.ball.x, s.ball.y, 10, 0, Math.PI * 2);
      ctx.fill();

      // Center line
      ctx.strokeStyle = "#334455";
      ctx.setLineDash([20, 10]);
      ctx.beginPath();
      ctx.moveTo(0, 300);
      ctx.lineTo(800, 300);
      ctx.stroke();
      ctx.setLineDash([]);

      // Score
      ctx.font = "bold 48px monospace";
      ctx.textAlign = "center";
      ctx.fillText(s.scoreT.toString(), 400, 100);
      ctx.fillText(s.scoreB.toString(), 400, 520);

      if (winner) {
        ctx.fillStyle = "rgba(0,0,0,0.8)";
        ctx.fillRect(0, 0, 800, 600);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 60px monospace";
        ctx.fillText(winner === "top" ? "TOP PLAYER WINS!" : "BOTTOM PLAYER WINS!", 400, 280);
      }
    };

    frame = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(frame);
  }, [winner, isHost]);

  return (
    <div style={{ 
      minHeight: "100vh", 
      background: "#000", 
      color: "white", 
      overflow: "hidden",
      position: "relative"
    }}>
      <div style={{ position: "absolute", top: 10, left: 10, zIndex: 10 }}>
        <button onClick={() => router.push("/pong")}>← Lobby</button>
      </div>

      <div style={{ position: "absolute", top: 10, right: 10, zIndex: 10, textAlign: "right" }}>
        <div>Room: {channelId}</div>
        <div style={{ color: isHost ? "#4ade80" : "#60a5fa", fontWeight: "bold" }}>
          {isHost ? "🟢 TOP PLAYER (Host)" : "🔵 BOTTOM PLAYER (Guest)"}
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        style={{
          display: "block",
          margin: "0 auto",
          maxWidth: "100vw",
          maxHeight: "100vh",
          background: "#000"
        }}
      />

      {!gameStarted && (
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center" }}>
          <h2>Waiting for opponent...</h2>
          <p>Players: {playerCount}/2</p>
        </div>
      )}
    </div>
  );
}
