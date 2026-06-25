'use client';

interface GameLobbyProps {
  players: any[];
  myUserId: string;
  onStartGame: () => void;
}

export default function GameLobby({ players, myUserId, onStartGame }: GameLobbyProps) {
  return (
    <div className="max-w-md mx-auto bg-[#1a1a2e] rounded-3xl p-10 text-center">
      <h2 className="text-4xl font-bold mb-8">Pose Match Lobby</h2>
      
      <div className="mb-8">
        <p className="text-xl mb-4">Players Ready</p>
        <div className="space-y-3">
          {players.map((p) => (
            <div key={p.userId} className="bg-[#0f0f1a] px-6 py-4 rounded-2xl text-left">
              {p.userId === myUserId ? '👑 You' : p.userId}
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={onStartGame}
        disabled={players.length < 2}
        className="w-full bg-[#00ffcc] hover:bg-white text-black font-bold text-2xl py-6 rounded-2xl disabled:opacity-50 transition"
      >
        Start Game ({players.length} players)
      </button>
    </div>
  );
}
