'use client';
import { useState } from 'react';

export default function CreateRoom({ onRoomCreated }: { onRoomCreated: (payload: any) => void }) {
  const [gameId, setGameId] = useState("");
  const [roomName, setRoomName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [userId, setUserId] = useState("Host");

  const handleCreate = () => {
    const payload = {
      event: "create-room",
      gameId: gameId.trim() || undefined,
      room: roomName.trim() || undefined,
      maxPlayers,
      userId: userId.trim()
    };
    onRoomCreated(payload);
  };

  return (
    <div className="bg-zinc-900 p-8 rounded-2xl">
      <h2 className="text-3xl font-bold mb-6">Create New Game</h2>

      <input
        type="text"
        placeholder="Custom Game ID (optional)"
        value={gameId}
        onChange={(e) => setGameId(e.target.value)}
        className="w-full p-4 bg-zinc-800 rounded-xl mb-4"
      />

      <input
        type="text"
        placeholder="Room Name (optional)"
        value={roomName}
        onChange={(e) => setRoomName(e.target.value)}
        className="w-full p-4 bg-zinc-800 rounded-xl mb-4"
      />

      <input
        type="text"
        placeholder="Your Username"
        value={userId}
        onChange={(e) => setUserId(e.target.value)}
        className="w-full p-4 bg-zinc-800 rounded-xl mb-6"
      />

      <div className="mb-6">
        <p className="mb-3 text-gray-400">Max Players</p>
        <div className="flex gap-3">
          {[2, 4, 6, 8].map(n => (
            <button
              key={n}
              onClick={() => setMaxPlayers(n)}
              className={`flex-1 py-4 rounded-xl font-semibold ${maxPlayers === n ? 'bg-blue-600' : 'bg-zinc-700'}`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleCreate}
        className="w-full bg-green-600 hover:bg-green-700 py-4 text-xl font-bold rounded-2xl"
      >
        Create Game
      </button>
    </div>
  );
}
