'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

const PROGRAM_ID = '2HK29Di58nED836JN14U1bPsxW4q52FLW5knoJEDmYQJ';
const SOL = 1_000_000_000;

export interface CompetitionsHubProps {
  /** Called when the user clicks "View Leaderboard" on a competition card */
  onViewLeaderboard?: (compAddress: string) => void;
  /** Poll interval ms — default 30 000 (30 s). Pass 0 to disable. */
  pollIntervalMs?: number;
  className?: string;
}

interface CompSummary {
  address:             string;
  creator:             string;
  status:              'Active' | 'Ended' | 'Cancelled' | string;
  startTime:           number;
  finishTime:          number;
  entryFee:            number;   // lamports
  totalPrize:          number;   // lamports
  winner:              string;
  maxParticipants:     number;
  currentParticipants: number;
  // Derived leader
  leaderPlayer:        string | null;
  leaderScore:         number | null;
}

type HubState = 'loading' | 'loaded' | 'error';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const ZERO_PUBKEY = '11111111111111111111111111111111';

function shortAddr(addr: string) {
  if (!addr || addr.length < 8) return addr;
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

function lamportsToSol(l: number) {
  return (l / SOL).toFixed(3);
}

function timeRemaining(finishTime: number): string {
  const diff = finishTime - Date.now() / 1000;
  if (diff <= 0) return 'Ended';
  const d = Math.floor(diff / 86400);
  const h = Math.floor((diff % 86400) / 3600);
  const m = Math.floor((diff % 3600) / 60);
  if (d > 0) return `${d}d ${h}h left`;
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
}

function statusDot(status: string) {
  if (status === 'Active')    return '#14F195';
  if (status === 'Ended')     return '#6b7280';
  if (status === 'Cancelled') return '#ef4444';
  return '#9ca3af';
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function CompetitionsHub({
  onViewLeaderboard,
  pollIntervalMs = 30_000,
  className,
}: CompetitionsHubProps) {
  const wallet = useWallet();

  const [hubState, setHubState]   = useState<HubState>('loading');
  const [comps, setComps]         = useState<CompSummary[]>([]);
  const [fetchErr, setFetchErr]   = useState('');
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [filter, setFilter]       = useState<'All' | 'Active' | 'Ended'>('All');
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  // ── Fetch all competitions ────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    setHubState('loading');
    try {
      const { Connection, PublicKey, clusterApiUrl } = await import('@solana/web3.js');
      const { AnchorProvider, Program }              = await import('@coral-xyz/anchor');
      const { IDL }                                   = await import('@/idl1');

      const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
      const provider = new AnchorProvider(
        connection,
        wallet.publicKey
          ? (wallet as any)
          : {
              publicKey: PublicKey.default,
              signTransaction: async (tx: any) => tx,
              signAllTransactions: async (txs: any) => txs,
            } as any,
        { commitment: 'confirmed' }
      );
      const program = new Program(IDL as any, provider) as any;

      // Fetch all competitions
      const allComps = await program.account.competition.all();

      // For each comp, fetch the top player entry
      const summaries: CompSummary[] = await Promise.all(
        allComps.map(async (c: any) => {
          const compPda   = c.publicKey;
          const comp      = c.account;
          const statusKey = Object.keys(comp.status)[0];

          let leaderPlayer: string | null = null;
          let leaderScore:  number | null = null;

          try {
            const entries = await program.account.playerEntry.all([
              {
                memcmp: {
                  offset: 8 + 32,
                  bytes: compPda.toBase58(),
                },
              },
            ]);
            if (entries.length > 0) {
              const top = entries
                .map((e: any) => ({
                  player:    e.account.player.toBase58(),
                  bestScore: e.account.bestScore.toNumber(),
                }))
                .sort((a: any, b: any) => b.bestScore - a.bestScore)[0];
              leaderPlayer = top.player;
              leaderScore  = top.bestScore;
            }
          } catch (_) {
            // silently ignore per-entry errors
          }

          return {
            address:             compPda.toBase58(),
            creator:             comp.creator.toBase58(),
            status:              statusKey.charAt(0).toUpperCase() + statusKey.slice(1),
            startTime:           comp.startTime.toNumber(),
            finishTime:          comp.finishTime.toNumber(),
            entryFee:            comp.entryFee.toNumber(),
            totalPrize:          comp.totalPrize.toNumber(),
            winner:              comp.winner.toBase58(),
            maxParticipants:     comp.maxParticipants,
            currentParticipants: comp.currentParticipants,
            leaderPlayer,
            leaderScore,
          } satisfies CompSummary;
        })
      );

      // Sort: Active first, then by prize pool desc
      summaries.sort((a, b) => {
        if (a.status === 'Active' && b.status !== 'Active') return -1;
        if (b.status === 'Active' && a.status !== 'Active') return  1;
        return b.totalPrize - a.totalPrize;
      });

      setComps(summaries);
      setHubState('loaded');
      setLastRefreshed(new Date());
      setFetchErr('');
    } catch (err: any) {
      setFetchErr(err.message ?? 'Unknown error');
      setHubState('error');
    }
  }, [wallet]);

  useEffect(() => {
    fetchAll();
    if (!pollIntervalMs) return;
    const id = setInterval(fetchAll, pollIntervalMs);
    return () => clearInterval(id);
  }, [fetchAll, pollIntervalMs]);

  // ── Derived ────────────────────────────────────────────────────────────────

  const filtered = filter === 'All' ? comps : comps.filter(c => c.status === filter);
  const activeCount = comps.filter(c => c.status === 'Active').length;
  const totalPrize  = comps.reduce((sum, c) => sum + c.totalPrize, 0);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={hub.root} className={className}>
      {/* ── Page Header ────────────────────────────────────────────────── */}
      <div style={hub.pageHeader}>
        <div style={hub.logoRow}>
          <span style={hub.logoMark}>◈</span>
          <div>
            <h1 style={hub.pageTitle}>Competitions</h1>
            <p style={hub.pageSubtitle}>On-chain gaming · Devnet</p>
          </div>
        </div>

        <div style={hub.headerRight}>
          {hubState === 'loaded' && (
            <div style={hub.statsRow}>
              <div style={hub.statChip}>
                <span style={{ ...hub.statDot, background: '#14F195' }} />
                {activeCount} live
              </div>
              <div style={hub.statChip}>
                💰 {lamportsToSol(totalPrize)} SOL
              </div>
            </div>
          )}
          <button
            style={hub.refreshBtn}
            onClick={fetchAll}
            title="Refresh"
            disabled={hubState === 'loading'}
          >
            <span style={hubState === 'loading' ? hub.spinnerPurple : undefined}>
              {hubState === 'loading' ? '◌' : '↻'}
            </span>
          </button>
        </div>
      </div>

      {lastRefreshed && (
        <p style={hub.timestamp}>
          Last updated {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </p>
      )}

      {/* ── Filter Tabs ─────────────────────────────────────────────────── */}
      {hubState === 'loaded' && (
        <div style={hub.tabs}>
          {(['All', 'Active', 'Ended'] as const).map(f => (
            <button
              key={f}
              style={{ ...hub.tab, ...(filter === f ? hub.tabActive : {}) }}
              onClick={() => setFilter(f)}
            >
              {f}
              <span style={{ ...hub.tabCount, ...(filter === f ? hub.tabCountActive : {}) }}>
                {f === 'All' ? comps.length : comps.filter(c => c.status === f).length}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ── Error ────────────────────────────────────────────────────────── */}
      {hubState === 'error' && (
        <div style={hub.errBox}>
          <div style={hub.errIcon}>⚠</div>
          <div>
            <strong style={{ fontSize: 14 }}>Failed to load competitions</strong>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#fca5a5' }}>{fetchErr}</p>
          </div>
          <button style={hub.retryBtn} onClick={fetchAll}>Retry</button>
        </div>
      )}

      {/* ── Loading skeletons ────────────────────────────────────────────── */}
      {hubState === 'loading' && (
        <div style={hub.grid}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} style={{ ...hub.skeleton, animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>
      )}

      {/* ── Cards grid ──────────────────────────────────────────────────── */}
      {hubState === 'loaded' && (
        <>
          {filtered.length === 0 ? (
            <div style={hub.empty}>
              <span style={{ fontSize: 36 }}>🎮</span>
              <p style={{ margin: '12px 0 0', color: '#6b7280', fontSize: 14 }}>
                No {filter !== 'All' ? filter.toLowerCase() + ' ' : ''}competitions found.
              </p>
            </div>
          ) : (
            <div style={hub.grid}>
              {filtered.map(comp => {
                const isHovered   = hoveredCard === comp.address;
                const hasWinner   = comp.winner !== ZERO_PUBKEY && comp.winner.length > 10;
                const isActive    = comp.status === 'Active';
                const isMine      = wallet.publicKey?.toBase58() === comp.creator;

                return (
                  <div
                    key={comp.address}
                    style={{
                      ...hub.card,
                      ...(isActive ? hub.cardActive : hub.cardInactive),
                      ...(isHovered ? hub.cardHover : {}),
                    }}
                    onMouseEnter={() => setHoveredCard(comp.address)}
                    onMouseLeave={() => setHoveredCard(null)}
                  >
                    {/* Card top bar */}
                    <div style={hub.cardTop}>
                      <div style={hub.statusRow}>
                        <span style={{ ...hub.statusDot, background: statusDot(comp.status) }} />
                        <span style={hub.statusLabel}>{comp.status}</span>
                        {isMine && <span style={hub.myTag}>yours</span>}
                      </div>
                      {isActive && (
                        <span style={hub.timer}>{timeRemaining(comp.finishTime)}</span>
                      )}
                    </div>

                    {/* Prize pool */}
                    <div style={hub.prizeRow}>
                      <span style={hub.prizeAmount}>
                        {lamportsToSol(comp.totalPrize)}
                        <span style={hub.prizeSol}> SOL</span>
                      </span>
                      <span style={hub.prizeLabel}>prize pool</span>
                    </div>

                    {/* Address */}
                    <p style={hub.compAddr}>{shortAddr(comp.address)}</p>

                    {/* Divider */}
                    <div style={hub.divider} />

                    {/* Leader section */}
                    <div style={hub.leaderSection}>
                      <p style={hub.leaderHeading}>
                        {hasWinner ? '👑 Winner' : '🏆 Current Leader'}
                      </p>
                      {comp.leaderPlayer ? (
                        <div style={hub.leaderRow}>
                          <div style={hub.leaderAvatar}>
                            {comp.leaderPlayer.slice(0, 2)}
                          </div>
                          <div style={hub.leaderInfo}>
                            <span style={hub.leaderAddr}>
                              {shortAddr(hasWinner ? comp.winner : comp.leaderPlayer)}
                            </span>
                            {comp.leaderScore !== null && (
                              <span style={hub.leaderScore}>
                                {comp.leaderScore.toLocaleString()} pts
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p style={hub.noLeader}>No players yet</p>
                      )}
                    </div>

                    {/* Meta row */}
                    <div style={hub.metaRow}>
                      <span style={hub.metaPill}>
                        👤 {comp.currentParticipants}/{comp.maxParticipants}
                      </span>
                      <span style={hub.metaPill}>
                        🎟 {comp.entryFee > 0 ? `${lamportsToSol(comp.entryFee)} SOL` : 'Free'}
                      </span>
                    </div>

                    {/* CTA */}
                    <button
                      style={{
                        ...hub.ctaBtn,
                        ...(isActive ? hub.ctaBtnActive : hub.ctaBtnInactive),
                        ...(isHovered ? hub.ctaBtnHover : {}),
                      }}
                      onClick={() => onViewLeaderboard?.(comp.address)}
                    >
                      View Leaderboard
                      <span style={hub.ctaArrow}>→</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <div style={hub.footer}>
        <span style={hub.footerText}>Program: {shortAddr(PROGRAM_ID)}</span>
        <span style={hub.footerDot}>·</span>
        <span style={hub.footerText}>Solana Devnet</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles — dark, editorial, Solana-native
// ─────────────────────────────────────────────────────────────────────────────

const hub: Record<string, React.CSSProperties> = {
  root: {
    fontFamily: '"IBM Plex Mono", "Fira Code", "Courier New", monospace',
    background: '#0a0a0f',
    minHeight: '100vh',
    padding: '32px 24px',
    color: '#e2e8f0',
  },

  // ── Header ──
  pageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap' as const,
    gap: 12,
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
  },
  logoMark: {
    fontSize: 32,
    color: '#9945FF',
    lineHeight: 1,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 700,
    color: '#f8fafc',
    margin: 0,
    letterSpacing: '-0.02em',
  },
  pageSubtitle: {
    fontSize: 11,
    color: '#4b5563',
    margin: '2px 0 0',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  statsRow: {
    display: 'flex',
    gap: 8,
  },
  statChip: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12,
    fontWeight: 600,
    background: '#111827',
    border: '1px solid #1f2937',
    padding: '5px 10px',
    borderRadius: 100,
    color: '#9ca3af',
  },
  statDot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    display: 'inline-block',
    flexShrink: 0,
  },
  refreshBtn: {
    background: '#111827',
    border: '1px solid #1f2937',
    borderRadius: 8,
    padding: '8px 12px',
    cursor: 'pointer',
    fontSize: 16,
    color: '#6b7280',
    display: 'flex',
    alignItems: 'center',
    transition: 'color 0.15s',
  },
  spinnerPurple: {
    display: 'inline-block',
    animation: 'spin 1s linear infinite',
    color: '#9945FF',
  },
  timestamp: {
    fontSize: 10,
    color: '#374151',
    margin: '4px 0 20px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
  },

  // ── Tabs ──
  tabs: {
    display: 'flex',
    gap: 4,
    marginBottom: 24,
    borderBottom: '1px solid #1f2937',
    paddingBottom: 0,
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    padding: '8px 14px 10px',
    fontSize: 12,
    fontWeight: 600,
    color: '#4b5563',
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    transition: 'color 0.15s',
    marginBottom: -1,
  },
  tabActive: {
    color: '#9945FF',
    borderBottomColor: '#9945FF',
  },
  tabCount: {
    fontSize: 10,
    background: '#1f2937',
    color: '#6b7280',
    padding: '1px 6px',
    borderRadius: 100,
    fontWeight: 700,
  },
  tabCountActive: {
    background: '#3b0764',
    color: '#c084fc',
  },

  // ── Error ──
  errBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 14,
    padding: '16px 18px',
    background: '#1a0a0a',
    border: '1px solid #7f1d1d',
    borderRadius: 12,
    marginBottom: 24,
    color: '#fca5a5',
  },
  errIcon: {
    fontSize: 20,
    flexShrink: 0,
    marginTop: 2,
  },
  retryBtn: {
    marginLeft: 'auto',
    padding: '6px 14px',
    fontSize: 12,
    background: '#7f1d1d',
    border: '1px solid #991b1b',
    borderRadius: 6,
    cursor: 'pointer',
    color: '#fca5a5',
    whiteSpace: 'nowrap' as const,
    flexShrink: 0,
  },

  // ── Grid ──
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 16,
    marginBottom: 32,
  },

  // ── Skeleton ──
  skeleton: {
    height: 320,
    borderRadius: 16,
    background: 'linear-gradient(90deg, #111827 0%, #1f2937 50%, #111827 100%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.6s ease infinite',
  },

  // ── Empty ──
  empty: {
    textAlign: 'center' as const,
    padding: '60px 24px',
    color: '#4b5563',
    marginBottom: 32,
  },

  // ── Cards ──
  card: {
    borderRadius: 16,
    padding: '20px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 0,
    transition: 'transform 0.2s, box-shadow 0.2s',
    cursor: 'default',
    position: 'relative' as const,
    overflow: 'hidden',
  },
  cardActive: {
    background: 'linear-gradient(145deg, #0f0f1a 0%, #12101f 100%)',
    border: '1px solid #2d1b69',
    boxShadow: '0 0 0 1px #3b0764 inset',
  },
  cardInactive: {
    background: '#0d0d14',
    border: '1px solid #1a1a2e',
  },
  cardHover: {
    transform: 'translateY(-3px)',
    boxShadow: '0 12px 32px rgba(153, 69, 255, 0.15)',
  },

  cardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  statusRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    flexShrink: 0,
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.12em',
    color: '#6b7280',
  },
  myTag: {
    fontSize: 9,
    fontWeight: 700,
    background: '#1e1b4b',
    color: '#a5b4fc',
    padding: '1px 6px',
    borderRadius: 100,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
  },
  timer: {
    fontSize: 10,
    fontWeight: 700,
    color: '#14F195',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
  },

  prizeRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 2,
  },
  prizeAmount: {
    fontSize: 32,
    fontWeight: 700,
    color: '#f8fafc',
    lineHeight: 1,
    letterSpacing: '-0.03em',
  },
  prizeSol: {
    fontSize: 14,
    fontWeight: 400,
    color: '#6b7280',
    letterSpacing: 0,
  },
  prizeLabel: {
    fontSize: 10,
    color: '#374151',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
    alignSelf: 'flex-end',
    paddingBottom: 4,
  },
  compAddr: {
    fontSize: 11,
    color: '#374151',
    margin: '2px 0 14px',
    fontFamily: 'inherit',
  },

  divider: {
    height: 1,
    background: '#1f2937',
    marginBottom: 14,
  },

  leaderSection: {
    marginBottom: 14,
  },
  leaderHeading: {
    fontSize: 10,
    fontWeight: 700,
    color: '#4b5563',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
    margin: '0 0 8px',
  },
  leaderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  leaderAvatar: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: 'linear-gradient(135deg, #3b0764, #0c4a6e)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 10,
    fontWeight: 700,
    color: '#c084fc',
    textTransform: 'uppercase' as const,
    flexShrink: 0,
  },
  leaderInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap' as const,
  },
  leaderAddr: {
    fontSize: 13,
    fontWeight: 600,
    color: '#d1d5db',
    fontFamily: 'inherit',
  },
  leaderScore: {
    fontSize: 11,
    fontWeight: 700,
    color: '#9945FF',
    background: '#1a0a2e',
    padding: '2px 8px',
    borderRadius: 100,
  },
  noLeader: {
    fontSize: 12,
    color: '#374151',
    margin: 0,
    fontStyle: 'italic',
  },

  metaRow: {
    display: 'flex',
    gap: 6,
    marginBottom: 16,
    flexWrap: 'wrap' as const,
  },
  metaPill: {
    fontSize: 11,
    color: '#4b5563',
    background: '#111827',
    border: '1px solid #1f2937',
    padding: '3px 9px',
    borderRadius: 100,
  },

  ctaBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '11px 0',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
    transition: 'all 0.15s',
    marginTop: 'auto',
  },
  ctaBtnActive: {
    background: 'linear-gradient(135deg, #9945FF, #14F195)',
    color: '#fff',
  },
  ctaBtnInactive: {
    background: '#111827',
    color: '#4b5563',
    border: '1px solid #1f2937',
  },
  ctaBtnHover: {
    opacity: 0.9,
    transform: 'scale(1.01)',
  },
  ctaArrow: {
    transition: 'transform 0.15s',
  },

  // ── Footer ──
  footer: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
    paddingTop: 16,
    borderTop: '1px solid #111827',
  },
  footerText: {
    fontSize: 10,
    color: '#1f2937',
    fontFamily: 'inherit',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
  },
  footerDot: {
    color: '#1f2937',
    fontSize: 10,
  },
};
