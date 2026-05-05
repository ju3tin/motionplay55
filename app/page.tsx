'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

type Tab = 'create' | 'join' | 'score' | 'view';

const PROGRAM_ID = '2HK29Di58nED836JN14U1bPsxW4q52FLW5knoJEDmYQJ';

function ClientWalletButton() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <WalletMultiButton />;
}

export default function CompetitionPage() {
  const wallet = useWallet();
  const [activeTab, setActiveTab] = useState<Tab>('create');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'create', label: 'Create' },
    { key: 'join',   label: 'Join'   },
    { key: 'score',  label: 'Score'  },
    { key: 'view',   label: 'View'   },
  ];

  return (
    <main style={s.main}>
      <div style={s.header}>
        <h1 style={s.title}>MotionPlay</h1>
        <ClientWalletButton />
      </div>

      <div style={s.tabs}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{ ...s.tab, ...(activeTab === t.key ? s.tabActive : {}) }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={s.panel}>
        {activeTab === 'create' && <CreatePanel wallet={wallet} />}
        {activeTab === 'join'   && <JoinPanel   wallet={wallet} />}
        {activeTab === 'score'  && <ScorePanel  wallet={wallet} />}
        {activeTab === 'view'   && <ViewPanel   wallet={wallet} />}
      </div>
    </main>
  );
}

// ─── Create ───────────────────────────────────────────────────────────────────

