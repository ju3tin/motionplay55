'use client';

import { useState, useEffect } from 'react';

interface HealthResponse {
  status: string;
  uptime: number;
  rooms: number;
  connections: number;
  timestamp: string;
}

export default function LoadingScreen() {
  const [status, setStatus] = useState('Polling health check...');
  const [message, setMessage] = useState('Waiting for game server to be ready...');
  const [attempts, setAttempts] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [healthData, setHealthData] = useState<HealthResponse | null>(null);

  const CHECK_INTERVAL = 2000;

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const checkHealth = async () => {
      setAttempts(prev => prev + 1);
      setStatus(`Attempt ${attempts + 1}...`);

      try {
        const response = await fetch('/api/health', {
          method: 'GET',
          cache: 'no-cache',
        });

        if (!response.ok) throw new Error('Server not ready');

        const data: HealthResponse = await response.json();

        if (data.status === 'ok') {
          setHealthData(data);
          setStatus('Server is ready! ✓');
          setMessage('Loading game...');
          setIsReady(true);

          setTimeout(() => handleServerReady(data), 800);
          return;
        } else {
          setMessage('Server is starting up...');
        }
      } catch (err) {
        setMessage('Connection failed (retrying...)');
        setStatus(`Attempt ${attempts + 1} - Error`);
      }
    };

    interval = setInterval(checkHealth, CHECK_INTERVAL);
    checkHealth(); // First check immediately

    return () => clearInterval(interval);
  }, []);

  const handleServerReady = (data: HealthResponse) => {
    console.log('✅ Server ready!', data);
    // window.location.href = '/game'; // Change this when you have a game page
  };

  if (isReady && healthData) {
    return (
      <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center text-white">
        <div className="text-center">
          <div className="text-7xl mb-6">✅</div>
          <h1 className="text-5xl font-bold mb-4">Connected!</h1>
          <p className="text-emerald-400 text-xl">Server is online</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center text-white">
      <div className="text-center">
        <div className="w-24 h-24 border-8 border-[#1a1a2e] border-t-[#00ffcc] rounded-full animate-spin mx-auto mb-10" />
        
        <h1 className="text-4xl font-bold mb-4">Connecting to Game Server</h1>
        <p className="text-gray-400 text-lg mb-6">{message}</p>
        
        <div className="font-mono text-[#00ffcc]">{status}</div>
        <div className="mt-8 text-xs text-gray-500">Attempt {attempts}</div>
      </div>
    </div>
  );
}
