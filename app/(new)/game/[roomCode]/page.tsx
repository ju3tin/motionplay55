'use client';

import { useParams } from 'next/navigation';
import { usePubNub } from '@/hooks/usePubNub';
import { useEffect } from 'react';

export default function GameRoom() {
  const { roomCode } = useParams();
  const channel = `motionplay-room-${roomCode}`;
  const userId = `player-${Math.random().toString(36).slice(2)}`;

  const { subscribeToChannel, publish, messages, setPresenceState } = usePubNub(userId);

  useEffect(() => {
    subscribeToChannel(channel);

    // Join presence
    setPresenceState(channel, { status: 'playing', position: { x: 0, y: 0 } });

    // Optional: Listen for lobby updates too if needed
  }, [channel]);

  const sendGameAction = (action: any) => {
    publish(channel, { type: 'game-action', player: userId, ...action });
  };

  return (
    <div>
      <h1>Room: {roomCode}</h1>
      <p>Connected as: {userId}</p>

      {/* Your MotionPlay game canvas / logic here */}

      <button onClick={() => sendGameAction({ move: 'jump' })}>
        Example Action
      </button>

      {/* Render game state from messages */}
      <pre>{JSON.stringify(messages, null, 2)}</pre>
    </div>
  );
}
