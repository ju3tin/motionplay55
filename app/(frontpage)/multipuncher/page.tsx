'use client';
import { useState, useEffect } from 'react';
import { useGameSocket } from '@/lib/socket';
import CreateRoom1 from '@/components/CreateRoom1';
import GameRoom1 from '@/components/GameRoom1';
import PunchTargetGame from '@/components/PunchTargetGame';

export default function Home() {
  const socket = useGameSocket();
  
  const [userId, setUserId] = useState("Player");
  const [gameIdToJoin, setGameIdToJoin] = useState("");

  // Auto connect as Admin for testing (remove or make toggleable in production)
  useEffect(() => {
    socket.connect(true);
  }, []);

  const handleCreateGame = (payload: any) => {
    // Add current userId to payload
    const finalPayload = { ...payload, userId };
    socket.send(finalPayload);
  };

  const handleJoinGame = () => {
    if (!gameIdToJoin.trim()) return;
    
    socket.send({
      event: "join-room",
      gameId: gameIdToJoin.trim(),
      userId: userId.trim()
    });
  };

  const handleReady = () => {
    socket.send({ event: "ready" });
  };

  const handleSendMessage = (data: any) => {
    socket.send({
      ...data,
      userId: userId.trim() || "Player"
    });
  };

  const handleLeave = () => {
    socket.send({ event: "leave-room", gameId: socket.currentGameId });
    socket.setMessages([]);
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-5xl font-bold text-center mb-12">Multiplayer Game</h1>

        {/* Connection Status */}
        <div className="fixed top-6 right-6 bg-zinc-900 px-4 py-2 rounded-xl text-sm z-50">
          {socket.isConnected ? "🟢 Connected" : "🔴 Connecting..."}
        </div>

        {!socket.currentGameId ? (
          // Lobby / Join Screen
          <div className="max-w-xl mx-auto space-y-10">
            {/* Username Input */}
            <div className="bg-zinc-900 p-6 rounded-2xl">
              <label className="block text-sm text-gray-400 mb-2">Your Username</label>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Enter your username"
                className="w-full p-4 bg-zinc-800 rounded-xl text-lg"
              />
            </div>

            <CreateRoom1 onRoomCreated={handleCreateGame} />

            {/* Join Game Section */}
            <div className="bg-zinc-900 p-8 rounded-2xl">
              <h2 className="text-2xl font-semibold mb-6">Join Existing Game</h2>
              <div className="flex gap-4">
                <input
                  type="text"
                  placeholder="Enter Game ID"
                  value={gameIdToJoin}
                  onChange={(e) => setGameIdToJoin(e.target.value)}
                  className="flex-1 p-4 bg-zinc-800 rounded-xl text-lg"
                />
                <button
                  onClick={handleJoinGame}
                  disabled={!socket.isConnected || !gameIdToJoin.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-10 rounded-xl font-semibold"
                >
                  Join
                </button>
              </div>
            </div>
          </div>
        ) : (
          // Game Room
  <PunchTargetGame
  currentGameId={currentGameId}
  players={players}
  userId={userId}
  send={send}
  status={status}
  onReady={onReady}
  onLeave={onLeave}
/>
     
        )}
      </div>
    </main>
  );
}
