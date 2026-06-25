'use client';

interface LeaderboardProps {
  players: any[];
  myUserId: string;
}

export default function Leaderboard5({ players, myUserId }: LeaderboardProps) {
  const sortedPlayers = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));

  return (
    <div className="bg-[#1a1a2e] p-6 rounded-3xl">
      <h3 className="text-2xl font-bold mb-6">🏆 Leaderboard</h3>
      <div className="space-y-3">
        {sortedPlayers.map((player, index) => (
          <div
            key={player.userId}
            className={`flex items-center justify-between px-5 py-4 rounded-2xl transition-all ${
              player.userId === myUserId ? 'bg-[#00ffcc]/10 border border-[#00ffcc]' : 'bg-[#0f0f1a]'
            }`}
          >
            <div className="flex items-center gap-4">
              <span className="text-2xl">{index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅'}</span>
              <span className="font-medium">
                {player.userId === myUserId ? '👑 You' : player.userId}
              </span>
            </div>
            <span className="text-2xl font-bold text-[#00ffcc]">{player.score || 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
