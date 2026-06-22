"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PongLobby() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const createNewRoom = () => {
    setIsCreating(true);
    // Generate random room ID (6 characters)
    const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // Small delay for better UX
    setTimeout(() => {
      router.push(`/pong/${newRoomId}`);
    }, 300);
  };

  const joinRoom = () => {
    const trimmed = roomCode.trim().toUpperCase();
    if (trimmed.length < 3) {
      alert("Please enter a valid room code");
      return;
    }
    router.push(`/pong/${trimmed}`);
  };

  const copyLink = (roomId: string) => {
    const url = `${window.location.origin}/pong/${roomId}`;
    navigator.clipboard.writeText(url);
    alert("✅ Link copied! Share it with your friend.");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050505",
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: "420px" }}>
        <h1 style={{ fontSize: "4.5rem", margin: "0 0 10px" }}>PONG</h1>
        <p style={{ fontSize: "1.4rem", marginBottom: "40px", opacity: 0.8 }}>
          Real-time multiplayer
        </p>

        {/* Create New Game */}
        <button
          onClick={createNewRoom}
          disabled={isCreating}
          style={{
            background: "#22c55e",
            color: "black",
            fontSize: "1.3rem",
            fontWeight: "bold",
            padding: "16px 40px",
            border: "none",
            borderRadius: "12px",
            cursor: "pointer",
            width: "100%",
            marginBottom: "30px",
          }}
        >
          {isCreating ? "Creating Room..." : "🎮 Create New Game"}
        </button>

        <div style={{ margin: "30px 0", opacity: 0.5 }}>— OR —</div>

        {/* Join Existing Room */}
        <div>
          <input
            type="text"
            placeholder="Enter Room Code"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && joinRoom()}
            style={{
              width: "100%",
              padding: "16px",
              fontSize: "1.2rem",
              background: "#111",
              border: "2px solid #444",
              borderRadius: "12px",
              color: "white",
              textAlign: "center",
              marginBottom: "12px",
              textTransform: "uppercase",
            }}
          />

          <button
            onClick={joinRoom}
            style={{
              background: "#3b82f6",
              color: "white",
              fontSize: "1.2rem",
              fontWeight: "bold",
              padding: "14px 40px",
              border: "none",
              borderRadius: "12px",
              cursor: "pointer",
              width: "100%",
            }}
          >
            Join Game
          </button>
        </div>

        <p style={{ marginTop: "50px", fontSize: "0.95rem", opacity: 0.6 }}>
          Share the room link with your friend to play together
        </p>
      </div>
    </div>
  );
}
