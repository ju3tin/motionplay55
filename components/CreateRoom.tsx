//components/CreateRoom.tsx
'use client';
import { useState } from 'react';

export default function CreateRoom({ onRoomCreated, isAdmin }: { onRoomCreated: (room: string) => void; isAdmin?: boolean }) {
  const [roomName, setRoomName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);

  const handleCreate = () => {
    const payload: any = { event: "create-room", maxPlayers };
    if (roomName) payload.room = roomName;

    // This will be handled by parent component via socket
    onRoomCreated(payload);
  };

  return (
    <div className="bg-gray-800 p-6 rounded-xl">
      <h2 className="text-2xl font-bold mb-4">Create New Room</h2>
      <input
        type="text"
        placeholder="Room name (optional)"
        value={roomName}
        onChange={(e) => setRoomName(e.target.value)}
        className="w-full p-3 rounded bg-gray-700 mb-3"
      />
      <div className="flex gap-2 mb-4">
        {[2, 4, 6, 8].map(n => (
          <button
            key={n}
            onClick={() => setMaxPlayers(n)}
            className={`px-4 py-2 rounded ${maxPlayers === n ? 'bg-blue-600' : 'bg-gray-700'}`}
          >
            {n} Players
          </button>
        ))}
      </div>
      <button
        onClick={handleCreate}
        className="w-full bg-green-600 hover:bg-green-700 py-3 rounded font-semibold"
      >
        Create Room
      </button>
    </div>
  );
}
