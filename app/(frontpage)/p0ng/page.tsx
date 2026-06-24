'use client';

import { useState, useEffect, useRef } from 'react';

interface Message {
  event: string;
  room?: string;
  userId?: string;
  message?: string;
  payload?: any;
  timestamp?: number;
}

export default function GamePage() {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [room, setRoom] = useState('lobby');
  const [userId] = useState('Player-' + Math.floor(Math.random() * 1000));
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Connect to WebSocket
  useEffect(() => {
    const socket = new WebSocket('wss://node-gameserver.onrender.com');

    socket.onopen = () => {
      setIsConnected(true);
      setMessages(prev => [...prev, { event: 'connected', message: 'Connected to game server!' }]);

      // Auto join room
      socket.send(JSON.stringify({
        event: "join-room",
        room: room,
        userId: userId
      }));
    };

    socket.onmessage = (event) => {
      const data: Message = JSON.parse(event.data);
      setMessages(prev => [...prev, data]);
    };

    socket.onclose = () => {
      setIsConnected(false);
      setMessages(prev => [...prev, { event: 'disconnected', message: 'Disconnected from server' }]);
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    setWs(socket);

    return () => {
      socket.close();
    };
  }, [room, userId]);

  const sendMessage = () => {
    if (!ws || !input.trim() || ws.readyState !== WebSocket.OPEN) return;

    ws.send(JSON.stringify({
      event: "chat",
      room: room,
      userId: userId,
      message: input.trim()
    }));

    setInput('');
  };

  const joinNewRoom = (newRoom: string) => {
    if (ws && newRoom !== room) {
      // Leave old room
      ws.send(JSON.stringify({ event: "leave-room", room: room }));

      // Join new room
      setRoom(newRoom);
      ws.send(JSON.stringify({
        event: "join-room",
        room: newRoom,
        userId: userId
      }));
    }
  };

  // Auto scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="min-h-screen bg-[#0a0a14] text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Multiplayer Game</h1>
          <div className="flex items-center gap-4">
            <div className={`px-4 py-2 rounded-full text-sm ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}>
              {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
            </div>
            <div className="text-sm text-gray-400">User: {userId}</div>
          </div>
        </div>

        {/* Room Controls */}
        <div className="bg-[#1a1a2e] p-4 rounded-xl mb-6 flex gap-4">
          <input
            type="text"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            className="bg-[#0f0f1a] px-4 py-2 rounded-lg flex-1"
            placeholder="Room name"
          />
          <button
            onClick={() => joinNewRoom(room)}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg"
          >
            Join Room
          </button>
        </div>

        {/* Chat / Game Area */}
        <div className="bg-[#1a1a2e] rounded-2xl overflow-hidden h-[70vh] flex flex-col">
          <div className="p-4 border-b border-gray-700 bg-[#111827]">
            <strong>Room:</strong> {room} • {messages.length} messages
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className="text-sm">
                {msg.event === 'user-joined' && (
                  <p className="text-green-400">👋 {msg.payload?.userId} joined the room</p>
                )}
                {msg.event === 'chat' && (
                  <p>
                    <span className="text-blue-400 font-medium">{msg.userId}:</span> {msg.message}
                  </p>
                )}
                {msg.event === 'connected' && <p className="text-emerald-400">✅ {msg.message}</p>}
                {msg.event === 'disconnected' && <p className="text-red-400">❌ {msg.message}</p>}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-700 bg-[#111827]">
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                className="flex-1 bg-[#0f0f1a] border border-gray-600 rounded-xl px-5 py-3 focus:outline-none focus:border-[#00ffcc]"
                placeholder="Type a message..."
              />
              <button
                onClick={sendMessage}
                className="bg-[#00ffcc] hover:bg-[#00ccaa] text-black font-semibold px-8 rounded-xl"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