function CreatePanel({ wallet }: { wallet: ReturnType<typeof useWallet> }) {
  const [loading, setLoading]     = useState(false);
  const [status, setStatus]       = useState('');
  const [resultPda, setResultPda] = useState('');
  const [form, setForm] = useState({
    username: 'Justin', description: 'Test Competition',
    gameId: '123', entryFee: '0.1', maxParticipants: '100',
  });

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleCreate = async () => {
    if (!wallet.publicKey) return alert('Connect wallet first.');
    setLoading(true); setStatus(''); setResultPda('');
    try {
      const { Connection, PublicKey, SystemProgram, clusterApiUrl } = await import('@solana/web3.js');
      const { AnchorProvider, BN, Program }                         = await import('@coral-xyz/anchor');
      const { IDL }                                                  = await import('@/idl1');

      const programId  = new PublicKey(PROGRAM_ID);
      const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
      const provider   = new AnchorProvider(connection, wallet as any, { commitment: 'confirmed' });
      const program    = new Program(IDL as any, provider) as any;

      const gameId       = parseInt(form.gameId);
      const randomString = `motion_${Date.now()}`;
      const startTime    = Math.floor(Date.now() / 1000);
      const finishTime   = startTime + 86400;
      const entryFee     = Math.round(parseFloat(form.entryFee) * 1_000_000_000);

      const [compPda] = PublicKey.findProgramAddressSync([
        Buffer.from('competition'), wallet.publicKey.toBuffer(),
        new Uint8Array(new BigUint64Array([BigInt(gameId)]).buffer),
        Buffer.from(randomString),
      ], programId);

      const [vaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault'), compPda.toBuffer()], programId
      );

      const tx = await program.methods
        .createCompetition({
          username: form.username, description: form.description,
          gameId: new BN(gameId), randomString,
          startTime: new BN(startTime), finishTime: new BN(finishTime),
          entryFee: new BN(entryFee), maxParticipants: parseInt(form.maxParticipants),
        })
        .accounts({ creator: wallet.publicKey, competition: compPda,
          vault: vaultPda, systemProgram: SystemProgram.programId })
        .rpc();

      setResultPda(compPda.toBase58());
      setStatus(`✅ Created! TX: ${tx}`);
    } catch (e: any) { setStatus(`❌ ${e.message}`); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <h2 style={s.panelTitle}>Create Competition</h2>
      <Field label="Username"><input name="username" value={form.username} onChange={onChange} style={s.input} /></Field>
      <Field label="Description"><input name="description" value={form.description} onChange={onChange} style={s.input} /></Field>
      <Field label="Game ID"><input name="gameId" type="number" value={form.gameId} onChange={onChange} style={s.input} /></Field>
      <Field label="Entry Fee (SOL)"><input name="entryFee" type="number" step="0.01" value={form.entryFee} onChange={onChange} style={s.input} /></Field>
      <Field label="Max Participants"><input name="maxParticipants" type="number" value={form.maxParticipants} onChange={onChange} style={s.input} /></Field>
      <Btn onClick={handleCreate} disabled={!wallet.publicKey || loading} loading={loading}>Create Competition</Btn>
      {status    && <Status text={status} />}
      {resultPda && <p style={s.meta}><strong>PDA:</strong> {resultPda}</p>}
    </div>
  );
}

// ─── Join ─────────────────────────────────────────────────────────────────────

function JoinPanel({ wallet }: { wallet: ReturnType<typeof useWallet> }) {
  const [loading, setLoading]         = useState(false);
  const [status, setStatus]           = useState('');
  const [compAddress, setCompAddress] = useState('');

  const handleJoin = async () => {
    if (!wallet.publicKey) return alert('Connect wallet first.');
    if (!compAddress.trim()) return alert('Enter competition address.');
    setLoading(true); setStatus('');
    try {
      const { Connection, PublicKey, SystemProgram, clusterApiUrl } = await import('@solana/web3.js');
      const { AnchorProvider, Program }                             = await import('@coral-xyz/anchor');
      const { IDL }                                                  = await import('@/idl1');

      const programId  = new PublicKey(PROGRAM_ID);
      const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
      const provider   = new AnchorProvider(connection, wallet as any, { commitment: 'confirmed' });
      const program    = new Program(IDL as any, provider) as any;
      const compPda    = new PublicKey(compAddress.trim());

      const [vaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault'), compPda.toBuffer()], programId
      );
      const [entryPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('entry'), compPda.toBuffer(), wallet.publicKey.toBuffer()], programId
      );

      const tx = await program.methods.enter()
        .accounts({ player: wallet.publicKey, competition: compPda,
          playerEntry: entryPda, vault: vaultPda, systemProgram: SystemProgram.programId })
        .rpc();

      setStatus(`✅ Joined! TX: ${tx}`);
    } catch (e: any) { setStatus(`❌ ${e.message}`); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <h2 style={s.panelTitle}>Join Competition</h2>
      <Field label="Competition Address (PDA)">
        <input value={compAddress} onChange={e => setCompAddress(e.target.value)}
          placeholder="Enter competition pubkey..." style={s.input} />
      </Field>
      <Btn onClick={handleJoin} disabled={!wallet.publicKey || loading} loading={loading}>Join</Btn>
      {status && <Status text={status} />}
    </div>
  );
}

// ─── Score ────────────────────────────────────────────────────────────────────

function ScorePanel({ wallet }: { wallet: ReturnType<typeof useWallet> }) {
  const [loading, setLoading]         = useState(false);
  const [status, setStatus]           = useState('');
  const [compAddress, setCompAddress] = useState('');
  const [score, setScore]             = useState('');
  const [currentBest, setCurrentBest] = useState<number | null>(null);
  const [scoreCount, setScoreCount]   = useState<number | null>(null);
  const [fetching, setFetching]       = useState(false);

  // Load current entry when competition address is entered
  const loadEntry = async (address: string) => {
    if (!wallet.publicKey || !address.trim()) return;
    setFetching(true);
    try {
      const { Connection, PublicKey, clusterApiUrl } = await import('@solana/web3.js');
      const { AnchorProvider, Program }              = await import('@coral-xyz/anchor');
      const { IDL }                                   = await import('@/idl1');

      const programId  = new PublicKey(PROGRAM_ID);
      const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
      const provider   = new AnchorProvider(connection, wallet as any, { commitment: 'confirmed' });
      const program    = new Program(IDL as any, provider) as any;
      const compPda    = new PublicKey(address.trim());

      const [entryPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('entry'), compPda.toBuffer(), wallet.publicKey.toBuffer()], programId
      );

      const entry = await program.account.playerEntry.fetch(entryPda);
      setCurrentBest(entry.bestScore.toNumber());
      setScoreCount(entry.scoreCount);
    } catch {
      setCurrentBest(null);
      setScoreCount(null);
    } finally {
      setFetching(false);
    }
  };

  const handleAddressBlur = () => loadEntry(compAddress);

  const handleSubmit = async () => {
    if (!wallet.publicKey) return alert('Connect wallet first.');
    if (!compAddress.trim()) return alert('Enter competition address.');
    if (!score || isNaN(Number(score)) || Number(score) < 0) return alert('Enter a valid score.');
    setLoading(true); setStatus('');
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
        .submitScore(new BN(parseInt(score)))
        .accounts({ competition: compPda, playerEntry: entryPda, player: wallet.publicKey })
        .rpc();

      const submitted = parseInt(score);
      const isNewBest = currentBest === null || submitted > currentBest;

      setStatus(
        isNewBest
          ? `✅ New best score: ${submitted}! TX: ${tx}`
          : `✅ Score submitted (best stays ${currentBest}). TX: ${tx}`
      );
      setScore('');

      // Refresh entry stats
      await loadEntry(compAddress);
    } catch (e: any) { setStatus(`❌ ${e.message}`); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <h2 style={s.panelTitle}>Submit Score</h2>

      <Field label="Competition Address (PDA)">
        <input
          value={compAddress}
          onChange={e => setCompAddress(e.target.value)}
          onBlur={handleAddressBlur}
          placeholder="Enter competition pubkey..."
          style={s.input}
        />
      </Field>

      {/* Current entry stats */}
      {fetching && <p style={{ ...s.meta, color: '#9ca3af' }}>Loading your entry...</p>}
      {!fetching && currentBest !== null && (
        <div style={s.statBox}>
          <div style={s.statItem}>
            <span style={s.statLabel}>Your Best Score</span>
            <span style={s.statValue}>{currentBest}</span>
          </div>
          <div style={s.statDivider} />
          <div style={s.statItem}>
            <span style={s.statLabel}>Total Submissions</span>
            <span style={s.statValue}>{scoreCount}</span>
          </div>
        </div>
      )}
      {!fetching && currentBest === null && compAddress.trim() && wallet.publicKey && (
        <p style={{ ...s.meta, color: '#f59e0b', marginBottom: 16 }}>
          ⚠️ No entry found — make sure you've joined this competition first.
        </p>
      )}

      <Field label="Your Score">
        <input
          type="number"
          value={score}
          onChange={e => setScore(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="Enter your score..."
          style={s.input}
          min="0"
        />
      </Field>

      <p style={{ ...s.meta, color: '#6b7280', marginBottom: 16 }}>
        Submit as many times as you like before the competition ends — only your highest score counts.
      </p>

      <Btn onClick={handleSubmit} disabled={!wallet.publicKey || loading} loading={loading}>
        Submit Score
      </Btn>

      {status && <Status text={status} />}
    </div>
  );
}

// ─── View ─────────────────────────────────────────────────────────────────────

function ViewPanel({ wallet }: { wallet: ReturnType<typeof useWallet> }) {
  const [compAddress, setCompAddress] = useState('');
  const [comp, setComp]               = useState<any | null>(null);
  const [entries, setEntries]         = useState<any[]>([]);
  const [loading, setLoading]         = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);
  const [status, setStatus]           = useState('');

  const isWinner = comp && wallet.publicKey && comp.winner === wallet.publicKey.toBase58();

  const handleFetch = async () => {
    if (!compAddress.trim()) return alert('Enter competition address.');
    setLoading(true); setStatus(''); setComp(null); setEntries([]);
    try {
      const { Connection, PublicKey, clusterApiUrl } = await import('@solana/web3.js');
      const { AnchorProvider, Program }              = await import('@coral-xyz/anchor');
      const { IDL }                                   = await import('@/idl1');

      const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
      const provider   = new AnchorProvider(connection, wallet as any ??
        { publicKey: null, signTransaction: async (t: any) => t, signAllTransactions: async (t: any) => t },
        { commitment: 'confirmed' });
      const program  = new Program(IDL as any, provider) as any;
      const compPda  = new PublicKey(compAddress.trim());
      const account  = await program.account.competition.fetch(compPda);

      setComp({
        pubkey:              compPda.toBase58(),
        description:         account.description,
        entryFee:            account.entryFee.toNumber() / 1e9,
        maxParticipants:     account.maxParticipants,
        currentParticipants: account.currentParticipants,
        totalPrize:          account.totalPrize.toNumber() / 1e9,
        finishTime:          account.finishTime.toNumber(),
        status:              account.status.ended ? 'ended' : account.status.cancelled ? 'cancelled' : 'active',
        winner:              account.winner.toBase58(),
      });

      const allEntries = await program.account.playerEntry.all([
        { memcmp: { offset: 8 + 32, bytes: compPda.toBase58() } },
      ]);

      const mapped = allEntries
        .map(({ account: e }: any) => ({
          player:     e.player.toBase58(),
          bestScore:  e.bestScore.toNumber(),
          scoreCount: e.scoreCount,
        }))
        .sort((a: any, b: any) => b.bestScore - a.bestScore);

      setEntries(mapped);
    } catch (e: any) { setStatus(`❌ ${e.message}`); }
    finally { setLoading(false); }
  };

  const handleClaim = async () => {
    if (!wallet.publicKey) return alert('Connect wallet first.');
    setClaimLoading(true); setStatus('');
    try {
      const { Connection, PublicKey, SystemProgram, clusterApiUrl } = await import('@solana/web3.js');
      const { AnchorProvider, Program }                             = await import('@coral-xyz/anchor');
      const { IDL }                                                  = await import('@/idl1');

      const programId  = new PublicKey(PROGRAM_ID);
      const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
      const provider   = new AnchorProvider(connection, wallet as any, { commitment: 'confirmed' });
      const program    = new Program(IDL as any, provider) as any;
      const compPda    = new PublicKey(compAddress.trim());

      const [vaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault'), compPda.toBuffer()], programId
      );

      const tx = await program.methods.claimPrize()
        .accounts({ competition: compPda, claimant: wallet.publicKey,
          vault: vaultPda, systemProgram: SystemProgram.programId })
        .rpc();

      setStatus(`✅ Prize claimed! TX: ${tx}`);
    } catch (e: any) { setStatus(`❌ ${e.message}`); }
    finally { setClaimLoading(false); }
  };

  const medal = (i: number) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`;

  return (
    <div>
      <h2 style={s.panelTitle}>View Competition</h2>

      <Field label="Competition Address (PDA)">
        <input value={compAddress} onChange={e => setCompAddress(e.target.value)}
          placeholder="Enter competition pubkey..." style={s.input} />
      </Field>
      <Btn onClick={handleFetch} disabled={loading} loading={loading}>Fetch</Btn>

      {status && <Status text={status} />}

      {comp && (
        <>
          <div style={{ ...s.card, marginTop: 24 }}>
            <Row label="Description" value={comp.description} />
            <Row label="Status"      value={comp.status.toUpperCase()} />
            <Row label="Prize Pool"  value={`${comp.totalPrize} SOL`} />
            <Row label="Entry Fee"   value={`${comp.entryFee} SOL`} />
            <Row label="Players"     value={`${comp.currentParticipants} / ${comp.maxParticipants}`} />
            <Row label="Ends"        value={new Date(comp.finishTime * 1000).toLocaleString()} />
            {comp.status === 'ended' && <Row label="Winner" value={comp.winner} mono />}
          </div>

          {comp.status === 'ended' && isWinner && (
            <div style={{ ...s.card, marginTop: 16, background: '#f0fdf4', borderColor: '#86efac' }}>
              <div style={{ padding: 20, textAlign: 'center' }}>
                <p style={{ margin: '0 0 12px', fontWeight: 600, color: '#15803d', fontSize: 18 }}>
                  🏆 You won {comp.totalPrize} SOL!
                </p>
                <Btn onClick={handleClaim} disabled={claimLoading} loading={claimLoading}>
                  Claim Prize
                </Btn>
              </div>
            </div>
          )}

          {entries.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600 }}>Leaderboard</h3>
              <div style={s.card}>
                <div style={{ ...s.lbRow, background: '#f9fafb', fontWeight: 600, color: '#6b7280', fontSize: 12, textTransform: 'uppercase' }}>
                  <span style={{ width: 32 }}>#</span>
                  <span style={{ flex: 1 }}>Player</span>
                  <span style={{ width: 90, textAlign: 'right' }}>Best Score</span>
                  <span style={{ width: 60, textAlign: 'right' }}>Tries</span>
                </div>
                {entries.map((e, i) => (
                  <div key={e.player} style={{
                    ...s.lbRow,
                    background: e.player === wallet.publicKey?.toBase58() ? '#faf5ff' : 'white',
                  }}>
                    <span style={{ width: 32 }}>{medal(i)}</span>
                    <span style={{ flex: 1, fontFamily: 'monospace', fontSize: 13 }}>
                      {e.player.slice(0, 8)}...{e.player.slice(-4)}
                      {e.player === wallet.publicKey?.toBase58() &&
                        <span style={{ color: '#9945FF', marginLeft: 6, fontSize: 11, fontFamily: 'Arial' }}>you</span>}
                    </span>
                    <span style={{ width: 90, textAlign: 'right', fontWeight: 700 }}>{e.bestScore}</span>
                    <span style={{ width: 60, textAlign: 'right', color: '#9ca3af', fontSize: 13 }}>{e.scoreCount}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Shared ───────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={s.label}>{label}</label>
      {children}
    </div>
  );
}

function Btn({ onClick, disabled, loading, children }: {
  onClick: () => void; disabled: boolean; loading: boolean; children: React.ReactNode;
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ ...s.button, opacity: disabled ? 0.5 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}>
      {loading ? 'Processing...' : children}
    </button>
  );
}

function Status({ text }: { text: string }) {
  return <p style={{ ...s.meta, marginTop: 16, wordBreak: 'break-word' }}>{text}</p>;
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={s.row}>
      <span style={s.rowLabel}>{label}</span>
      <span style={{ ...s.rowValue, fontFamily: mono ? 'monospace' : 'inherit', wordBreak: 'break-all' }}>
        {value}
      </span>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  main:       { maxWidth: 640, margin: '0 auto', padding: '40px 24px', fontFamily: 'Arial, sans-serif' },
  header:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  title:      { fontSize: 28, fontWeight: 700, margin: 0 },
  tabs:       { display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid #e5e7eb' },
  tab:        { padding: '10px 20px', fontSize: 15, cursor: 'pointer', border: 'none', background: 'none', borderBottom: '2px solid transparent', marginBottom: -1, color: '#6b7280' },
  tabActive:  { borderBottom: '2px solid #9945FF', color: '#9945FF', fontWeight: 600 },
  panel:      { paddingTop: 8 },
  panelTitle: { fontSize: 20, fontWeight: 600, marginBottom: 24, marginTop: 0 },
  label:      { display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6, color: '#374151' },
  input:      { width: '100%', padding: '10px 12px', fontSize: 15, border: '1px solid #d1d5db', borderRadius: 8, boxSizing: 'border-box', outline: 'none' },
  button:     { padding: '10px 24px', fontSize: 15, fontWeight: 600, background: '#9945FF', color: '#fff', border: 'none', borderRadius: 8 },
  meta:       { fontSize: 14, color: '#374151', margin: 0 },
  card:       { border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' },
  row:        { display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #f3f4f6', fontSize: 14 },
  rowLabel:   { fontWeight: 500, color: '#6b7280', width: 120, flexShrink: 0 },
  rowValue:   { color: '#111827', flex: 1, textAlign: 'right' },
  lbRow:      { display: 'flex', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid #f3f4f6', fontSize: 14, gap: 8 },
  statBox:    { display: 'flex', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', marginBottom: 20 },
  statItem:   { flex: 1, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 4 },
  statDivider:{ width: 1, background: '#e5e7eb' },
  statLabel:  { fontSize: 12, color: '#6b7280', fontWeight: 500, textTransform: 'uppercase' as const },
  statValue:  { fontSize: 24, fontWeight: 700, color: '#9945FF' },
};
