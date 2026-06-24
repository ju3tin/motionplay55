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
    if (roomToJoin) {
      socket.send({ event: "join-room", room: roomToJoin });
    }
  };

  const handleReady = () => socket.send({ event: "ready" });
  const handleSendMessage = (data: any) => socket.send(data);
  const handleLeave = () => {
    socket.send({ event: "leave-room", room: socket.currentRoom });
    socket.setMessages([]);
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <h1 className="text-5xl font-bold text-center mb-10">Multiplayer Game</h1>

      {!socket.currentRoom ? (
        <div className="max-w-2xl mx-auto space-y-8">
          <CreateRoom onRoomCreated={handleCreateRoom} />

          <div className="bg-gray-800 p-6 rounded-xl">
            <h2 className="text-xl mb-4">Join Existing Room</h2>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Enter room code"
                value={roomToJoin}
                onChange={(e) => setRoomToJoin(e.target.value)}
                className="flex-1 p-3 bg-gray-700 rounded"
              />
              <button onClick={handleJoinRoom} className="bg-blue-600 px-8 rounded font-semibold">
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
    </main>
  );
}
