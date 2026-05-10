'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import PunchTargets from "@/components/PunchTargets";

// ─────────────────────────────────────────────────────────────────────────────
// URL shape:  /play?comp=<PDA>&gameId=<number>
//
// Adding a new game:
//   1. Create your component in /games/GameXxx.tsx
//   2. Add it to GAME_REGISTRY below
//   3. Your component receives { onScore } and calls onScore(n) to submit
// ─────────────────────────────────────────────────────────────────────────────

const PROGRAM_ID = '2HK29Di58nED836JN14U1bPsxW4q52FLW5knoJEDmYQJ';

// ── Game registry ─────────────────────────────────────────────────────────────
// key = gameId from the competition account
// Add your real game components here as you build them.
const GAME_REGISTRY: Record<number, React.ComponentType<GameProps>> = {
  1: PunchUp,
  // 1: GameOne,
  // 2: GameTwo,
  // etc.
};

export interface GameProps {
  /** Call this whenever the player achieves a score */
  onScore: (score: number) => void;
}

// ─── Types ────────────────────────────────────────────────────────────────────
declare global {
  interface Window {
    __motionplay_score: (score: number) => void;
    __motionplay_ready: () => void;
    __motionplay_error: (msg: string) => void;
  }
}

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

interface ScoreEntry {
  score:       number;
  submittedAt: Date;
  tx?:         string;
  state:       SubmitState;
  error?:      string;
}

function ClientWalletButton() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <WalletMultiButton />;
}

// ─── Scoring hook ─────────────────────────────────────────────────────────────
function useScoring(compAddress: string, wallet: ReturnType<typeof useWallet>) {
  const [history, setHistory]     = useState<ScoreEntry[]>([]);
  const [bestScore, setBestScore] = useState<number | null>(null);
  const [chainBest, setChainBest] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const queueRef      = useRef<number[]>([]);
  const processingRef = useRef(false);

  const loadChainEntry = useCallback(async () => {
    if (!wallet.publicKey || !compAddress.trim()) return;
    try {
      const { Connection, PublicKey, clusterApiUrl } = await import('@solana/web3.js');
      const { AnchorProvider, Program }              = await import('@coral-xyz/anchor');
      const { IDL }                                   = await import('@/idl1');
      const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
      const provider   = new AnchorProvider(connection, wallet as any, { commitment: 'confirmed' });
      const program    = new Program(IDL as any, provider) as any;
      const compPda    = new PublicKey(compAddress.trim());
      const [entryPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('entry'), compPda.toBuffer(), wallet.publicKey.toBuffer()],
        new PublicKey(PROGRAM_ID)
      );
      const entry = await program.account.playerEntry.fetch(entryPda);
      const best  = entry.bestScore.toNumber();
      setChainBest(best);
      setBestScore(prev => (prev === null || best > prev) ? best : prev);
    } catch { /* not entered yet */ }
  }, [wallet, compAddress]);

  useEffect(() => { loadChainEntry(); }, [loadChainEntry]);

  const submitToChain = useCallback(async (score: number): Promise<{ tx: string } | { error: string }> => {
    if (!wallet.publicKey || !compAddress.trim()) return { error: 'Wallet not connected or no competition' };
    try {
      const { Connection, PublicKey, clusterApiUrl } = await import('@solana/web3.js');
      const { AnchorProvider, BN, Program }          = await import('@coral-xyz/anchor');
      const { IDL }                                   = await import('@/idl1');
      const programId  = new PublicKey(PROGRAM_ID);
      const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
      const provider   = new AnchorProvider(connection, wallet as any, { commitment: 'confirmed' });
      const program    = new Program(IDL as any, provider) as any;
      const compPda    = new PublicKey(compAddress.trim());
      const [entryPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('entry'), compPda.toBuffer(), wallet.publicKey.toBuffer()], programId
      );
      const tx = await program.methods
        .submitScore(new BN(score))
        .accounts({ competition: compPda, playerEntry: entryPda, player: wallet.publicKey })
        .rpc();
      return { tx };
    } catch (e: any) {
      return { error: e.message };
    }
  }, [wallet, compAddress]);

  const drainQueue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    setSubmitting(true);
    while (queueRef.current.length > 0) {
      const score = queueRef.current.shift()!;
      setHistory(h => [{ score, submittedAt: new Date(), state: 'submitting' }, ...h]);
      const result = await submitToChain(score);
      if ('tx' in result) {
        setBestScore(prev => (prev === null || score > prev) ? score : prev);
        setHistory(h => h.map((e, i) => i === 0 ? { ...e, state: 'success' as SubmitState, tx: result.tx } : e));
      } else {
        setHistory(h => h.map((e, i) => i === 0 ? { ...e, state: 'error' as SubmitState, error: result.error } : e));
      }
    }
    processingRef.current = false;
    setSubmitting(false);
    loadChainEntry();
  }, [submitToChain, loadChainEntry]);

  const reportScore = useCallback((score: number) => {
    if (!compAddress.trim() || !wallet.publicKey) return;
    queueRef.current.push(score);
    drainQueue();
  }, [compAddress, wallet.publicKey, drainQueue]);

  return { reportScore, history, bestScore, chainBest, submitting };
}

