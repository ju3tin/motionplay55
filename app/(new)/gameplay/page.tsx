'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import PunchTargets from "@/components/PunchTargets";

// ─────────────────────────────────────────────────────────────────────────────
// URL shape:  /play?comp=<PDA>&gameId=<number>
// ─────────────────────────────────────────────────────────────────────────────

const PROGRAM_ID = '2HK29Di58nED836JN14U1bPsxW4q52FLW5knoJEDmYQJ';

const GAME_REGISTRY: Record<number, React.ComponentType<GameProps>> = {
  1: PunchTargets,
};

export interface GameProps {
  onScore: (score: number) => void;
}

declare global {
  interface Window {
    __motionplay_score: (score: number) => void;
    __motionplay_ready: () => void;
    __motionplay_error: (msg: string) => void;
  }
}

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';
type JoinState   = 'loading' | 'not-joined' | 'joining' | 'joined' | 'error';

interface ScoreEntry {
  score:       number;
  submittedAt: Date;
  tx?:         string;
  state:       SubmitState;
  error?:      string;
}

// ─── Mobile detection ─────────────────────────────────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

function ClientWalletButton() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <WalletMultiButton />;
}

// ─── Share button ─────────────────────────────────────────────────────────────
function ShareButton({ gameId }: { gameId: number }) {
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Join my MotionPlay challenge!',
          text: `Play against me on MotionPlay — Game #${gameId}`,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch { /* user cancelled */ }
  }, [gameId]);

  return (
    <button style={{ ...sh.btn, ...(copied ? sh.btnCopied : {}) }} onClick={handleShare}>
      {copied ? '✓ Copied!' : '🔗 Share'}
    </button>
  );
}

// ─── Join hook ────────────────────────────────────────────────────────────────
function useJoin(compAddress: string, wallet: ReturnType<typeof useWallet>) {
  const [joinState, setJoinState] = useState<JoinState>('loading');
  const [joinError, setJoinError] = useState('');

  const checkJoined = useCallback(async () => {
    if (!wallet.publicKey || !compAddress.trim()) {
      setJoinState('not-joined');
      return;
    }
    setJoinState('loading');
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
      await program.account.playerEntry.fetch(entryPda);
      setJoinState('joined');
    } catch {
      setJoinState('not-joined');
    }
  }, [wallet, compAddress]);

  useEffect(() => { checkJoined(); }, [checkJoined]);

  const join = useCallback(async () => {
    if (!wallet.publicKey || !compAddress.trim()) return;
    setJoinState('joining');
    setJoinError('');
    try {
      const { Connection, PublicKey, clusterApiUrl } = await import('@solana/web3.js');
      const { AnchorProvider, Program }              = await import('@coral-xyz/anchor');
      const { IDL }                                   = await import('@/idl1');
      const programId  = new PublicKey(PROGRAM_ID);
      const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
      const provider   = new AnchorProvider(connection, wallet as any, { commitment: 'confirmed' });
      const program    = new Program(IDL as any, provider) as any;
      const compPda    = new PublicKey(compAddress.trim());
      const [entryPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('entry'), compPda.toBuffer(), wallet.publicKey.toBuffer()], programId
      );
      const [vaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault'), compPda.toBuffer()], programId
      );
      await program.methods
        .enter()
        .accounts({ competition: compPda, playerEntry: entryPda, player: wallet.publicKey, vault: vaultPda })
        .rpc();
      setJoinState('joined');
    } catch (e: any) {
      setJoinError(e.message ?? 'Unknown error');
      setJoinState('error');
    }
  }, [wallet, compAddress]);

  return { joinState, joinError, join };
}

