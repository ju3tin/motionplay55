"use client";
import { use, useEffect, useRef, useState } from "react";
import PubNub from "pubnub";
import { useRouter } from "next/navigation";

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
  | { type: "role"; isHost: boolean };

function isPongMessage(msg: unknown): msg is PongMessage {
  return typeof msg === "object" && msg !== null && "type" in msg;
}

export default function PongGame({
  params,
}: {
  params: Promise<{ channelId: string }>;
}) {
  const { channelId } = use(params);
  const channel = `pong-${channelId}`;
  const router = useRouter();

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

  const [playerCount, setPlayerCount] = useState(1);
  const [winner, setWinner] = useState<"left" | "right" | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [status, setStatus] = useState("Waiting for opponent...");

  const gameRunningRef = useRef(false);
  const [, forceUpdate] = useState({});

  // ==================== HOST SETUP + ROLE ANNOUNCEMENT ====================
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

        if (data.type === "role" && !isHost.current) {
          isHost.current = data.isHost;
        }
        if (data.type === "input") {
          gameStateRef.current[data.side] = data.y;
        }
        if (data.type === "state" && !isHost.current) {
          gameStateRef.current = { ...data.state };
          forceUpdate({});
        }
        if (data.type === "gameOver") {
          setWinner(data.winner);
          gameRunningRef.current = false;
        }
      },
      presence: (presenceEvent: any) => {
        const count = presenceEvent.occupancy || 1;
        setPlayerCount(count);

        if (count >= 2 && !gameStarted) {
          setGameStarted(true);
          gameRunningRef.current = true;
          setStatus("Game Started!");
        }
      },
    });

    // Initial presence check
    pubnub.hereNow({ channels: [channel] }, (status, response) => {
      if (response?.channels?.[channel]) {
        const count = response.channels[channel].occupants?.length || 1;
        setPlayerCount(count);
        if (count >= 2) {
          setGameStarted(true);
          gameRunningRef.current = true;
          setStatus("Game Started!");
        }
      }
    });

    // Announce role after connection
    setTimeout(() => {
      if (pubnubRef.current) {
        pubnubRef.current.publish({
          channel,
          message: { type: "role", isHost: isHost.current },
        });
      }
    }, 1000);

    return () => pubnub.unsubscribeAll();
  }, [channel]);

  // ==================== CONTROLS ====================
  const updatePaddle = (clientY: number) => {
    if (!gameRunningRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    let y = clientY - rect.top;
    y = Math.max(0, Math.min(320, y));

    const side = isHost.current ? "left" : "right";
    gameStateRef.current[side] = y;

    pubnubRef.current?.publish({
      channel,
      message: { type: "input", side, y } as PongMessage,
    });
  };

  useEffect(() => {
    const handleMouse = (e: MouseEvent) => updatePaddle(e.clientY);
    window.addEventListener("mousemove", handleMouse);
    return () => window.removeEventListener("mousemove", handleMouse);
  }, []);

  useEffect(() => {
    const handleTouch = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length > 0) updatePaddle(e.touches[0].clientY);
    };
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener("touchmove", handleTouch, { passive: false });
      canvas.addEventListener("touchstart", handleTouch, { passive: false });
    }
    return () => {
      if (canvas) {
        canvas.removeEventListener("touchmove", handleTouch);
        canvas.removeEventListener("touchstart", handleTouch);
      }
    };
  }, []);

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

    const checkGameOver = (scoreL: number, scoreR: number) => {
      if (scoreL >= 10 || scoreR >= 10) {
        const winSide = scoreL >= 10 ? "left" : "right";
        setWinner(winSide);
        gameRunningRef.current = false;
        pubnubRef.current?.publish({
          channel,
          message: { type: "gameOver", winner: winSide } as PongMessage,
        });
        return true;
      }
      return false;
    };

    const gameLoop = (timestamp: number) => {
      if (!gameRunningRef.current) {
        draw();
        frame = requestAnimationFrame(gameLoop);
        return;
      }

      const state = gameStateRef.current;
      const b = state.ball;

      if (isHost.current) {
        b.x += b.vx;
        b.y += b.vy;

        if (b.y <= 10 || b.y >= 390) b.vy *= -1;

        if (b.x <= 30 && b.y >= state.left - 10 && b.y <= state.left + 90) b.vx = Math.abs(b.vx) * 1.03;
        if (b.x >= 770 && b.y >= state.right - 10 && b.y <= state.right + 90) b.vx = -Math.abs(b.vx) * 1.03;

        let scored = false;
        if (b.x < 0) {
          resetBall(state.scoreL, state.scoreR + 1);
          scored = true;
        }
        if (b.x > 800) {
          resetBall(state.scoreL + 1, state.scoreR);
          scored = true;
        }

        if (scored) {
          checkGameOver(gameStateRef.current.scoreL, gameStateRef.current.scoreR);
        } else if (timestamp - lastSync > 40) {
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
  }, [winner]);

  const copyRoomLink = () => {
    const url = `${window.location.origin}/pong/${channelId}`;
    navigator.clipboard.writeText(url);
    alert("✅ Room link copied!");
  };

  const playAgain = () => window.location.reload();

  return (
    <div style={{ 
      minHeight: "100vh", 
      background: "#050505", 
      color: "white", 
      padding: "10px", 
      textAlign: "center",
      touchAction: "none" 
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", maxWidth: "820px", margin: "0 auto 10px" }}>
        <button onClick={() => router.push("/pong")} style={{ padding: "8px 16px", background: "#444", border: "none", borderRadius: "8px", color: "white" }}>
          ← Lobby
        </button>
        <button onClick={copyRoomLink} style={{ padding: "8px 16px", background: "#444", border: "none", borderRadius: "8px", color: "white" }}>
          📋 Copy Link
        </button>
      </div>

      <h1 style={{ fontSize: "3rem", margin: "10px 0" }}>PONG</h1>
      <p>Room: <strong>{channelId}</strong> | First to 10 wins</p>

      <div style={{ margin: "15px 0", fontSize: "1.2rem" }}>
        🟢 Player 1 (Host - Left) vs 🔵 Player 2 (Guest - Right)
      </div>

      <div style={{
        display: "inline-block",
        padding: "10px 30px",
        backgroundColor: isHost.current ? "#166534" : "#1e3a8a",
        borderRadius: "9999px",
        marginBottom: "15px",
        fontWeight: "bold",
        fontSize: "1.15rem"
      }}>
        {isHost.current ? "🟢 YOU ARE PLAYER 1 (HOST)" : "🔵 YOU ARE PLAYER 2 (GUEST)"}
      </div>

      <div style={{ margin: "20px 0", fontSize: "1.3rem", fontWeight: "bold" }}>
        {status} ({playerCount}/2)
      </div>

      <canvas
        ref={canvasRef}
        width={800}
        height={400}
        style={{
          border: "4px solid #444",
          borderRadius: "12px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
          maxWidth: "100%",
          height: "auto",
          touchAction: "none",
          display: gameStarted ? "block" : "none"
        }}
      />

      {winner && (
        <div style={{ marginTop: "25px" }}>
          <button 
            onClick={playAgain}
            style={{
              padding: "14px 36px",
              fontSize: "1.3rem",
              background: "#22c55e",
              color: "black",
              border: "none",
              borderRadius: "12px",
              fontWeight: "bold"
            }}
          >
            Play Again
          </button>
        </div>
      )}

      {gameStarted && (
        <p style={{ marginTop: "15px", opacity: 0.8 }}>
          Drag / Swipe on canvas to move your paddle
        </p>
      )}
    </div>
  );
}
