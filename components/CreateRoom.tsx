'use client';
import { useState } from 'react';

export default function CreateRoom({ onRoomCreated }: { onRoomCreated: (payload: any) => void }) {
  const [roomName, setRoomName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);

  const handleCreate = () => {
    const payload: any = { event: "create-room", maxPlayers };
    if (roomName.trim()) payload.room = roomName.trim();
    onRoomCreated(payload);
  };

  return (
    <div className="bg-gray-800 p-8 rounded-2xl">
      <h2 className="text-2xl font-bold mb-6">Create New Room</h2>
      
      <input
        type="text"
        placeholder="Room name (optional)"
        value={roomName}
        onChange={(e) => setRoomName(e.target.value)}
        className="w-full p-4 bg-gray-700 rounded-xl mb-6 focus:outline-none"
      />

      <div className="mb-6">
        <p className="mb-3 text-gray-400">Max Players</p>
        <div className="flex gap-3">
          {[2, 4, 6, 8].map((n) => (
            <button
              key={n}
              onClick={() => setMaxPlayers(n)}
              className={`flex-1 py-4 rounded-xl font-semibold transition ${
                maxPlayers === n ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              {n} Players
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleCreate}
        className="w-full bg-green-600 hover:bg-green-700 py-4 text-xl font-bold rounded-2xl transition"
      >
        Create Room
      </button>
    </div>
  );
}
