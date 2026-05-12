'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

const PROGRAM_ID = '2HK29Di58nED836JN14U1bPsxW4q52FLW5knoJEDmYQJ';

export interface Competition {
  pubkey: string;
  description: string;
  creator: string;
  entryFee: number;
  maxParticipants: number;
  currentParticipants: number;
  totalPrize: number;
  finishTime: number;
  status: 'active' | 'ended' | 'cancelled';
  winner: string;
  gameId: number;
}

type Filter = 'all' | 'active' | 'ended';
type Sort = 'prize' | 'players' | 'ending';

interface CompetitionsProps {
  title?: string;
  subtitle?: string;
  showWalletButton?: boolean;
}

function ClientWalletButton() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return <WalletMultiButton />;
}

export default function Competitions({
  title = 'MotionPlay',
  subtitle = 'Live Competitions',
  showWalletButton = true,
}: CompetitionsProps) {
  const wallet = useWallet();

  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('prize');
  const [search, setSearch] = useState('');

  const [joiningPda, setJoiningPda] = useState('');
  const [joinStatus, setJoinStatus] = useState<Record<string, string>>({});

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const { Connection, clusterApiUrl } = await import('@solana/web3.js');

      const { AnchorProvider, Program } = await import('@coral-xyz/anchor');

      const { IDL } = await import('@/idl1');

      const connection = new Connection(
        clusterApiUrl('devnet'),
        'confirmed'
      );

      const provider = new AnchorProvider(
        connection,
        (wallet as any) ?? {
          publicKey: null,
          signTransaction: async (t: any) => t,
          signAllTransactions: async (t: any) => t,
        },
        { commitment: 'confirmed' }
      );

      const program = new Program(IDL as any, provider) as any;

      const all = await program.account.competition.all();

      const mapped: Competition[] = all.map(
        ({ publicKey, account: a }: any) => ({
          pubkey: publicKey.toBase58(),
          description: a.description,
          creator: a.creator.toBase58(),
          entryFee: a.entryFee.toNumber() / 1e9,
          maxParticipants: a.maxParticipants,
          currentParticipants: a.currentParticipants,
          totalPrize: a.totalPrize.toNumber() / 1e9,
          finishTime: a.finishTime.toNumber(),
          status: a.status.ended
            ? 'ended'
            : a.status.cancelled
            ? 'cancelled'
            : 'active',
          winner: a.winner?.toBase58?.() ?? '',
          gameId: a.gameId?.toNumber?.() ?? 0,
        })
      );

      setCompetitions(mapped);
    } catch (e: any) {
      setError('Failed to load competitions: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleJoin = async (comp: Competition) => {
    if (!wallet.publicKey) {
      alert('Connect wallet first.');
      return;
    }

    // join logic...
  };

  return (
    <main style={{ padding: 24 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 24,
        }}
      >
        <div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>

        {showWalletButton && <ClientWalletButton />}
      </div>

      {/* Your competition UI here */}
    </main>
  );
}