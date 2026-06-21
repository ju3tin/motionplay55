'use client';

import { useParams } from 'next/navigation';
import { usePubNub } from '@/hooks/usePubNub';
import { useEffect, useState } from 'react';

export default function GameRoom() {
  const params = useParams();
  const roomCode = params?.roomCode as string | undefined;

  const channel = roomCode ? `motionplay-room-${roomCode}` : '';
  const userId = `player-${Math.random().toString(36).slice(2)}`;

  const { subscribeToChannel, publish, messages, setPresenceState } = usePubNub(userId);

  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!roomCode || !channel) {
      console.error('Room code is missing');
      return;
    }

    // Subscribe to the game room
    subscribeToChannel(channel);

    // Set initial presence
    setPresenceState(channel, { 
      status: 'playing', 
      position: { x: 0, y: 0 } 
    });

    setIsConnected(true);

    return () => {
      // Optional: cleanup if needed
    };
  }, [roomCode, channel, subscribeToChannel, setPresenceState]);

  const sendGameAction = (action: any) => {
    if (!channel) return;
    publish(channel, { 
      type: 'game-action', 
      player: userId, 
      ...action 
    });
  };

  // Loading / Error state
  if (!roomCode) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Invalid or missing room code</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">Room: {roomCode}</h1>
      <p className="mb-6">Connected as: <span className="font-mono">{userId}</span></p>

      {isConnected && <p className="text-green-600">✅ Connected to room</p>}

      {/* ====================== */}
      {/* Your MotionPlay Game Here */}
      {/* ====================== */}

      <div className="mt-8">
        <button 
          onClick={() => sendGameAction({ move: 'jump' })}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Example: Jump
        </button>
      </div>

      {/* Debug: See incoming messages */}
      <div className="mt-10">
        <h3 className="font-semibold mb-2">Messages (Debug)</h3>
        <pre className="bg-gray-900 text-gray-100 p-4 rounded overflow-auto max-h-96">
          {JSON.stringify(messages, null, 2)}
        </pre>
      </div>
    </div>
  );
}
