// lib/socket.ts
import { useRef, useState } from 'react';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000';

interface Message {
  event: string;
  gameId?: string;
  room?: string;
  userId?: string;
  message?: string;
  players?: number;
  maxPlayers?: number;
  readyCount?: number;
  totalPlayers?: number;
  timeLeft?: number;
  fromAdmin?: boolean;
  [key: string]: any;
}

export function useGameSocket() {
  const socketRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentGameId, setCurrentGameId] = useState<string | null>(null);
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>("");
  const [players, setPlayers] = useState(0);
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [readyCount, setReadyCount] = useState(0);
  const [status, setStatus] = useState<'waiting' | 'countdown' | 'playing'>('waiting');
  const [messages, setMessages] = useState<Message[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);

  const connect = (admin = false, token = "your-super-secret-admin-token") => {
    let url = WS_URL;
    if (admin) url += `?admin=true&token=${token}`;

    const ws = new WebSocket(url);
    socketRef.current = ws;

    ws.onopen = () => {
      console.log("✅ Connected");
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      const data: Message = JSON.parse(event.data);
      console.log("📨", data.event, data);

      switch (data.event) {
        case "connected":
          setIsAdmin(!!data.isAdmin);
          break;

        case "room-created":
          setCurrentGameId(data.gameId!);
          setCurrentRoom(data.room || data.gameId!);
          setPlayers(data.players || 1);
          setMaxPlayers(data.maxPlayers || 4);
          break;

        case "room-joined":
          setCurrentGameId(data.gameId!);
          setCurrentRoom(data.room || data.gameId!);
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
          setStatus("playing");
          setCountdown(null);
          break;

        case "chat":
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

  const disconnect = () => socketRef.current?.close();

  return {
    isConnected,
    isAdmin,
    currentGameId,
    currentRoom,
    userId,
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
    setUserId
  };
}
