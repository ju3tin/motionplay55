'use client';
import { useState, useEffect } from 'react';
import { useGameSocket } from '@/lib/socket';
import CreateRoom from '@/components/CreateRoom';
import GameRoom from '@/components/GameRoom';

export default function Home() {
  const socket = useGameSocket();
  const [roomToJoin, setRoomToJoin] = useState("");

  // Auto connect as Admin for testing
  useEffect(() => {
    socket.connect(true);
  }, []);

  const handleCreate = (payload: any) => socket.send(payload);
  const handleJoin = () => {
    if (roomToJoin) socket.send({ event: "join-room", room: roomToJoin });
  };
  const handleReady = () => socket.send({ event: "ready" });
  const handleSendMessage = (data: any) => socket.send(data);

  const handleLeave = () => {
    socket.send({ event: "leave-room", room: socket.currentRoom });
    socket.setMessages([]);
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-5xl font-bold text-center mb-12">Multiplayer Game</h1>

        <div className="fixed top-4 right-4 bg-zinc-900 px-4 py-2 rounded-xl">
          {socket.isConnected ? "🟢 Connected" : "🔴 Connecting..."}
        </div>

        {!socket.currentRoom ? (
          <div className="max-w-xl mx-auto space-y-8">
            <CreateRoom onRoomCreated={handleCreate} />

            <div className="bg-zinc-900 p-8 rounded-2xl">
              <h2 className="text-2xl mb-4">Join Room</h2>
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Enter room code"
                  value={roomToJoin}
                  onChange={(e) => setRoomToJoin(e.target.value)}
                  className="flex-1 p-4 bg-zinc-800 rounded-xl"
                />
                <button onClick={handleJoin} className="bg-blue-600 px-8 rounded-xl">
                  Join
                </button>
              </div>
            </div>
          </div>
        ) : (
          <GameRoom
            room={socket.currentRoom}
            players={socket.players}
            maxPlayers={socket.maxPlayers}
            readyCount={socket.readyCount}
            status={socket.status}
            countdown={socket.countdown}
            messages={socket.messages}
            isAdmin={socket.isAdmin}
            onReady={handleReady}
            onSendMessage={handleSendMessage}
            onLeave={handleLeave}
          />
        )}
      </div>
    </main>
  );
}