// ─── Inner page (uses useSearchParams) ───────────────────────────────────────
function PlayChallengeInner() {
  const params      = useSearchParams();
  const wallet      = useWallet();
  const compAddress = params.get('comp')   ?? '';
  const gameId      = parseInt(params.get('gameId') ?? '0', 10);
  const [gameError, setGameError] = useState('');

  const { reportScore, history, bestScore, chainBest, submitting } =
    useScoring(compAddress, wallet);

  // Expose window API for games that prefer it
  useEffect(() => {
    window.__motionplay_score = (score: number) => {
      if (typeof score !== 'number' || isNaN(score)) return;
      reportScore(Math.round(score));
    };
    window.__motionplay_ready = () => {};
    window.__motionplay_error = (msg: string) => setGameError(msg);
    return () => {
      delete (window as any).__motionplay_score;
      delete (window as any).__motionplay_ready;
      delete (window as any).__motionplay_error;
    };
  }, [reportScore]);

  const lastSuccess  = history.find(e => e.state === 'success');
  const isNewBest    = lastSuccess?.score === bestScore &&
                       (chainBest === null || (bestScore !== null && bestScore > chainBest));

  // Resolve game component
  const GameComponent = GAME_REGISTRY[gameId] ?? null;

  const missingComp  = !compAddress;
  const missingGame  = !GameComponent;

  return (
    <main style={s.main}>
      {/* Header */}
      <div style={s.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a href="/competitions" style={s.backBtn}>← Back</a>
          <div>
            <h1 style={s.title}>Play Challenge</h1>
            {compAddress && (
              <p style={s.compMeta}>
                <span style={s.compDot} />
                {compAddress.slice(0, 8)}…{compAddress.slice(-6)}
                <span style={s.gameIdBadge}>Game #{gameId}</span>
              </p>
            )}
          </div>
        </div>
        <ClientWalletButton />
      </div>
 <PunchTargets
      onScore={(score) => {
        console.log("Score:", score);

        // optional global hook
        if (typeof window !== "undefined") {
          window.__motionplay_score?.(score);
        }
      }}
    />
      {/* Missing params warning */}
      {(missingComp || missingGame) && (
        <div style={s.paramWarn}>
          {missingComp && (
            <p style={s.paramWarnText}>
              ⚠ No competition address in URL.
              Expected: <code style={s.code}>/play?comp=&lt;PDA&gt;&amp;gameId=&lt;n&gt;</code>
            </p>
          )}
          {!missingComp && missingGame && (
            <p style={s.paramWarnText}>
              ⚠ No game registered for <strong>gameId={gameId}</strong>.
              Add it to <code style={s.code}>GAME_REGISTRY</code> in this file.
            </p>
          )}
        </div>
      )}

      <div style={s.body}>
        {/* ── Game area ───────────────────────────────────────────────────── */}
        {/*  <div style={s.gameShell}>
          {GameComponent
            ? <GameComponent onScore={reportScore} />
            : <GameSlot gameId={gameId} hasComp={!missingComp} onScore={reportScore} />
          }
        </div>
*/}
        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <div style={s.sidebar}>

          {/* Score display */}
          <div style={s.scoreCard}>
            <p style={s.scoreLabel}>SESSION BEST</p>
            <p style={s.scoreValue}>{bestScore ?? '—'}</p>
            {chainBest !== null && (
              <p style={s.scoreSub}>Chain record: {chainBest}</p>
            )}
            {submitting && (
              <div style={s.submittingRow}>
                <span style={s.spinner} />
                <span style={{ fontSize: 12, color: '#9ca3af' }}>Submitting…</span>
              </div>
            )}
            {isNewBest && bestScore !== null && (
              <div style={s.newBest}>🔥 New best!</div>
            )}
          </div>

          {/* Warnings */}
          {!wallet.publicKey && (
            <div style={s.warn}>Connect your wallet to submit scores on-chain.</div>
          )}
          {gameError && (
            <div style={{ ...s.warn, borderColor: '#fca5a5', background: '#fef2f2', color: '#dc2626' }}>
              ⚠ {gameError}
            </div>
          )}

          {/* History */}
          <div style={s.histCard}>
            <p style={s.histTitle}>Score History</p>
            {history.length === 0
              ? <p style={s.histEmpty}>Scores appear here as you play.</p>
              : (
                <div style={s.histList}>
                  {history.map((e, i) => (
                    <div key={i} style={s.histRow}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <StateIcon state={e.state} />
                        <span style={s.histScore}>{e.score}</span>
                        {e.score === bestScore && i === history.findIndex(x => x.score === bestScore) && (
                          <span style={s.bestTag}>best</span>
                        )}
                      </div>
                      <div style={{ textAlign: 'right' as const }}>
                        <span style={s.histTime}>
                          {e.submittedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                        {e.tx && (
                          <a href={`https://explorer.solana.com/tx/${e.tx}?cluster=devnet`}
                            target="_blank" rel="noreferrer" style={s.txLink}>tx ↗</a>
                        )}
                        {e.error && <p style={s.errText} title={e.error}>failed</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )
            }
          </div>

          {/* Dev panel */}
          {/*
          <details style={s.dev}>
            <summary style={s.devSum}>Developer</summary>
            <p style={s.devText}>
              Register your game in <code style={s.code}>GAME_REGISTRY</code> using its <strong>gameId</strong>.<br /><br />
              Your component receives <code style={s.code}>{'{ onScore }'}</code> as props.<br />
              Or call <code style={s.code}>window.__motionplay_score(n)</code> directly from anywhere.
            </p>
            <p style={{ ...s.devText, marginTop: 0 }}>
              URL format:<br />
              <code style={s.code}>/play?comp=PDA&amp;gameId=1</code>
            </p>
            <button style={s.devBtn}
              onClick={() => window.__motionplay_score?.(Math.floor(Math.random() * 1000))}>
              Simulate score
            </button>
          </details>
*/}
        </div>
      </div>
    </main>
  );
}

// ─── Game slot (shown when no game is registered yet) ─────────────────────────
function GameSlot({ gameId, hasComp, onScore }: { gameId: number; hasComp: boolean; onScore: (n: number) => void }) {
  return (
    <div style={gs.wrap}>
      <div style={gs.icon}>🎮</div>
      <h2 style={gs.heading}>
        {hasComp ? `Game #${gameId} not registered yet` : 'No competition in URL'}
      </h2>
      <p style={gs.body}>
        {hasComp
          ? <>Add your component to <code style={gs.code}>GAME_REGISTRY[{gameId}]</code> in <code style={gs.code}>play/page.tsx</code>.</>
          : <>Navigate here with <code style={gs.code}>/play?comp=PDA&amp;gameId=1</code></>
        }
      </p>
      {hasComp && (
        <>
          <div style={gs.divider} />
          <p style={gs.sub}>Test scoring</p>
          <div style={gs.row}>
            {[10, 50, 100, 250, 500].map(n => (
              <button key={n} style={gs.btn} onClick={() => onScore(n)}>+{n}</button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── State icon ───────────────────────────────────────────────────────────────
function StateIcon({ state }: { state: SubmitState }) {
  if (state === 'submitting') return <span style={s.spinner} />;
  if (state === 'success')    return <span style={{ color: '#16a34a', fontSize: 14 }}>✓</span>;
  if (state === 'error')      return <span style={{ color: '#dc2626', fontSize: 14 }}>✗</span>;
  return null;
}

// ─── Root export (Suspense required for useSearchParams) ──────────────────────
export default function PlayChallengePage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Arial, sans-serif', color: '#6b7280' }}>
        Loading…
      </div>
    }>
      <PlayChallengeInner />
    </Suspense>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  main:         { maxWidth: 1200, margin: '0 auto', padding: '32px 24px', fontFamily: 'Arial, sans-serif', minHeight: '100vh' },
  header:       { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title:        { fontSize: 22, fontWeight: 700, margin: 0 },
  backBtn:      { fontSize: 14, color: '#6b7280', textDecoration: 'none', padding: '6px 12px', border: '1px solid #e5e7eb', borderRadius: 8 },
  compMeta:     { fontSize: 12, color: '#9ca3af', margin: '3px 0 0', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'monospace' },
  compDot:      { display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#22c55e' },
  gameIdBadge:  { fontFamily: 'Arial, sans-serif', background: '#f3f4f6', color: '#374151', fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 100, marginLeft: 4 },

  paramWarn:    { background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 16px', marginBottom: 20 },
  paramWarnText:{ margin: 0, fontSize: 13, color: '#92400e', lineHeight: 1.6 },
  code:         { fontFamily: 'monospace', background: '#f3f4f6', padding: '1px 5px', borderRadius: 4, fontSize: 12 },

  body:         { display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' },
  gameShell:    { border: '1px solid #e5e7eb', borderRadius: 16, overflow: 'hidden', minHeight: 500, background: '#000', display: 'flex', flexDirection: 'column' as const },

  sidebar:      { display: 'flex', flexDirection: 'column' as const, gap: 14 },

  scoreCard:    { border: '1px solid #e9d5ff', borderRadius: 14, padding: '18px', background: '#faf5ff', textAlign: 'center' as const },
  scoreLabel:   { fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: '#9ca3af', textTransform: 'uppercase' as const, margin: '0 0 6px' },
  scoreValue:   { fontSize: 52, fontWeight: 800, color: '#9945FF', margin: '0 0 2px', lineHeight: 1 },
  scoreSub:     { fontSize: 12, color: '#a78bfa', margin: '0 0 6px' },
  submittingRow:{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4 },
  newBest:      { marginTop: 10, display: 'inline-block', background: '#fef9c3', color: '#92400e', fontSize: 13, fontWeight: 600, padding: '4px 12px', borderRadius: 100 },

  warn:         { border: '1px solid #fde68a', background: '#fffbeb', borderRadius: 10, padding: '11px 13px', fontSize: 13, color: '#92400e', lineHeight: 1.5 },

  histCard:     { border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'hidden' },
  histTitle:    { fontSize: 13, fontWeight: 600, color: '#374151', margin: 0, padding: '11px 14px', borderBottom: '1px solid #f3f4f6', background: '#f9fafb' },
  histEmpty:    { fontSize: 13, color: '#9ca3af', padding: '14px', margin: 0 },
  histList:     { maxHeight: 240, overflowY: 'auto' as const },
  histRow:      { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', borderBottom: '1px solid #f9fafb', fontSize: 14 },
  histScore:    { fontWeight: 700, color: '#111827' },
  histTime:     { fontSize: 11, color: '#9ca3af', display: 'block' },
  bestTag:      { fontSize: 10, fontWeight: 700, background: '#faf5ff', color: '#9945FF', border: '1px solid #e9d5ff', padding: '1px 6px', borderRadius: 100 },
  txLink:       { fontSize: 11, color: '#9945FF', display: 'block', textDecoration: 'none' },
  errText:      { fontSize: 11, color: '#dc2626', margin: 0 },

  spinner:      { display: 'inline-block', width: 11, height: 11, border: '2px solid #e5e7eb', borderTopColor: '#9945FF', borderRadius: '50%', animation: 'spin 0.7s linear infinite' },

  dev:          { border: '1px solid #e5e7eb', borderRadius: 12, padding: '11px 13px' },
  devSum:       { cursor: 'pointer', fontWeight: 600, color: '#374151', fontSize: 13 },
  devText:      { margin: '10px 0 8px', fontSize: 13, color: '#6b7280', lineHeight: 1.6 },
  devBtn:       { padding: '7px 14px', fontSize: 13, background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer', fontWeight: 600 },
};

const gs: Record<string, React.CSSProperties> = {
  wrap:    { flex: 1, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', padding: 48, textAlign: 'center' as const, color: '#fff' },
  icon:    { fontSize: 52, marginBottom: 18 },
  heading: { fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 10px' },
  body:    { fontSize: 14, color: '#9ca3af', lineHeight: 1.6, margin: 0 },
  code:    { fontFamily: 'monospace', background: '#1f2937', padding: '2px 6px', borderRadius: 4, fontSize: 13, color: '#a78bfa' },
  divider: { width: 40, height: 1, background: '#1f2937', margin: '22px 0' },
  sub:     { fontSize: 13, color: '#6b7280', margin: '0 0 10px' },
  row:     { display: 'flex', gap: 8, flexWrap: 'wrap' as const, justifyContent: 'center' },
  btn:     { padding: '8px 14px', fontSize: 14, fontWeight: 600, background: '#1f2937', color: '#e5e7eb', border: '1px solid #374151', borderRadius: 8, cursor: 'pointer' },
};
