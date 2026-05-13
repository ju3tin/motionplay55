'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import Link from 'next/link';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { IDL } from '@/idl1';

const PROGRAM_ID = '2HK29Di58nED836JN14U1bPsxW4q52FLW5knoJEDmYQJ';

interface Competition {
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

  topScorer?: string;
  topScore?: number;
}

function ClientWalletButton() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <WalletMultiButton />;
}

export default function CompetitionsPage() {
  const wallet = useWallet();

  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

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

      const mapped: Competition[] = await Promise.all(
        all.map(async ({ publicKey, account: a }: any) => {
          let topScorer = '';
          let topScore = 0;

          try {
            const entries = await program.account.playerEntry.all([
              {
                memcmp: {
                  offset: 8,
                  bytes: publicKey.toBase58(),
                },
              },
            ]);

            for (const e of entries) {
              const score = e.account.score?.toNumber?.() ?? 0;

              if (score > topScore) {
                topScore = score;
                topScorer = e.account.player.toBase58();
              }
            }
          } catch (err) {
            console.log('leaderboard error', err);
          }

          return {
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

            topScorer,
            topScore,
          };
        })
      );

      setCompetitions(mapped);
    } catch (e: any) {
      console.error(e);
      setError('Failed to load competitions: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const timeLeft = (ts: number) => {
    const now = Date.now() / 1000;
    const diff = ts - now;

    if (diff <= 0) return 'Ended';

    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);

    if (h > 48) return `${Math.floor(h / 24)}d left`;
    if (h > 0) return `${h}h ${m}m left`;
    return `${m}m left`;
  };

  return (
    <main style={s.main}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>MotionPlay</h1>
          <p style={s.subtitle}>Live Competitions</p>
        </div>
        <ClientWalletButton />
      </div>

      {error && <div style={s.error}>{error}</div>}

      {loading && <div>Loading...</div>}

      <div style={s.grid}>
        {competitions.map((comp) => {
          const fillPct = Math.round(
            (comp.currentParticipants / comp.maxParticipants) * 100
          );

          return (
            <div key={comp.pubkey} style={s.card}>
              <h3 style={s.titleCard}>{comp.description}</h3>

              <div style={s.prize}>
                🏆 {comp.totalPrize.toFixed(3)} SOL
              </div>

              <div style={s.row}>
                <span>
                  {comp.currentParticipants}/{comp.maxParticipants}
                </span>
                <span>{timeLeft(comp.finishTime)}</span>
              </div>

              {/* TOP SCORER */}
              <div style={s.leaderboard}>
                <div style={s.lbTitle}>Top Scorer</div>

                {comp.topScorer ? (
                  <>
                    <div style={s.score}>
                      {comp.topScore} pts
                    </div>
                    <div style={s.wallet}>
                      {comp.topScorer.slice(0, 6)}...
                      {comp.topScorer.slice(-4)}
                    </div>
                  </>
                ) : (
                  <div style={s.none}>No scores yet</div>
                )}
              </div>

              <div style={s.bar}>
                <div
                  style={{
                    ...s.fill,
                    width: `${fillPct}%`,
                  }}
                />
              </div>

              <p style={s.pubkey}>
                {comp.pubkey.slice(0, 8)}...
                {comp.pubkey.slice(-6)}
              </p>
            </div>
          );
        })}
      </div>
    </main>
  );
}

/* ---------------- STYLES ---------------- */

const s: Record<string, React.CSSProperties> = {
  main: { maxWidth: 1200, margin: '0 auto', padding: 24 },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  title: { margin: 0 },
  subtitle: { color: '#6b7280' },

  error: {
    background: '#fee2e2',
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
  },

  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: 16,
  },

  card: {
    border: '1px solid #e5e7eb',
    padding: 16,
    borderRadius: 12,
  },

  titleCard: { margin: '0 0 10px' },

  prize: {
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 10,
  },

  row: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  leaderboard: {
    background: '#f9fafb',
    padding: 10,
    borderRadius: 10,
    textAlign: 'center',
    marginBottom: 10,
  },

  lbTitle: { fontSize: 12, color: '#6b7280' },
  score: { fontSize: 20, fontWeight: 700 },
  wallet: { fontSize: 12, color: '#7c3aed' },
  none: { fontSize: 12, color: '#9ca3af' },

  bar: {
    height: 6,
    background: '#eee',
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 10,
  },

  fill: {
    height: '100%',
    background: '#9945FF',
  },

  pubkey: {
    fontSize: 11,
    color: '#9ca3af',
  },
};
