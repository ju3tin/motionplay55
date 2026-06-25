import { useState, useEffect, useCallback } from 'react';

export function useMultiplayerGame(room: string) {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [myUserId] = useState(`Player-${Math.floor(Math.random() * 10000)}`);
  const [isConnected, setIsConnected] = useState(false);
  const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000';
  const send = useCallback((event: string, payload: any = {}) => {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        event,
        room,
        userId: myUserId,
        payload,
        timestamp: Date.now()
      }));
    }
  }, [ws, room, myUserId]);

  useEffect(() => {
    let url = WS_URL
    const socket = new WebSocket(url);

    socket.onopen = () => {
      setIsConnected(true);
      send("join-room", { userId: myUserId });
    };

    socket.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.event === 'user-joined' || data.event === 'player-update') {
          setPlayers(prev => {
            const filtered = prev.filter(p => p.userId !== data.payload.userId);
            return [...filtered, data.payload];
          });
        }
      } catch (err) {}
    };

    socket.onclose = () => setIsConnected(false);
    setWs(socket);

    return () => socket.close();
  }, [room]);

  return { ws, send, players, myUserId, isConnected };
}
