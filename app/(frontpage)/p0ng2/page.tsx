'use client';

import { useState, useEffect } from 'react';
import { usePoseDetection } from '@/hooks/usePoseDetection';
import { useMultiplayerGame } from '@/hooks/useMultiplayerGame';
import GameLobby from '@/components/GameLobby';
import TargetPoseDisplay from '@/components/TargetPoseDisplay';
import PlayerCamera from '@/components/PlayerCamera';
import SimilarityMeter from '@/components/SimilarityMeter';
import Leaderboard from '@/components/Leaderboard';
import { targetPoses, getReferenceKeypoints } from '@/lib/poseDatabase';

export default function PoseMatchGame() {
  const room = "pose-match-room-v2";
  const { ws, send, players, myUserId, isConnected } = useMultiplayerGame(room);
  const { detector, isLoaded, error } = usePoseDetection();

  const [gamePhase, setGamePhase] = useState<'lobby' | 'playing'>('lobby');
  const [currentTarget, setCurrentTarget] = useState<any>(null);
  const [similarity, setSimilarity] = useState(0);
  const [roundWinner, setRoundWinner] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [roundScores, setRoundScores] = useState<Record<string, number>>({});

  // Improved Similarity Calculation
  const calculateSimilarity = (playerKeypoints: any[]) => {
    if (!currentTarget || !playerKeypoints?.length) return 0;

    const referenceKeypoints = getReferenceKeypoints(currentTarget.id);
    
    let totalScore = 0;
    let validPoints = 0;

    playerKeypoints.forEach((pk, i) => {
      const tk = referenceKeypoints[i];
      if (pk && tk && pk.score > 0.4 && tk.score > 0.4) {
        const dist = Math.hypot(pk.x - tk.x, pk.y - tk.y);
        const score = Math.max(0, 1 - (dist / 0.28)); // Tight threshold
        totalScore += score;
        validPoints++;
      }
    });

    return validPoints > 12 ? Math.min(99, Math.floor((totalScore / validPoints) * 100)) : 0;
  };

  const startNewRound = () => {
    const randomTarget = targetPoses[Math.floor(Math.random() * targetPoses.length)];
    const newTarget = { ...randomTarget, keypoints: getReferenceKeypoints(randomTarget.id) };

    setCurrentTarget(newTarget);
    setSimilarity(0);
    setRoundWinner(null);
    setTimeLeft(30);
    setRoundScores({});
    setGamePhase('playing');

    send("new-round", { targetId: newTarget.id, targetName: newTarget.name });
  };

  // Round Timer
  useEffect(() => {
    if (gamePhase !== 'playing' || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          if (!roundWinner) {
            send("round-ended", { reason: "time-up" });
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, gamePhase, roundWinner]);

  const handlePoseDetected = (keypoints: any[]) => {
    if (!currentTarget) return;

    const score = calculateSimilarity(keypoints);
    setSimilarity(score);

    if (score >= 85 && !roundWinner) {
      setRoundWinner(myUserId);
      send("player-won", { 
        targetId: currentTarget.id, 
        similarity: score,
        timeLeft 
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a14] text-white p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-6xl font-bold text-center mb-2">🎯 POSE MATCH</h1>
        <p className="text-center text-gray-400 mb-10">First to match wins the round!</p>

        {gamePhase === 'lobby' && (
          <GameLobby 
            players={players} 
            myUserId={myUserId} 
            onStartGame={startNewRound} 
          />
        )}

        {gamePhase === 'playing' && currentTarget && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left: Target + Timer */}
            <div className="lg:col-span-5 space-y-6">
              <TargetPoseDisplay target={currentTarget} />
              
              <div className="bg-[#1a1a2e] p-6 rounded-3xl text-center">
                <div className="text-5xl font-mono font-bold text-orange-400">
                  {timeLeft}
                </div>
                <p className="text-sm text-gray-400">Seconds Left</p>
              </div>
            </div>

            {/* Center: Camera */}
            <div className="lg:col-span-4">
              <PlayerCamera 
                detector={detector} 
                onPoseDetected={handlePoseDetected} 
              />
              <SimilarityMeter similarity={similarity} />
            </div>

            {/* Right: Leaderboard */}
            <div className="lg:col-span-3">
              <Leaderboard players={players} myUserId={myUserId} />
            </div>
          </div>
        )}

        {roundWinner && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="text-center bg-[#1a1a2e] p-12 rounded-3xl">
              <div className="text-8xl mb-6">🎉</div>
              <h2 className="text-5xl font-bold text-green-400 mb-4">
                {roundWinner === myUserId ? "YOU WON THE ROUND!" : `${roundWinner} WON!`}
              </h2>
              <button
                onClick={startNewRound}
                className="mt-8 bg-[#00ffcc] text-black px-12 py-5 rounded-2xl text-xl font-bold"
              >
                Next Round
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
