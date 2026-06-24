'use client';
import { useState } from 'react';

interface Message {
  event: string;
  userId?: string;
  message?: string;
  timestamp?: number;
  fromAdmin?: boolean;
}

interface GameRoomProps {
  room: string;
  players: number;
  maxPlayers: number;
  readyCount: number;
  status: 'waiting' | 'countdown' | 'playing';
  countdown: number | null;
  messages: Message[];
  isAdmin: boolean;
  onSendReady: () => void;
  onSendMessage: (data: any) => void;
  onLeave: () => void;
}

export default function GameRoom({
  room,
  players,
  maxPlayers,
  readyCount,
  status,
  countdown,
  messages,
  isAdmin,
  onSendReady,
  onSendMessage,
  onLeave
}: GameRoomProps) {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage({
        event: "chat",
        room,
        userId: "You",
        message: message.trim()
      });
      setMessage('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="bg-gray-900 p-6 rounded-2xl mb-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Room: <span className="text-blue-400">{room}</span></h1>
          <button 
            onClick={onLeave}
            className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded-xl font-medium transition"
          >
            Leave Room
          </button>
        </div>

        <div className="flex flex-wrap gap-6 text-lg">
          <div>Players: <span className="font-bold text-green-400">{players}/{maxPlayers}</span></div>
          <div>Ready: <span className="font-bold text-yellow-400">{readyCount}/{players}</span></div>
          <div className="capitalize">Status: <span className="font-semibold">{status}</span></div>
        </div>

        {countdown !== null && (
          <div className="text-5xl font-bold text-red-500 mt-6 text-center">
            Starting in {countdown}...
          </div>
        )}
      </div>

      {/* Ready Button */}
      {status === 'waiting' && (
        <button
          onClick={onSendReady}
          className="w-full bg-purple-600 hover:bg-purple-700 py-5 text-xl font-bold rounded-2xl mb-8 transition"
        >
          {readyCount === players && players >= 2 
            ? "Waiting for others..." 
            : "I'm Ready ✓"}
        </button>
      )}

      {/* Chat Area */}
      <div className="bg-gray-900 rounded-2xl p-4 h-[500px] flex flex-col">
        <div className="flex-1 overflow-y-auto mb-4 space-y-3 pr-2">
          {messages.map((msg, i) => (
            <div key={i} className="bg-gray-800 p-4 rounded-xl">
              <strong className={msg.fromAdmin ? "text-red-400" : "text-blue-400"}>
                {msg.userId || 'System'}
              </strong>
              : {msg.message}
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            className="flex-1 p-4 bg-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button 
            onClick={handleSend}
            className="bg-blue-600 hover:bg-blue-700 px-10 rounded-xl font-semibold"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
