// lib/socket.ts
import { useRef, useState } from 'react';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000';

interface Message {
  event: string;
  room?: string;
  userId?: string;
  message?: string;
  timestamp?: number;
  fromAdmin?: boolean;
  players?: number;
  maxPlayers?: number;
  readyCount?: number;
  totalPlayers?: number;
  timeLeft?: number;
  [key: string]: any;
}

export function useGameSocket() {
  const socketRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [players, setPlayers] = useState(0);
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [readyCount, setReadyCount] = useState(0);
  const [status, setStatus] = useState<'waiting' | 'countdown' | 'playing'>('waiting');
  const [messages, setMessages] = useState<Message[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);

  const connect = (admin = false, token = '') => {
    let url = WS_URL;
    if (admin && token) {
      url += `?admin=true&token=${token}`;
    }

    console.log("🔌 Connecting to:", url);

    const ws = new WebSocket(url);
    socketRef.current = ws;

    ws.onopen = () => {
      console.log("✅ WebSocket Connected!");
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data: Message = JSON.parse(event.data);
        console.log("📨 Received:", data);

        switch (data.event) {
          case "connected":
            setIsAdmin(!!data.isAdmin);
            break;

          case "room-created":
          case "room-joined":
            setCurrentRoom(data.room || null);
            setPlayers(data.players || 1);
            setMaxPlayers(data.maxPlayers || 4);
            break;

          case "player-joined":
          case "player-left":
            setPlayers(data.players || 0);
            break;

          case "ready-update":
            setReadyCount(data.readyCount || 0);
            setPlayers(data.totalPlayers || 0);
            break;

          case "countdown":
            setCountdown(data.timeLeft ?? null);
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
      } catch (err) {
        console.error("Failed to parse message:", err);
      }
    };

    ws.onerror = (error) => console.error("❌ WebSocket Error:", error);
    ws.onclose = () => {
      console.log("🔌 WebSocket Disconnected");
      setIsConnected(false);
    };
  };

  const send = (data: any) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(data));
    } else {
      console.warn("Socket not connected");
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
    setMessages,
  };
}
