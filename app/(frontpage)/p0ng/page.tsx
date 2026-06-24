'use client';

import { useState, useEffect, useRef } from 'react';

export default function GamePage() {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [room, setRoom] = useState('lobby');
  const [userId] = useState(`Player-${Math.floor(Math.random() * 10000)}`);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const connectWebSocket = () => {
    const socket = new WebSocket('wss://gameserver1-kkmk.onrender.com/');

    socket.onopen = () => {
      setIsConnected(true);
      setConnectionStatus('Connected ✅');
      setMessages(prev => [...prev, { event: 'system', message: 'Connected to game server!' }]);

      // Join room
      socket.send(JSON.stringify({
        event: "join-room",
        room: room,
        userId: userId
      }));
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setMessages(prev => [...prev, data]);
      } catch (e) {
        console.error("Failed to parse message", e);
      }
    };

    socket.onclose = (event) => {
      setIsConnected(false);
      setConnectionStatus(`Disconnected (Code: ${event.code})`);
      setMessages(prev => [...prev, { event: 'system', message: 'Disconnected from server. Retrying...' }]);
      
      // Auto-reconnect after 3 seconds
      setTimeout(() => {
        if (!isConnected) connectWebSocket();
      }, 3000);
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnectionStatus('Connection Error');
    };

    setWs(socket);
  };

  useEffect(() => {
    connectWebSocket();

    return () => {
      if (ws) ws.close();
    };
  }, []);

  // Rest of your sendMessage, joinNewRoom, etc. stay the same...
  const sendMessage = () => {
    if (!ws || input.trim() === '' || ws.readyState !== WebSocket.OPEN) return;

    ws.send(JSON.stringify({
      event: "chat",
      room: room,
      userId: userId,
      message: input.trim()
    }));

    setInput('');
  };

  const joinNewRoom = (newRoom: string) => {
    if (ws && newRoom && newRoom !== room) {
      ws.send(JSON.stringify({ event: "leave-room", room: room }));
      setRoom(newRoom);
      ws.send(JSON.stringify({
        event: "join-room",
        room: newRoom,
        userId: userId
      }));
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="min-h-screen bg-[#0a0a14] text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between mb-6">
          <h1 className="text-4xl font-bold">Multiplayer Game</h1>
          <div className="text-right">
            <div className={`inline-block px-4 py-1 rounded-full text-sm ${isConnected ? 'bg-green-600' : 'bg-red-600'}`}>
              {connectionStatus}
            </div>
            <div className="text-xs text-gray-400 mt-1">User: {userId}</div>
          </div>
        </div>

        {/* Room Selector */}
        <div className="bg-[#1a1a2e] p-4 rounded-xl mb-6 flex gap-3">
          <input
            type="text"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            className="bg-[#0f0f1a] px-4 py-3 rounded-lg flex-1 border border-gray-700"
            placeholder="Room name (e.g. lobby, room1)"
          />
          <button
            onClick={() => joinNewRoom(room)}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-medium"
          >
            Join Room
          </button>
        </div>

        {/* Chat Area */}
        <div className="bg-[#1a1a2e] rounded-2xl h-[65vh] flex flex-col">
          <div className="p-4 border-b border-gray-700 text-sm">
            Room: <strong>{room}</strong>
          </div>

          <div className="flex-1 p-6 overflow-y-auto space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className="text-sm">
                {msg.event === 'user-joined' && <p className="text-green-400">👋 {msg.payload?.userId} joined</p>}
                {msg.event === 'chat' && (
                  <p><span className="text-blue-400">{msg.userId}:</span> {msg.message}</p>
                )}
                {msg.event === 'system' && <p className="text-gray-400">ℹ️ {msg.message}</p>}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-gray-700">
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                className="flex-1 bg-[#0f0f1a] border border-gray-600 rounded-xl px-5 py-3 focus:outline-none"
                placeholder="Type message..."
              />
              <button
                onClick={sendMessage}
                className="bg-[#00ffcc] text-black font-semibold px-8 rounded-xl hover:bg-[#00ccaa]"
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
