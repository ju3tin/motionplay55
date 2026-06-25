'use client';
import { useState } from 'react';
import PoseMatchGame from "@/components/PoseMatchGame";

export default function GameRoom1({
  currentGameId,
  currentRoom,
  players,
  maxPlayers,
  readyCount,
  status,
  countdown,
  messages,
  userId,
  send,
  onReady,
  onSendMessage,
  onLeave
}: any) {
  const [message, setMessage] = useState("");

  const sendMessage = () => {
    if (message.trim()) {
      onSendMessage({
        event: "chat",
        gameId: currentGameId,
        message: message.trim(),
        userId
      });
      setMessage("");
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-zinc-900 p-6 rounded-2xl mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Game: {currentGameId}</h1>
            <p className="text-gray-400">Room: {currentRoom}</p>
          </div>
          <button onClick={onLeave} className="bg-red-600 px-6 py-3 rounded-xl">Leave Game</button>
        </div>

        <div className="mt-6 flex gap-8 text-lg">
          <div>Players: <strong className="text-green-400">{players}/{maxPlayers}</strong></div>
          <div>Ready: <strong className="text-yellow-400">{readyCount}/{players}</strong></div>
          <div>Status: <strong className="capitalize">{status}</strong></div>
        </div>

        {countdown !== null && (
          <div className="text-6xl font-bold text-red-500 text-center mt-10">
            Starting in {countdown}...
          </div>
        )}
      </div>
    <PoseMatchGame

roomId={currentGameId!}

userId={userId}

players={players}

send={send}

gameActive={
status === "playing"
}

/>
     

      {status === 'waiting' && (
  
        <button
          onClick={onReady}
          className="w-full bg-purple-600 hover:bg-purple-700 py-5 text-2xl font-bold rounded-2xl mb-8"
        >
          {readyCount === players && players >= 2 ? "Waiting for others..." : "I'm Ready"}
        </button>
      )}

      {/* Chat */}
      <div className="bg-zinc-900 rounded-2xl p-6 h-[500px] flex flex-col">
        <div className="flex-1 overflow-y-auto mb-4 space-y-3">
          {messages.map((msg: any, i: number) => (
            <div key={i} className="bg-zinc-800 p-4 rounded-xl">
              <strong className={msg.fromAdmin ? "text-red-400" : ""}>
                {msg.userId}:
              </strong> {msg.message}
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type a message..."
            className="flex-1 p-4 bg-zinc-800 rounded-xl"
          />
          <button onClick={sendMessage} className="bg-blue-600 px-10 rounded-xl font-semibold">Send</button>
        </div>
      </div>
    </div>
  );
}
