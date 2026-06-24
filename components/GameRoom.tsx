'use client';
import { useState } from 'react';

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
}: any) {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage({ event: "chat", room, message, userId: "You" });
      setMessage('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-gray-900 p-6 rounded-xl mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold">Room: {room}</h1>
          <button onClick={onLeave} className="bg-red-600 px-4 py-2 rounded">Leave Room</button>
        </div>

        <div className="flex gap-6">
          <div>
            Players: <span className="text-2xl font-bold text-green-400">{players}/{maxPlayers}</span>
          </div>
          <div>
            Ready: <span className="text-2xl font-bold text-yellow-400">{readyCount}</span>
          </div>
          <div className="capitalize font-semibold">Status: {status}</div>
        </div>

        {countdown !== null && (
          <div className="text-4xl font-bold text-red-500 mt-4">Starting in {countdown}...</div>
        )}
      </div>

      {/* Ready Button */}
      {status === 'waiting' && (
        <button
          onClick={onSendReady}
          className="w-full bg-purple-600 hover:bg-purple-700 py-4 text-xl font-bold rounded-xl mb-6"
        >
          {readyCount === players ? "Waiting for others..." : "I'm Ready"}
        </button>
      )}

      {/* Chat */}
      <div className="bg-gray-900 rounded-xl p-4 h-96 flex flex-col">
        <div className="flex-1 overflow-y-auto mb-4 space-y-2">
          {messages.map((msg, i) => (
            <div key={i} className="bg-gray-800 p-3 rounded">
              <strong>{msg.userId || 'System'}:</strong> {msg.message}
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
            className="flex-1 p-3 bg-gray-800 rounded"
          />
          <button onClick={handleSend} className="bg-blue-600 px-8 rounded">Send</button>
        </div>
      </div>
    </div>
  );
}
