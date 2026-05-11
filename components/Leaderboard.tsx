'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

const PROGRAM_ID = '2HK29Di58nED836JN14U1bPsxW4q52FLW5knoJEDmYQJ';

export interface LeaderboardProps {
  compAddress: string;        // competition PDA (base58)
  /** If provided, this pubkey row is highlighted as "you" */
  playerPubkey?: string;
  /** Poll interval ms — default 15 000 (15 s). Pass 0 to disable. */
  pollIntervalMs?: number;
  className?: string;
}

interface LeaderEntry {
  rank:        number;
  player:      string;          // base58
  bestScore:   number;
  scoreCount:  number;
  amountPaid:  number;          // lamports
}

interface CompetitionMeta {
  creator:    string;
  status:     string;           // 'Active' | 'Ended' | 'Cancelled'
  startTime:  number;
  finishTime: number;
  entryFee:   number;           // lamports
  totalPrize: number;           // lamports
  winner:     string;           // pubkey base58 — zero address if none
  maxParticipants: number;
  currentParticipants: number;
}

type LeaderState = 'loading' | 'loaded' | 'error';
type FinalizeState = 'idle' | 'confirming' | 'submitting' | 'success' | 'error';
type ClaimState   = 'idle' | 'submitting' | 'success' | 'error';

const ZERO_PUBKEY = '11111111111111111111111111111111';
const SOL = 1_000_000_000;

