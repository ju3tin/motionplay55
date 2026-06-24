// lib/socket.ts
import { useEffect, useRef, useState } from 'react';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000';

export function useGameSocket() {
  const socketRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [players, setPlayers] = useState(0);
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [readyCount, setReadyCount] = useState(0);
  const [status, setStatus] = useState<'waiting' | 'countdown' | 'playing'>('waiting');
  const [messages, setMessages] = useState<any[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);

  const connect = (admin = false, token = '') => {
    let url = WS_URL;
    if (admin && token) {
      url += `?admin=true&token=${token}`;
    }

    const ws = new WebSocket(url);
    socketRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      console.log("Connected to game server");
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("Received:", data);

      switch (data.event) {
        case "connected":
          setIsAdmin(data.isAdmin || false);
          break;

        case "room-created":
        case "room-joined":
          setCurrentRoom(data.room);
          setPlayers(data.players || 1);
          setMaxPlayers(data.maxPlayers || 4);
          break;

        case "player-joined":
        case "player-left":
          setPlayers(data.players);
          break;

        case "ready-update":
          setReadyCount(data.readyCount);
          setPlayers(data.totalPlayers);
          if (data.allReady) setStatus('countdown');
          break;

        case "countdown":
          setCountdown(data.timeLeft);
          if (data.timeLeft === 0) setStatus('playing');
          break;

        case "game-start":
          setStatus('playing');
          setCountdown(null);
          break;

        case "chat":
        case "message":
          setMessages(prev => [...prev, data]);
          break;
      }
    };

    ws.onclose = () => setIsConnected(false);
  };

  const send = (data: any) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(data));
    }
  };

  const disconnect = () => {
    socketRef.current?.close();
  };

  return {
    isConnected,
    isAdmin,
    currentRoom,
    players,
    maxPlayers,
    readyCount,
    status,
    countdown,
    messages,
    connect,
    send,
    disconnect,
    setMessages
  };
}