// ─── Scoring hook ─────────────────────────────────────────────────────────────
function useScoring(compAddress: string, wallet: ReturnType<typeof useWallet>) {
  const [history, setHistory]       = useState<ScoreEntry[]>([]);
  const [bestScore, setBestScore]   = useState<number | null>(null);
  const [chainBest, setChainBest]   = useState<number | null>(null);
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

// ─── Join Gate UI ─────────────────────────────────────────────────────────────
function JoinGate({
  joinState, joinError, onJoin, compAddress, walletConnected,
}: {
  joinState: JoinState; joinError: string; onJoin: () => void;
  compAddress: string; walletConnected: boolean;
}) {
  return (
    <div style={jg.overlay}>
      <div style={jg.card}>
        <div style={jg.iconWrap}>
          {(joinState === 'loading' || joinState === 'joining') && <span style={jg.spinnerLg} />}
          {joinState === 'not-joined' && <span style={{ fontSize: 36 }}>🏆</span>}
          {joinState === 'error'      && <span style={{ fontSize: 36 }}>⚠️</span>}
        </div>

        <h2 style={jg.heading}>
          {joinState === 'loading'    && 'Checking entry…'}
          {joinState === 'not-joined' && 'Join this competition'}
          {joinState === 'joining'    && 'Joining…'}
          {joinState === 'error'      && 'Failed to join'}
        </h2>

        {joinState === 'not-joined' && (
          <>
            <p style={jg.body}>
              You haven't entered this competition yet. Join to start playing and have your
              scores recorded on-chain.
            </p>
            {compAddress && (
              <p style={jg.addr}>
                <span style={jg.dot} />
                {compAddress.slice(0, 8)}…{compAddress.slice(-6)}
              </p>
            )}
          </>
        )}
        {joinState === 'loading' && <p style={jg.body}>Checking your entry on devnet…</p>}
        {joinState === 'joining' && <p style={jg.body}>Confirm the transaction in your wallet.</p>}
        {joinState === 'error'   && (
          <>
            <p style={jg.body}>Something went wrong while joining.</p>
            {joinError && <p style={jg.errBox}>{joinError}</p>}
          </>
        )}

        {!walletConnected && joinState === 'not-joined' && (
          <div style={{ marginTop: 18 }}>
            <p style={{ ...jg.body, marginBottom: 10, color: '#f59e0b' }}>Connect your wallet first.</p>
            <ClientWalletButton />
          </div>
        )}
        {walletConnected && (joinState === 'not-joined' || joinState === 'error') && (
          <button style={jg.btn} onClick={onJoin}>
            {joinState === 'error' ? 'Try again' : 'Join & Play'}
          </button>
        )}
      </div>
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

// ─── Inner page ───────────────────────────────────────────────────────────────
function PlayChallengeInner() {
  const params      = useSearchParams();
  const wallet      = useWallet();
  const isMobile    = useIsMobile();
  const compAddress = params?.get('comp') ?? '';
  const gameId      = parseInt(params.get('gameId') ?? '0', 10);
  const [gameError, setGameError] = useState('');

  const { joinState, joinError, join } = useJoin(compAddress, wallet);
  const { reportScore, history, bestScore, chainBest, submitting } =
    useScoring(compAddress, wallet);

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

  const lastSuccess = history.find(e => e.state === 'success');
  const isNewBest   = lastSuccess?.score === bestScore &&
                      (chainBest === null || (bestScore !== null && bestScore > chainBest));

  const missingComp = !compAddress;
  const missingGame = !GAME_REGISTRY[gameId];
  const showJoinGate = compAddress && wallet.publicKey ? joinState !== 'joined' : false;

  const handleScore = useCallback((score: number) => {
    console.log('Score:', score);
    if (typeof window !== 'undefined') window.__motionplay_score?.(score);
  }, []);

  // ── Mobile layout ──────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={m.root}>
        {/* Slim top bar */}
        <div style={m.bar}>
          <a href="/competitions" style={m.back}>← Back</a>
          <ShareButton gameId={gameId} />
          <ClientWalletButton />
        </div>

        {/* Full-screen game */}
        <div style={m.gameWrap}>
          {joinState === 'joined' && (
            <PunchTargets onScore={handleScore} />
          )}
        </div>

        {/* Join gate overlay works on mobile too */}
        {showJoinGate && (
          <JoinGate
            joinState={joinState}
            joinError={joinError}
            onJoin={join}
            compAddress={compAddress}
            walletConnected={!!wallet.publicKey}
          />
        )}

        {/* Wallet prompt banner at bottom */}
        {!wallet.publicKey && compAddress && (
          <div style={m.walletPrompt}>
            <span>👛 Connect wallet to play</span>
            <ClientWalletButton />
          </div>
        )}
      </div>
    );
  }

  // ── Desktop layout ─────────────────────────────────────────────────────────
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {compAddress && <ShareButton gameId={gameId} />}
          <ClientWalletButton />
        </div>
      </div>

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

      {/* Join gate */}
      {showJoinGate && (
        <JoinGate
          joinState={joinState}
          joinError={joinError}
          onJoin={join}
          compAddress={compAddress}
          walletConnected={!!wallet.publicKey}
        />
      )}

      {/* Wallet prompt */}
      {!wallet.publicKey && compAddress && (
        <div style={s.connectPrompt}>
          <span style={{ fontSize: 20 }}>👛</span>
          <div>
            <p style={s.connectTitle}>Connect your wallet to play</p>
            <p style={s.connectSub}>You need a wallet connected to join and submit scores on-chain.</p>
          </div>
          <ClientWalletButton />
        </div>
      )}

      <div style={s.body}>
        {/* Game */}
        {joinState === 'joined' && (
          <PunchTargets onScore={handleScore} />
        )}

        {/* Sidebar */}
        <div style={s.sidebar}>
          <div style={s.scoreCard}>
            <p style={s.scoreLabel}>SESSION BEST</p>
            <p style={s.scoreValue}>{bestScore ?? '—'}</p>
            {chainBest !== null && <p style={s.scoreSub}>Chain record: {chainBest}</p>}
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

          {!wallet.publicKey && (
            <div style={s.warn}>Connect your wallet to submit scores on-chain.</div>
          )}
          {gameError && (
            <div style={{ ...s.warn, borderColor: '#fca5a5', background: '#fef2f2', color: '#dc2626' }}>
              ⚠ {gameError}
            </div>
          )}

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
        </div>
      </div>
    </main>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────
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

// ─── Desktop styles ───────────────────────────────────────────────────────────
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

  connectPrompt:{ display: 'flex', alignItems: 'center', gap: 16, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '16px 20px', marginBottom: 20 },
  connectTitle: { margin: '0 0 3px', fontWeight: 600, fontSize: 14, color: '#166534' },
  connectSub:   { margin: 0, fontSize: 13, color: '#4b7a5a' },

  body:         { display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' },

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
};

// ─── Mobile styles ────────────────────────────────────────────────────────────
const m: Record<string, React.CSSProperties> = {
  root:         { display: 'flex', flexDirection: 'column' as const, height: '100dvh', overflow: 'hidden', fontFamily: 'Arial, sans-serif', background: '#000' },
  bar:          { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#111', flexShrink: 0, gap: 8 },
  back:         { fontSize: 13, color: '#9ca3af', textDecoration: 'none', padding: '5px 10px', border: '1px solid #374151', borderRadius: 8, whiteSpace: 'nowrap' as const },
  gameWrap:     { flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' as const },
  walletPrompt: { position: 'fixed' as const, bottom: 0, left: 0, right: 0, background: '#1f2937', borderTop: '1px solid #374151', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, color: '#9ca3af', zIndex: 40 },
};

// ─── Share button styles ──────────────────────────────────────────────────────
const sh: Record<string, React.CSSProperties> = {
  btn:       { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: 13, fontWeight: 600, background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap' as const },
  btnCopied: { background: '#f0fdf4', color: '#166534', borderColor: '#bbf7d0' },
};

// ─── Join gate styles ─────────────────────────────────────────────────────────
const jg: Record<string, React.CSSProperties> = {
  overlay:   { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card:      { background: '#fff', borderRadius: 20, padding: '40px 36px', maxWidth: 420, width: '100%', textAlign: 'center', boxShadow: '0 25px 60px rgba(0,0,0,0.2)' },
  iconWrap:  { marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 52 },
  heading:   { fontSize: 20, fontWeight: 700, color: '#111827', margin: '0 0 12px' },
  body:      { fontSize: 14, color: '#6b7280', lineHeight: 1.6, margin: '0 0 20px' },
  addr:      { display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'monospace', fontSize: 12, color: '#9ca3af', background: '#f3f4f6', padding: '5px 12px', borderRadius: 100, marginBottom: 20 },
  dot:       { display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#22c55e', flexShrink: 0 },
  btn:       { display: 'inline-block', padding: '12px 28px', fontSize: 15, fontWeight: 700, background: '#9945FF', color: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer', width: '100%', marginTop: 4 },
  errBox:    { fontSize: 12, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', marginTop: -8, marginBottom: 16, textAlign: 'left', fontFamily: 'monospace', wordBreak: 'break-all' },
  spinnerLg: { display: 'inline-block', width: 32, height: 32, border: '3px solid #e5e7eb', borderTopColor: '#9945FF', borderRadius: '50%', animation: 'spin 0.7s linear infinite' },
};
