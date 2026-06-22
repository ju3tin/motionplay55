"use client";

export function PlayerList({ players }: { players: any }) {
  if (!players) return null;

  return (
    <div>
      <h3>Players</h3>

      {Object.entries(players).map(([id, p]: any) => (
        <div key={id}>
          👤 {id} — {p.pose} —{" "}
          {p.isCorrect ? "✅ correct" : "❌ wrong"}
        </div>
      ))}
    </div>
  );
}
