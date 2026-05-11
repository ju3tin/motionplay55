// app/(new)/leaderboard1/LeaderboardPage.tsx  (client component)
'use client';
import { useSearchParams } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import Leaderboard from '@/components/Leaderboard';

export default function LeaderboardPage() {
  const params      = useSearchParams();
  const wallet      = useWallet();
  const compAddress = params.get('comp') ?? '';

  return (
    <main style={{ maxWidth: 680, margin: '40px auto', padding: '0 24px' }}>
      <Leaderboard
        compAddress={compAddress}
        playerPubkey={wallet.publicKey?.toBase58()}
        pollIntervalMs={20_000}
      />
    </main>
  );
}