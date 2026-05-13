"use client"
import CompetitionsHub from '@/components/CompetitionsHub';
import Leaderboard from '@/components/Leaderboard1';
import { useEffect, useState } from "react"

export default function Page() {
  const [selectedComp, setSelectedComp] = useState<string | null>(null);

  if (selectedComp) {
    return (
      <div>
        <button onClick={() => setSelectedComp(null)}>← Back to all competitions</button>
         <Leaderboard
        compAddress={selectedComp}
        playerPubkey={wallet.publicKey?.toBase58()}
        pollIntervalMs={20_000}
      />
      </div>
    );
  }

  return (
    <CompetitionsHub onViewLeaderboard={(addr) => setSelectedComp(addr)} />
  );
}
