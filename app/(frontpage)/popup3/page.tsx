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

  const HEALTH_URL = 'https://node-gameserver.onrender.com/health';
  const CHECK_INTERVAL = 2000; // 2 seconds

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const checkHealth = async () => {
      setAttempts((prev) => prev + 1);

      try {
        const response = await fetch(HEALTH_URL, {
          method: 'GET',
          cache: 'no-cache',
          headers: {
            Accept: 'application/json',
          },
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data: HealthResponse = await response.json();

        if (data.status === 'ok') {
          setHealthData(data);
          setStatus('Server is ready! ✓');
          setMessage('Loading game...');
          setIsReady(true);

          // Auto proceed after short delay
          setTimeout(() => {
            handleServerReady(data);
          }, 800);

          return;
        } else {
          setMessage('Server is starting up...');
          setStatus(`Attempt ${attempts + 1} - Server not ready yet`);
        }
      } catch (err) {
        console.error('Health check failed:', err);
        setMessage('Connection failed (retrying...)');
        setStatus(`Attempt ${attempts + 1} - Error`);
      }
    };

    // Start polling
    interval = setInterval(checkHealth, CHECK_INTERVAL);

    // Initial check
    checkHealth();

    return () => clearInterval(interval);
  }, []);

  const handleServerReady = (data: HealthResponse) => {
    // === CUSTOMIZE THIS PART ===
    
    console.log('Server is ready!', data);

    // Option 1: Redirect to your main game page
    // window.location.href = '/game';           // or '/dashboard', etc.

    // Option 2: Show success screen (current behavior)
    alert(`✅ Server is online!\nUptime: ${Math.floor(data.uptime / 60)} minutes`);
    
    // You can replace the alert with a nice success UI or router.push()
  };

  if (isReady && healthData) {
    return (
      <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center text-white">
        <div className="text-center">
          <div className="text-6xl mb-6">✅</div>
          <h1 className="text-4xl font-bold mb-4">Connected Successfully!</h1>
          <p className="text-xl text-emerald-400 mb-8">
            Server is up and running
          </p>
          <div className="text-sm text-gray-400 font-mono">
            Uptime: {Math.floor(healthData.uptime / 60)} minutes | 
            Rooms: {healthData.rooms} | 
            Connections: {healthData.connections}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center text-white overflow-hidden">
      <div className="text-center">
        {/* Spinner */}
        <div className="w-24 h-24 border-8 border-[#1a1a2e] border-t-[#00ffcc] rounded-full animate-spin mx-auto mb-10"></div>

        <h1 className="text-4xl font-bold mb-4">Connecting to Game Server</h1>
        
        <p className="text-gray-400 text-lg mb-8 max-w-md mx-auto">{message}</p>

        <div className="font-mono text-sm text-[#00ffcc] tracking-wider">
          {status}
        </div>

        <div className="mt-12 text-xs text-gray-500">
          Attempt {attempts} • Checking every 2 seconds
        </div>
      </div>
    </div>
  );
}
