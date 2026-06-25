'use client';
import { useState } from 'react';

export default function GameRoom({
  room, players, maxPlayers, readyCount, status, countdown,
  messages, onReady, onSendMessage, onLeave
}: any) {
  const [msg, setMsg] = useState("");

  const sendMessage = () => {
    if (msg.trim()) {
      onSendMessage({ event: "chat", room, message: msg.trim(), userId: "You" });
      setMsg("");
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-zinc-900 p-6 rounded-2xl mb-6">
        <div className="flex justify-between">
          <h1 className="text-3xl font-bold">Room: {room}</h1>
          <button onClick={onLeave} className="bg-red-600 px-6 py-2 rounded-xl">Leave</button>
        </div>

        <div className="mt-4 flex gap-8 text-lg">
          <div>Players: <strong className="text-green-400">{players}/{maxPlayers}</strong></div>
          <div>Ready: <strong className="text-yellow-400">{readyCount}/{players}</strong></div>
          <div>Status: <strong className="capitalize">{status}</strong></div>
        </div>

        {countdown && (
          <div className="text-6xl font-bold text-red-500 text-center mt-8">
            Starting in {countdown}...
          </div>
        )}
      </div>

      {status === 'waiting' && (
        <button
          onClick={onReady}
          className="w-full bg-purple-600 hover:bg-purple-700 py-5 text-2xl font-bold rounded-2xl mb-8"
        >
          {readyCount === players && players >= 2 ? "Waiting for others..." : "I'm Ready"}
        </button>
      )}

      {/* Chat */}
      <div className="bg-zinc-900 rounded-2xl p-6 h-96 flex flex-col">
        <div className="flex-1 overflow-auto mb-4 space-y-2">
          {messages.map((m: any, i: number) => (
            <div key={i} className="bg-zinc-800 p-3 rounded-xl">
              <strong>{m.userId}:</strong> {m.message}
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type message..."
            className="flex-1 p-4 bg-zinc-800 rounded-xl"
          />
          <button onClick={sendMessage} className="bg-blue-600 px-8 rounded-xl">Send</button>
        </div>
      </div>
    </div>
  );
}
