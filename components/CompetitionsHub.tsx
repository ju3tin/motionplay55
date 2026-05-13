'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import Link from 'next/link';

const PROGRAM_ID = '2HK29Di58nED836JN14U1bPsxW4q52FLW5knoJEDmYQJ';

const RPCS = [
  'https://api.devnet.solana.com',
  `https://devnet.helius-rpc.com/?api-key=${process.env.NEXT_PUBLIC_HELIUS_API_KEY}`,
];

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

  // leaderboard
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

  const getConnection = async () => {
    const { Connection } = await import('@solana/web3.js');

    for (const rpc of RPCS) {
      try {
        const conn = new Connection(rpc, 'confirmed');

        await conn.getSlot();

        console.log('using rpc:', rpc);

        return conn;
      } catch (err) {
        console.log('rpc failed', rpc);
      }
    }

    throw new Error('All RPCs failed');
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const { PublicKey } = await import('@solana/web3.js');

      const { AnchorProvider, Program } = await import(
        '@coral-xyz/anchor'
      );

      const { IDL } = await import('@/idl1');

      const connection = await getConnection();

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
            // IMPORTANT:
            // assumes competition pubkey is first field
            // after discriminator in PlayerEntry
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
            console.log('leaderboard fetch failed', err);
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

  const now = Date.now() / 1000;

  const timeLeft = (ts: number) => {
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

      {loading && <div>Loading competitions...</div>}

      <div style={s.grid}>
        {competitions.map((comp) => {
          const fillPct = Math.round(
            (comp.currentParticipants / comp.maxParticipants) * 100
          );

          return (
            <div key={comp.pubkey} style={s.card}>
              <div style={s.top}>
                <span
                  style={{
                    ...s.status,
                    background:
                      comp.status === 'active' ? '#dcfce7' : '#f3f4f6',
                    color:
                      comp.status === 'active' ? '#15803d' : '#6b7280',
                  }}
                >
                  {comp.status}
                </span>
              </div>

              <h2 style={s.cardTitle}>{comp.description}</h2>

              <div style={s.prize}>
                🏆 {comp.totalPrize.toFixed(3)} SOL
              </div>

              <div style={s.stats}>
                <div>
                  <div style={s.label}>Players</div>
                  <div style={s.value}>
                    {comp.currentParticipants}/{comp.maxParticipants}
                  </div>
                </div>

                <div>
                  <div style={s.label}>Entry</div>
                  <div style={s.value}>
                    {comp.entryFee} SOL
                  </div>
                </div>

                <div>
                  <div style={s.label}>Ends</div>
                  <div style={s.value}>
                    {timeLeft(comp.finishTime)}
                  </div>
                </div>
              </div>

              {/* leaderboard */}

              <div style={s.leaderboard}>
                <div style={s.leaderTitle}>
                  🥇 Top Scorer
                </div>

                {comp.topScorer ? (
                  <>
                    <div style={s.topScore}>
                      {comp.topScore} pts
                    </div>

                    <div style={s.topWallet}>
                      {comp.topScorer.slice(0, 6)}...
                      {comp.topScorer.slice(-4)}
                    </div>
                  </>
                ) : (
                  <div style={s.noScore}>
                    No scores yet
                  </div>
                )}
              </div>

              <div
                style={{
                  marginBottom: 16,
                  textAlign: 'center',
                }}
              >
                <Link
                  href={`/leaderboard1?comp=${comp.pubkey}`}
                  style={{
                    color: '#9945FF',
                    textDecoration: 'none',
                    fontWeight: 600,
                  }}
                >
                  View Leaderboard
                </Link>
              </div>

              <div style={s.barTrack}>
                <div
                  style={{
                    ...s.barFill,
                    width: `${fillPct}%`,
                  }}
                />
              </div>

              {comp.winner &&
                comp.winner !==
                  '11111111111111111111111111111111' && (
                  <div style={s.winner}>
                    Winner:
                    {' '}
                    {comp.winner.slice(0, 6)}...
                    {comp.winner.slice(-4)}
                  </div>
                )}

              <div style={s.pubkey}>
                {comp.pubkey.slice(0, 8)}...
                {comp.pubkey.slice(-6)}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}

const s: Record<string, React.CSSProperties> = {
  main: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: 24,
    fontFamily: 'Arial',
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 32,
  },

  title: {
    margin: 0,
    fontSize: 32,
  },

  subtitle: {
    color: '#6b7280',
  },

  error: {
    background: '#fef2f2',
    color: '#dc2626',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },

  grid: {
    display: 'grid',
    gridTemplateColumns:
      'repeat(auto-fill, minmax(320px, 1fr))',
    gap: 20,
  },

  card: {
    border: '1px solid #e5e7eb',
    borderRadius: 16,
    padding: 20,
    background: '#fff',
  },

  top: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  status: {
    padding: '4px 10px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
  },

  cardTitle: {
    marginTop: 0,
    marginBottom: 14,
    fontSize: 18,
  },

  prize: {
    background: '#faf5ff',
    color: '#9945FF',
    padding: 14,
    borderRadius: 12,
    fontWeight: 700,
    fontSize: 22,
    marginBottom: 16,
  },

  stats: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 20,
  },

  label: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 4,
  },

  value: {
    fontWeight: 700,
  },

  leaderboard: {
    background: '#f9fafb',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    textAlign: 'center',
  },

  leaderTitle: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 8,
  },

  topScore: {
    fontSize: 26,
    fontWeight: 700,
    color: '#111827',
  },

  topWallet: {
    fontSize: 13,
    fontFamily: 'monospace',
    color: '#9945FF',
    marginTop: 4,
  },

  noScore: {
    color: '#9ca3af',
    fontSize: 13,
  },

  barTrack: {
    height: 8,
    background: '#f3f4f6',
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 14,
  },

  barFill: {
    height: '100%',
    background: '#9945FF',
  },

  winner: {
    background: '#fefce8',
    padding: 10,
    borderRadius: 10,
    fontSize: 13,
    marginBottom: 12,
  },

  pubkey: {
    fontSize: 11,
    color: '#9ca3af',
    fontFamily: 'monospace',
  },
};
