'use client';

import { useState, useEffect } from 'react';
import { usePubNub } from '@/hooks/usePubNub';
import { v4 as uuidv4 } from 'uuid'; // npm install uuid

export default function Lobby() {
  const userId = `player-${Math.random().toString(36).slice(2)}`; // Or use auth
  const { subscribeToChannel, publish } = usePubNub(userId);
  const [rooms, setRooms] = useState<any[]>([]);
  const [roomCode, setRoomCode] = useState('');

  // Subscribe to lobby for open rooms
  useEffect(() => {
    subscribeToChannel('motionplay-lobby');
  }, []);

  const createRoom = async () => {
    const newRoomCode = uuidv4().slice(0, 8).toUpperCase();
    const roomChannel = `motionplay-room-${newRoomCode}`;

    // Announce new room in lobby
    await publish('motionplay-lobby', {
      type: 'new-room',
      roomCode: newRoomCode,
      channel: roomChannel,
      host: userId,
      players: 1,
      maxPlayers: 4, // example for MotionPlay
    });

    // Join the room yourself
    window.location.href = `/game/${newRoomCode}`;
  };

  const joinRoom = (code: string) => {
    window.location.href = `/game/${code}`;
  };

  return (
    <div>
      <h1>MotionPlay Lobby</h1>
      <button onClick={createRoom}>Create Room</button>

      <input
        value={roomCode}
        onChange={(e) => setRoomCode(e.target.value)}
        placeholder="Enter room code"
      />
      <button onClick={() => joinRoom(roomCode)}>Join Room</button>

      {/* List open rooms from lobby messages */}
    </div>
  );
}