function shortAddr(addr: string) {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

function lamportsToSol(l: number) {
  return (l / SOL).toFixed(4);
}

function medalEmoji(rank: number) {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function Leaderboard({
  compAddress,
  playerPubkey,
  pollIntervalMs = 15_000,
  className,
}: LeaderboardProps) {
  const wallet = useWallet();

  const [state,   setState]   = useState<LeaderState>('loading');
  const [entries, setEntries] = useState<LeaderEntry[]>([]);
  const [meta,    setMeta]    = useState<CompetitionMeta | null>(null);
  const [fetchErr, setFetchErr] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const [finalizeState, setFinalizeState] = useState<FinalizeState>('idle');
  const [finalizeWinner, setFinalizeWinner] = useState('');   // for manual override
  const [finalizeErr, setFinalizeErr] = useState('');
  const [finalizeTx, setFinalizeTx]   = useState('');

  const [claimState, setClaimState] = useState<ClaimState>('idle');
  const [claimTx, setClaimTx]       = useState('');
  const [claimErr, setClaimErr]     = useState('');

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchLeaderboard = useCallback(async () => {
    if (!compAddress.trim()) return;
    try {
      const { Connection, PublicKey, clusterApiUrl } = await import('@solana/web3.js');
      const { AnchorProvider, Program }              = await import('@coral-xyz/anchor');
      const { IDL }                                   = await import('@/idl1');

      const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
      // Use a read-only provider when no wallet
      const provider = wallet.publicKey
        ? new AnchorProvider(connection, wallet as any, { commitment: 'confirmed' })
        : new AnchorProvider(connection, {
            publicKey: PublicKey.default,
            signTransaction: async (tx: any) => tx,
            signAllTransactions: async (txs: any) => txs,
          } as any, { commitment: 'confirmed' });

      const program  = new Program(IDL as any, provider) as any;
      const compPda  = new PublicKey(compAddress.trim());

      // Fetch competition meta
      const comp = await program.account.competition.fetch(compPda);
      const statusKey = Object.keys(comp.status)[0];
      setMeta({
        creator:             comp.creator.toBase58(),
        status:              statusKey.charAt(0).toUpperCase() + statusKey.slice(1),
        startTime:           comp.startTime.toNumber(),
        finishTime:          comp.finishTime.toNumber(),
        entryFee:            comp.entryFee.toNumber(),
        totalPrize:          comp.totalPrize.toNumber(),
        winner:              comp.winner.toBase58(),
        maxParticipants:     comp.maxParticipants,
        currentParticipants: comp.currentParticipants,
      });

      // Fetch all PlayerEntry accounts filtered by competition
      const allEntries = await program.account.playerEntry.all([
        {
          memcmp: {
            offset: 8 + 32,   // discriminator(8) + player pubkey(32) → competition pubkey
            bytes: compPda.toBase58(),
          },
        },
      ]);

      const ranked: LeaderEntry[] = allEntries
        .map((e: any) => ({
          player:     e.account.player.toBase58(),
          bestScore:  e.account.bestScore.toNumber(),
          scoreCount: e.account.scoreCount,
          amountPaid: e.account.amountPaid.toNumber(),
        }))
        .sort((a: LeaderEntry, b: LeaderEntry) => b.bestScore - a.bestScore)
        .map((e: LeaderEntry, i: number) => ({ ...e, rank: i + 1 }));

      setEntries(ranked);
      setState('loaded');
      setLastRefreshed(new Date());
      setFetchErr('');

      // Pre-fill finalize winner with top player
      if (ranked.length > 0 && !finalizeWinner) {
        setFinalizeWinner(ranked[0].player);
      }
    } catch (err: any) {
      setFetchErr(err.message ?? 'Unknown error');
      setState('error');
    }
  }, [compAddress, wallet, finalizeWinner]);

  useEffect(() => {
    fetchLeaderboard();
    if (!pollIntervalMs) return;
    const id = setInterval(fetchLeaderboard, pollIntervalMs);
    return () => clearInterval(id);
  }, [fetchLeaderboard, pollIntervalMs]);

  // ── Finalize (creator only) ───────────────────────────────────────────────

  const handleFinalize = useCallback(async () => {
    if (!wallet.publicKey || !meta) return;
    if (finalizeState === 'confirming') {
      // User clicked "Confirm" on the second step
      setFinalizeState('submitting');
      setFinalizeErr('');
      try {
        const { Connection, PublicKey, clusterApiUrl } = await import('@solana/web3.js');
        const { AnchorProvider, Program }              = await import('@coral-xyz/anchor');
        const { IDL }                                   = await import('@/idl1');
        const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
        const provider   = new AnchorProvider(connection, wallet as any, { commitment: 'confirmed' });
        const program    = new Program(IDL as any, provider) as any;
        const compPda    = new PublicKey(compAddress.trim());
        const winnerKey  = new PublicKey(finalizeWinner.trim());
        const tx = await program.methods
          .finalize(winnerKey)
          .accounts({ competition: compPda, authority: wallet.publicKey })
          .rpc();
        setFinalizeTx(tx);
        setFinalizeState('success');
        fetchLeaderboard();
      } catch (e: any) {
        setFinalizeErr(e.message ?? 'Unknown error');
        setFinalizeState('error');
      }
    } else {
      setFinalizeState('confirming');
    }
  }, [wallet, meta, compAddress, finalizeState, finalizeWinner, fetchLeaderboard]);

  // ── Claim prize (winner only) ─────────────────────────────────────────────

  const handleClaim = useCallback(async () => {
    if (!wallet.publicKey || !meta) return;
    setClaimState('submitting');
    setClaimErr('');
    try {
      const { Connection, PublicKey, clusterApiUrl } = await import('@solana/web3.js');
      const { AnchorProvider, Program }              = await import('@coral-xyz/anchor');
      const { IDL }                                   = await import('@/idl1');
      const programId  = new PublicKey(PROGRAM_ID);
      const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
      const provider   = new AnchorProvider(connection, wallet as any, { commitment: 'confirmed' });
      const program    = new Program(IDL as any, provider) as any;
      const compPda    = new PublicKey(compAddress.trim());
      const [vaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault'), compPda.toBuffer()], programId
      );
      const tx = await program.methods
        .claimPrize()
        .accounts({ competition: compPda, claimant: wallet.publicKey, vault: vaultPda })
        .rpc();
      setClaimTx(tx);
      setClaimState('success');
      fetchLeaderboard();
    } catch (e: any) {
      setClaimErr(e.message ?? 'Unknown error');
      setClaimState('error');
    }
  }, [wallet, meta, compAddress, fetchLeaderboard]);

  // ── Derived flags ─────────────────────────────────────────────────────────

  const isCreator   = wallet.publicKey && meta && wallet.publicKey.toBase58() === meta.creator;
  const isWinner    = wallet.publicKey && meta && wallet.publicKey.toBase58() === meta.winner;
  const hasWinner   = meta && meta.winner !== ZERO_PUBKEY && meta.winner.length > 10;
  const isEnded     = meta?.status === 'Ended';
  const now         = Date.now() / 1000;
  const isPastEnd   = meta ? now > meta.finishTime : false;
  const canFinalize = isCreator && isPastEnd && !isEnded;
  const canClaim    = isWinner && isEnded && claimState !== 'success';
  const prize       = meta ? lamportsToSol(meta.totalPrize) : '—';

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={lb.wrap} className={className}>
      {/* Header */}
      <div style={lb.header}>
        <div style={lb.headerLeft}>
          <span style={lb.trophy}>🏆</span>
          <div>
            <h2 style={lb.title}>Leaderboard</h2>
            {meta && (
              <p style={lb.sub}>
                <span style={{ ...lb.badge, ...statusColor(meta.status) }}>{meta.status}</span>
                {meta.totalPrize > 0 && (
                  <span style={lb.prizePill}>💰 {prize} SOL prize pool</span>
                )}
                <span style={lb.partCount}>
                  {meta.currentParticipants}/{meta.maxParticipants} players
                </span>
              </p>
            )}
          </div>
        </div>
        <button style={lb.refreshBtn} onClick={fetchLeaderboard} title="Refresh">
          {state === 'loading' ? <span style={lb.spinner} /> : '↻'}
        </button>
      </div>

      {lastRefreshed && (
        <p style={lb.refreshedAt}>
          Updated {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </p>
      )}

      {/* Error */}
      {state === 'error' && (
        <div style={lb.errBox}>
          <strong>Failed to load leaderboard</strong>
          <p style={{ margin: '4px 0 0', fontSize: 12 }}>{fetchErr}</p>
          <button style={lb.retryBtn} onClick={fetchLeaderboard}>Retry</button>
        </div>
      )}

      {/* Loading skeleton */}
      {state === 'loading' && (
        <div style={lb.skeletonWrap}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ ...lb.skeletonRow, opacity: 1 - i * 0.25 }} />
          ))}
        </div>
      )}

      {/* Table */}
      {state === 'loaded' && (
        <>
          {entries.length === 0 ? (
            <div style={lb.empty}>
              <p style={{ margin: 0, fontSize: 14, color: '#9ca3af' }}>No players yet. Be the first!</p>
            </div>
          ) : (
            <div style={lb.tableWrap}>
              {/* Column headers */}
              <div style={lb.colHeader}>
                <span style={{ width: 36 }}>#</span>
                <span style={{ flex: 1 }}>Player</span>
                <span style={{ width: 90, textAlign: 'right' }}>Best Score</span>
                <span style={{ width: 60, textAlign: 'right' }}>Plays</span>
              </div>

              {entries.map(e => {
                const isYou     = playerPubkey && e.player === playerPubkey;
                const isWinnerRow = hasWinner && e.player === meta?.winner;
                return (
                  <div key={e.player} style={{
                    ...lb.row,
                    ...(isYou ? lb.rowYou : {}),
                    ...(isWinnerRow ? lb.rowWinner : {}),
                    ...(e.rank === 1 ? lb.rowFirst : {}),
                  }}>
                    <span style={lb.rank}>
                      {medalEmoji(e.rank) ?? <span style={lb.rankNum}>{e.rank}</span>}
                    </span>
                    <span style={lb.player}>
                      <span style={lb.addr}>{shortAddr(e.player)}</span>
                      {isYou && <span style={lb.youTag}>you</span>}
                      {isWinnerRow && <span style={lb.winnerTag}>👑 winner</span>}
                    </span>
                    <span style={lb.score}>{e.bestScore.toLocaleString()}</span>
                    <span style={lb.plays}>{e.scoreCount}</span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Payout Panel ── */}
      {state === 'loaded' && meta && (
        <div style={lb.payoutPanel}>
          <p style={lb.payoutTitle}>Payout</p>

          {/* Winner display */}
          {hasWinner && (
            <div style={lb.winnerRow}>
              <span style={lb.winnerIcon}>👑</span>
              <div>
                <p style={lb.winnerLabel}>Winner</p>
                <p style={lb.winnerAddr}>{meta.winner}</p>
              </div>
              <span style={{ ...lb.badge, ...statusColor('Ended') }}>Finalized</span>
            </div>
          )}

          {/* Claim prize */}
          {canClaim && (
            <div style={lb.claimBox}>
              <div style={lb.claimInfo}>
                <span style={{ fontSize: 24 }}>🎉</span>
                <div>
                  <p style={lb.claimTitle}>You won!</p>
                  <p style={lb.claimSub}>Claim your {prize} SOL prize.</p>
                </div>
              </div>
              {claimState === 'error' && (
                <p style={lb.errInline}>⚠ {claimErr}</p>
              )}
              {claimState === 'success' ? (
                <div style={lb.successBox}>
                  ✓ Prize claimed!{' '}
                  <a href={`https://explorer.solana.com/tx/${claimTx}?cluster=devnet`}
                    target="_blank" rel="noreferrer" style={lb.txLink}>View tx ↗</a>
                </div>
              ) : (
                <button
                  style={{ ...lb.claimBtn, ...(claimState === 'submitting' ? lb.btnDisabled : {}) }}
                  onClick={handleClaim}
                  disabled={claimState === 'submitting'}
                >
                  {claimState === 'submitting'
                    ? <><span style={lb.spinnerWhite} /> Claiming…</>
                    : `Claim ${prize} SOL`}
                </button>
              )}
            </div>
          )}

          {/* Finalize — creator only */}
          {canFinalize && (
            <div style={lb.finalizeBox}>
              <p style={lb.finalizeTitle}>
                🔐 Finalize Competition
                <span style={lb.finalizeNote}>Creator only</span>
              </p>
              <p style={lb.finalizeSub}>
                Competition ended. Set the winner and unlock the prize pool.
              </p>

              {/* Winner selector */}
              <div style={lb.winnerSelect}>
                <label style={lb.selectLabel}>Winner address</label>
                <select
                  style={lb.select}
                  value={finalizeWinner}
                  onChange={e => setFinalizeWinner(e.target.value)}
                >
                  {entries.map(e => (
                    <option key={e.player} value={e.player}>
                      #{e.rank} — {shortAddr(e.player)} — {e.bestScore.toLocaleString()} pts
                    </option>
                  ))}
                </select>
                <p style={lb.selectHint}>Defaults to rank #1. You can override this.</p>
              </div>

              {finalizeState === 'confirming' && (
                <div style={lb.confirmBox}>
                  <p style={{ margin: 0, fontSize: 13, color: '#92400e' }}>
                    ⚠ You're about to finalize with winner{' '}
                    <strong>{shortAddr(finalizeWinner)}</strong>.
                    This is <strong>irreversible</strong>.
                  </p>
                </div>
              )}
              {finalizeState === 'error' && (
                <p style={lb.errInline}>⚠ {finalizeErr}</p>
              )}
              {finalizeState === 'success' ? (
                <div style={lb.successBox}>
                  ✓ Finalized!{' '}
                  <a href={`https://explorer.solana.com/tx/${finalizeTx}?cluster=devnet`}
                    target="_blank" rel="noreferrer" style={lb.txLink}>View tx ↗</a>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  {finalizeState === 'confirming' && (
                    <button style={lb.cancelBtn} onClick={() => setFinalizeState('idle')}>
                      Cancel
                    </button>
                  )}
                  <button
                    style={{
                      ...lb.finalizeBtn,
                      ...(finalizeState === 'confirming' ? lb.finalizeBtnConfirm : {}),
                      ...(finalizeState === 'submitting' ? lb.btnDisabled : {}),
                    }}
                    onClick={handleFinalize}
                    disabled={finalizeState === 'submitting'}
                  >
                    {finalizeState === 'idle'       && 'Finalize Competition'}
                    {finalizeState === 'confirming' && '✓ Confirm & Sign'}
                    {finalizeState === 'submitting' && <><span style={lb.spinnerWhite} /> Finalizing…</>}
                    {finalizeState === 'error'      && 'Try Again'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Competition info footer */}
          <div style={lb.metaGrid}>
            <MetaItem label="Entry fee"   value={meta.entryFee > 0 ? `${lamportsToSol(meta.entryFee)} SOL` : 'Free'} />
            <MetaItem label="Prize pool"  value={`${lamportsToSol(meta.totalPrize)} SOL`} />
            <MetaItem label="Ends"        value={new Date(meta.finishTime * 1000).toLocaleString()} />
            <MetaItem label="Creator"     value={shortAddr(meta.creator)} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Small helper ──────────────────────────────────────────────────────────────
function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div style={lb.metaItem}>
      <p style={lb.metaLabel}>{label}</p>
      <p style={lb.metaValue}>{value}</p>
    </div>
  );
}

function statusColor(status: string): React.CSSProperties {
  if (status === 'Active')    return { background: '#dcfce7', color: '#166534' };
  if (status === 'Ended')     return { background: '#f3f4f6', color: '#374151' };
  if (status === 'Cancelled') return { background: '#fee2e2', color: '#991b1b' };
  return {};
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const lb: Record<string, React.CSSProperties> = {
  wrap:         { fontFamily: 'Arial, sans-serif', border: '1px solid #e5e7eb', borderRadius: 16, overflow: 'hidden', background: '#fff' },

  header:       { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '16px 18px 12px', borderBottom: '1px solid #f3f4f6' },
  headerLeft:   { display: 'flex', alignItems: 'center', gap: 12 },
  trophy:       { fontSize: 28 },
  title:        { fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 },
  sub:          { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const, margin: '4px 0 0', fontSize: 12 },

  badge:        { fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 100 },
  prizePill:    { fontSize: 11, fontWeight: 600, background: '#faf5ff', color: '#9945FF', padding: '2px 8px', borderRadius: 100, border: '1px solid #e9d5ff' },
  partCount:    { fontSize: 11, color: '#9ca3af' },

  refreshBtn:   { background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 16, color: '#6b7280', display: 'flex', alignItems: 'center' },
  refreshedAt:  { fontSize: 11, color: '#d1d5db', padding: '4px 18px 0', margin: 0 },

  errBox:       { margin: 16, padding: '12px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, color: '#dc2626', fontSize: 13 },
  retryBtn:     { marginTop: 8, padding: '5px 12px', fontSize: 12, background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 6, cursor: 'pointer', color: '#dc2626' },

  skeletonWrap: { padding: '12px 18px', display: 'flex', flexDirection: 'column' as const, gap: 8 },
  skeletonRow:  { height: 40, borderRadius: 8, background: '#f3f4f6', animation: 'pulse 1.5s ease infinite' },

  empty:        { padding: '32px 18px', textAlign: 'center' as const },

  tableWrap:    { padding: '0 0 4px' },
  colHeader:    { display: 'flex', alignItems: 'center', gap: 12, padding: '8px 18px', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' as const, letterSpacing: '0.06em', borderBottom: '1px solid #f3f4f6' },

  row:          { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px', borderBottom: '1px solid #f9fafb', transition: 'background 0.15s' },
  rowFirst:     { background: '#faf5ff' },
  rowYou:       { background: '#f0fdf4' },
  rowWinner:    { background: '#fefce8' },

  rank:         { width: 36, fontSize: 18, flexShrink: 0 },
  rankNum:      { fontSize: 13, fontWeight: 600, color: '#9ca3af' },
  player:       { flex: 1, display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 },
  addr:         { fontFamily: 'monospace', fontSize: 13, color: '#374151', fontWeight: 500 },
  youTag:       { fontSize: 10, fontWeight: 700, background: '#dcfce7', color: '#166534', padding: '1px 6px', borderRadius: 100, flexShrink: 0 },
  winnerTag:    { fontSize: 10, fontWeight: 700, background: '#fef9c3', color: '#92400e', padding: '1px 6px', borderRadius: 100, flexShrink: 0 },
  score:        { width: 90, textAlign: 'right' as const, fontWeight: 700, fontSize: 15, color: '#9945FF', fontVariantNumeric: 'tabular-nums' },
  plays:        { width: 60, textAlign: 'right' as const, fontSize: 13, color: '#9ca3af', fontVariantNumeric: 'tabular-nums' },

  // Payout panel
  payoutPanel:  { borderTop: '1px solid #e5e7eb', padding: '16px 18px', display: 'flex', flexDirection: 'column' as const, gap: 14 },
  payoutTitle:  { fontSize: 13, fontWeight: 700, color: '#374151', margin: 0, textTransform: 'uppercase' as const, letterSpacing: '0.07em' },

  winnerRow:    { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#fefce8', border: '1px solid #fde68a', borderRadius: 10 },
  winnerIcon:   { fontSize: 22, flexShrink: 0 },
  winnerLabel:  { fontSize: 11, fontWeight: 600, color: '#92400e', margin: '0 0 2px', textTransform: 'uppercase' as const, letterSpacing: '0.06em' },
  winnerAddr:   { fontSize: 11, fontFamily: 'monospace', color: '#374151', margin: 0, wordBreak: 'break-all' as const },

  claimBox:     { background: 'linear-gradient(135deg,#faf5ff,#f0fdf4)', border: '1px solid #d8b4fe', borderRadius: 12, padding: '16px' },
  claimInfo:    { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 },
  claimTitle:   { fontSize: 15, fontWeight: 700, color: '#111827', margin: '0 0 3px' },
  claimSub:     { fontSize: 13, color: '#6b7280', margin: 0 },
  claimBtn:     { width: '100%', padding: '12px 0', fontSize: 15, fontWeight: 700, background: 'linear-gradient(135deg,#9945FF,#14F195)', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 },

  finalizeBox:  { background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '16px' },
  finalizeTitle:{ fontSize: 13, fontWeight: 700, color: '#92400e', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 8 },
  finalizeNote: { fontSize: 10, fontWeight: 600, background: '#fde68a', color: '#78350f', padding: '2px 7px', borderRadius: 100, marginLeft: 'auto' },
  finalizeSub:  { fontSize: 13, color: '#92400e', margin: '0 0 12px' },

  winnerSelect: { display: 'flex', flexDirection: 'column' as const, gap: 4, marginBottom: 4 },
  selectLabel:  { fontSize: 12, fontWeight: 600, color: '#78350f' },
  select:       { padding: '8px 10px', fontSize: 13, border: '1px solid #fde68a', borderRadius: 8, background: '#fffef0', color: '#374151', cursor: 'pointer' },
  selectHint:   { fontSize: 11, color: '#b45309', margin: 0 },

  confirmBox:   { background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: 8, padding: '10px 12px', marginTop: 10 },
  finalizeBtn:  { flex: 1, padding: '10px 16px', fontSize: 14, fontWeight: 700, background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 },
  finalizeBtnConfirm: { background: '#dc2626' },
  cancelBtn:    { padding: '10px 16px', fontSize: 14, fontWeight: 600, background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 10, cursor: 'pointer' },

  metaGrid:     { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, background: '#f9fafb', borderRadius: 10, padding: '12px 14px' },
  metaItem:     {},
  metaLabel:    { fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' as const, letterSpacing: '0.08em', margin: '0 0 2px' },
  metaValue:    { fontSize: 13, fontWeight: 600, color: '#374151', margin: 0 },

  errInline:    { fontSize: 12, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '6px 10px', margin: '8px 0 0' },
  successBox:   { fontSize: 13, color: '#166534', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 12px', marginTop: 8 },
  txLink:       { color: '#9945FF', textDecoration: 'none', fontWeight: 600 },

  spinner:      { display: 'inline-block', width: 14, height: 14, border: '2px solid #e5e7eb', borderTopColor: '#9945FF', borderRadius: '50%', animation: 'spin 0.7s linear infinite' },
  spinnerWhite: { display: 'inline-block', width: 13, height: 13, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' },
  btnDisabled:  { opacity: 0.7, cursor: 'not-allowed', pointerEvents: 'none' as const },
};