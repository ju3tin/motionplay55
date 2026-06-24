'use client';
import { useState } from 'react';
import { useGameSocket } from '@/lib/socket';
import CreateRoom from '@/components/CreateRoom';
import GameRoom from '@/components/GameRoom';

export default function Home() {
  const socket = useGameSocket();
  const [roomToJoin, setRoomToJoin] = useState('');

  const handleCreateRoom = (payload: any) => {
    socket.send(payload);
  };

  const handleJoinRoom = () => {
    if (roomToJoin.trim()) {
      socket.send({ event: "join-room", room: roomToJoin.trim() });
    }
  };

  const handleReady = () => socket.send({ event: "ready" });

  const handleSendMessage = (data: any) => socket.send(data);

  const handleLeave = () => {
    if (socket.currentRoom) {
      socket.send({ event: "leave-room", room: socket.currentRoom });
    }
    socket.setMessages([]);
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-5xl font-bold text-center mb-10">Multiplayer Game</h1>

        {/* Connection Status */}
        <div className="fixed top-4 right-4 bg-black/80 px-4 py-2 rounded-xl text-sm z-50">
          {socket.isConnected ? "🟢 Connected" : "🔴 Disconnected"}
        </div>

        {!socket.currentRoom ? (
          <div className="max-w-2xl mx-auto space-y-8">
            {/* Admin Connect Button */}
            <div className="text-center">
              <button
                onClick={() => socket.connect(true, "your-super-secret-admin-token")}
                className="bg-red-600 hover:bg-red-700 px-6 py-3 rounded-xl font-medium"
              >
                Connect as Admin
              </button>
            </div>

            <CreateRoom onRoomCreated={handleCreateRoom} />

            <div className="bg-gray-800 p-6 rounded-2xl">
              <h2 className="text-xl mb-4">Join Existing Room</h2>
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Enter room code"
                  value={roomToJoin}
                  onChange={(e) => setRoomToJoin(e.target.value)}
                  className="flex-1 p-4 bg-gray-700 rounded-xl focus:outline-none"
                />
                <button
                  onClick={handleJoinRoom}
                  className="bg-blue-600 px-10 rounded-xl font-semibold hover:bg-blue-700"
                >
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
            onSendReady={handleReady}
            onSendMessage={handleSendMessage}
            onLeave={handleLeave}
          />
        )}
      </div>
    </main>
  );
}
