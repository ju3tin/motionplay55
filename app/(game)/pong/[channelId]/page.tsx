"use client";
import { use, useEffect, useRef, useState } from "react";
import PubNub from "pubnub";
import { useRouter, useSearchParams } from "next/navigation";

type State = {
  ball: { x: number; y: number; vx: number; vy: number };
  left: number;
  right: number;
  scoreL: number;
  scoreR: number;
};

type PongMessage =
  | { type: "input"; side: "left" | "right"; y: number }
  | { type: "state"; state: State }
  | { type: "gameOver"; winner: "left" | "right" }
  | { type: "startGame" };

function isPongMessage(msg: unknown): msg is PongMessage {
  return typeof msg === "object" && msg !== null && "type" in msg;
}

export default function PongGame({
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

  const [isHost, setIsHost] = useState(false);
  const [playerCount, setPlayerCount] = useState(1);
  const [winner, setWinner] = useState<"left" | "right" | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [debugInfo, setDebugInfo] = useState("Initializing...");

  const gameStateRef = useRef<State>({
    ball: { x: 400, y: 200, vx: 3.5, vy: 2 },
    left: 160,
    right: 160,
    scoreL: 0,
    scoreR: 0,
  });

  const gameRunningRef = useRef(false);
  const [, forceUpdate] = useState({});

  // Role from URL
  useEffect(() => {
    const roleParam = searchParams?.get("as");
    let hostStatus = false;

    if (roleParam === "host") hostStatus = true;
    else if (roleParam === "guest") hostStatus = false;
    else {
      const hostKey = `pong-host-${channelId}`;
      if (!localStorage.getItem(hostKey)) {
        localStorage.setItem(hostKey, "true");
        hostStatus = true;
      }
    }
    setIsHost(hostStatus);
    setDebugInfo(`Role set: ${hostStatus ? "Host" : "Guest"}`);
  }, [channelId, searchParams]);

  // PubNub Setup
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

        if (data.type === "input") gameStateRef.current[data.side] = data.y;
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
          setDebugInfo("Game Started via message");
        }
      },
      presence: (e: any) => {
        const count = e.occupancy || 1;
        setPlayerCount(count);
        setDebugInfo(`Players: ${count}/2`);
      },
    });

    // Force start after 4 seconds for testing
    const forceTimer = setTimeout(() => {
      if (!gameStarted) {
        setGameStarted(true);
        gameRunningRef.current = true;
        setDebugInfo("Game forced started (debug mode)");
      }
    }, 4000);

    return () => {
      clearTimeout(forceTimer);
      pubnub.unsubscribeAll();
    };
  }, [channel, isHost, gameStarted]);

  // Paddle Control
  const updatePaddle = (clientY: number) => {
    if (!gameRunningRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    let y = clientY - rect.top;
    y = Math.max(0, Math.min(320, y));

    const side = isHost ? "left" : "right";
    gameStateRef.current[side] = y;

    pubnubRef.current?.publish({
      channel,
      message: { type: "input", side, y } as PongMessage,
    });
  };

  useEffect(() => {
    window.addEventListener("mousemove", (e) => updatePaddle(e.clientY));
    return () => window.removeEventListener("mousemove", (e) => updatePaddle(e.clientY));
  }, [isHost]);

  // Game Loop
  useEffect(() => {
    let frame: number;
    let lastSync = 0;

    const resetBall = (scoreL: number, scoreR: number) => {
      gameStateRef.current = {
        ...gameStateRef.current,
        scoreL,
        scoreR,
        ball: { x: 400, y: 200, vx: Math.random() > 0.5 ? 3.8 : -3.8, vy: (Math.random() - 0.5) * 5 },
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

        if (b.y <= 10 || b.y >= 390) b.vy *= -1;

        if (b.x <= 30 && b.y >= state.left - 10 && b.y <= state.left + 90) b.vx = Math.abs(b.vx) * 1.03;
        if (b.x >= 770 && b.y >= state.right - 10 && b.y <= state.right + 90) b.vx = -Math.abs(b.vx) * 1.03;

        if (b.x < 0) resetBall(state.scoreL, state.scoreR + 1);
        if (b.x > 800) resetBall(state.scoreL + 1, state.scoreR);

        if (timestamp - lastSync > 40) {
          pubnubRef.current?.publish({ channel, message: { type: "state", state: gameStateRef.current } });
          lastSync = timestamp;
        }

        if (state.scoreL >= 10 || state.scoreR >= 10) {
          const win = state.scoreL >= 10 ? "left" : "right";
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
      ctx.clearRect(0, 0, 800, 400);
      ctx.fillStyle = "#000011";
      ctx.fillRect(0, 0, 800, 400);

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(15, s.left, 12, 80);
      ctx.fillRect(773, s.right, 12, 80);

      ctx.beginPath();
      ctx.arc(s.ball.x, s.ball.y, 9, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#334455";
      ctx.setLineDash([12, 8]);
      ctx.beginPath();
      ctx.moveTo(400, 0);
      ctx.lineTo(400, 400);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.font = "bold 52px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`${s.scoreL} : ${s.scoreR}`, 400, 75);

      if (winner) {
        ctx.fillStyle = "rgba(0,0,0,0.85)";
        ctx.fillRect(0, 0, 800, 400);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 60px monospace";
        ctx.fillText(winner === "left" ? "HOST WINS!" : "GUEST WINS!", 400, 190);
      }
    };

    frame = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(frame);
  }, [winner, isHost]);

  const copyRoomLink = () => {
    const url = `${window.location.origin}/pong/${channelId}?as=host`;
    navigator.clipboard.writeText(url);
    alert("Host link copied!");
  };

  const playAgain = () => window.location.reload();

  return (
    <div style={{ minHeight: "100vh", background: "#050505", color: "white", padding: "20px", textAlign: "center" }}>
      <div style={{ display: "flex", justifyContent: "space-between", maxWidth: "820px", margin: "0 auto 10px" }}>
        <button onClick={() => router.push("/pong")}>← Lobby</button>
        <button onClick={copyRoomLink}>📋 Copy Host Link</button>
      </div>

      <h1 style={{ fontSize: "3rem" }}>PONG</h1>
      <p>Room: <strong>{channelId}</strong></p>

      <div style={{
        display: "inline-block",
        padding: "12px 32px",
        backgroundColor: isHost ? "#166534" : "#1e3a8a",
        borderRadius: "9999px",
        margin: "20px 0",
        fontWeight: "bold",
        fontSize: "1.25rem"
      }}>
        {isHost ? "🟢 YOU ARE PLAYER 1 (HOST - LEFT)" : "🔵 YOU ARE PLAYER 2 (GUEST - RIGHT)"}
      </div>

      <div style={{ marginBottom: "10px" }}>
        Players: {playerCount}/2 | Debug: {debugInfo}
      </div>

      <canvas
        ref={canvasRef}
        width={800}
        height={400}
        style={{
          border: "4px solid #444",
          borderRadius: "12px",
          maxWidth: "100%",
          display: gameStarted ? "block" : "none"
        }}
      />

      {!gameStarted && <p>Waiting for opponent... (Game will auto-start in 4 seconds for testing)</p>}

      {winner && <button onClick={playAgain} style={{ marginTop: "20px", padding: "14px 36px" }}>Play Again</button>}

      {gameStarted && <p style={{ marginTop: "15px" }}>Move mouse or swipe to control paddle</p>}
    </div>
  );
}
