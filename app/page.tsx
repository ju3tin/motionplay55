'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'create' | 'join' | 'view';

interface Competition {
  pubkey: string;
  gameId: number;
  entryFee: number;
  maxParticipants: number;
  startTime: number;
  finishTime: number;
}

const PROGRAM_ID = "2HK29Di58nED836JN14U1bPsxW4q52FLW5knoJEDmYQJ";

// ─── Hydration-safe wallet button ─────────────────────────────────────────────

function ClientWalletButton() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <WalletMultiButton />;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CompetitionPage() {
  const wallet = useWallet();
  const [activeTab, setActiveTab] = useState<Tab>('create');

  return (
    <main style={styles.main}>
      <div style={styles.header}>
        <h1 style={styles.title}>MotionPlay</h1>
        <ClientWalletButton />
      </div>

      <div style={styles.tabs}>
        {(['create', 'join', 'view'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{ ...styles.tab, ...(activeTab === tab ? styles.tabActive : {}) }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div style={styles.panel}>
        {activeTab === 'create' && <CreatePanel wallet={wallet} />}
        {activeTab === 'join'   && <JoinPanel wallet={wallet} />}
        {activeTab === 'view'   && <ViewPanel wallet={wallet} />}
      </div>
    </main>
  );
}

// ─── Create Panel ─────────────────────────────────────────────────────────────

function CreatePanel({ wallet }: { wallet: ReturnType<typeof useWallet> }) {
  const [loading, setLoading]     = useState(false);
  const [status, setStatus]       = useState('');
  const [resultPda, setResultPda] = useState('');

  const [form, setForm] = useState({
    username:        'Justin',
    description:     'Test Competition on Devnet',
    gameId:          '123',
    entryFee:        '0.1',
    maxParticipants: '100',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleCreate = async () => {
    if (!wallet.publicKey) return alert('Connect your wallet first.');
    setLoading(true);
    setStatus('');
    setResultPda('');

    try {
      const { Connection, PublicKey, SystemProgram, clusterApiUrl } = await import('@solana/web3.js');
      const { AnchorProvider, BN, Program }                         = await import('@coral-xyz/anchor');
      const { IDL }                                                  = await import('@/idl1');

      const programId   = new PublicKey(PROGRAM_ID);
      const connection  = new Connection(clusterApiUrl('devnet'), 'confirmed');
      const provider    = new AnchorProvider(connection, wallet as any, { commitment: 'confirmed' });
      const program     = new Program(IDL as any, provider) as any;

      const gameId       = parseInt(form.gameId);
      const randomString = `motion_${Date.now()}`;
      const startTime    = Math.floor(Date.now() / 1000);
      const finishTime   = startTime + 86400;
      const entryFee     = Math.round(parseFloat(form.entryFee) * 1_000_000_000);

      const [compPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('competition'),
          wallet.publicKey.toBuffer(),
          new Uint8Array(new BigUint64Array([BigInt(gameId)]).buffer),
          Buffer.from(randomString),
        ],
        programId
      );

      const [vaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault'), compPda.toBuffer()],
        programId
      );

      const tx = await program.methods
        .createCompetition({
          username:        form.username,
          description:     form.description,
          gameId:          new BN(gameId),
          randomString,
          startTime:       new BN(startTime),
          finishTime:      new BN(finishTime),
          entryFee:        new BN(entryFee),
          maxParticipants: parseInt(form.maxParticipants),
        })
        .accounts({
          creator:       wallet.publicKey,
          competition:   compPda,
          vault:         vaultPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      setResultPda(compPda.toBase58());
      setStatus(`✅ Created! TX: ${tx}`);
    } catch (err: any) {
      setStatus(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 style={styles.panelTitle}>Create Competition</h2>
      <Field label="Username">
        <input name="username" value={form.username} onChange={handleChange} style={styles.input} />
      </Field>
      <Field label="Description">
        <input name="description" value={form.description} onChange={handleChange} style={styles.input} />
      </Field>
      <Field label="Game ID">
        <input name="gameId" type="number" value={form.gameId} onChange={handleChange} style={styles.input} />
      </Field>
      <Field label="Entry Fee (SOL)">
        <input name="entryFee" type="number" step="0.01" value={form.entryFee} onChange={handleChange} style={styles.input} />
      </Field>
      <Field label="Max Participants">
        <input name="maxParticipants" type="number" value={form.maxParticipants} onChange={handleChange} style={styles.input} />
      </Field>
      <SubmitButton onClick={handleCreate} disabled={!wallet.publicKey || loading} loading={loading}>
        Create Competition
      </SubmitButton>
      {status    && <Status text={status} />}
      {resultPda && <p style={styles.meta}><strong>PDA:</strong> {resultPda}</p>}
    </div>
  );
}

// ─── Join Panel ───────────────────────────────────────────────────────────────

function JoinPanel({ wallet }: { wallet: ReturnType<typeof useWallet> }) {
  const [loading, setLoading]         = useState(false);
  const [status, setStatus]           = useState('');
  const [compAddress, setCompAddress] = useState('');

  const handleJoin = async () => {
    if (!wallet.publicKey) return alert('Connect your wallet first.');
    if (!compAddress.trim()) return alert('Enter a competition address.');
    setLoading(true);
    setStatus('');

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
        [Buffer.from('vault'), compPda.toBuffer()],
        programId
      );

      const [participantPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('participant'), compPda.toBuffer(), wallet.publicKey.toBuffer()],
        programId
      );

      const tx = await program.methods
        .joinCompetition()
        .accounts({
          participant:        wallet.publicKey,
          competition:        compPda,
          vault:              vaultPda,
          participantAccount: participantPda,
          systemProgram:      SystemProgram.programId,
        })
        .rpc();

      setStatus(`✅ Joined! TX: ${tx}`);
    } catch (err: any) {
      setStatus(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 style={styles.panelTitle}>Join Competition</h2>
      <Field label="Competition Address (PDA)">
        <input
          value={compAddress}
          onChange={(e) => setCompAddress(e.target.value)}
          placeholder="Enter competition pubkey..."
          style={styles.input}
        />
      </Field>
      <SubmitButton onClick={handleJoin} disabled={!wallet.publicKey || loading} loading={loading}>
        Join Competition
      </SubmitButton>
      {status && <Status text={status} />}
    </div>
  );
}

// ─── View Panel ───────────────────────────────────────────────────────────────

function ViewPanel({ wallet }: { wallet: ReturnType<typeof useWallet> }) {
  const [loading, setLoading]         = useState(false);
  const [status, setStatus]           = useState('');
  const [compAddress, setCompAddress] = useState('');
  const [competition, setCompetition] = useState<Competition | null>(null);

  const handleFetch = async () => {
    if (!compAddress.trim()) return alert('Enter a competition address.');
    setLoading(true);
    setStatus('');
    setCompetition(null);

    try {
      const { Connection, PublicKey, clusterApiUrl } = await import('@solana/web3.js');
      const { AnchorProvider, Program }              = await import('@coral-xyz/anchor');
      const { IDL }                                   = await import('@/idl1');

      const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
      const provider   = new AnchorProvider(
        connection,
        wallet as any ?? { publicKey: null, signTransaction: async (t: any) => t, signAllTransactions: async (t: any) => t },
        { commitment: 'confirmed' }
      );
      const program = new Program(IDL as any, provider) as any;
      const compPda = new PublicKey(compAddress.trim());
      const account = await program.account.competition.fetch(compPda);

      setCompetition({
        pubkey:          compPda.toBase58(),
        gameId:          account.gameId.toNumber(),
        entryFee:        account.entryFee.toNumber() / 1_000_000_000,
        maxParticipants: account.maxParticipants,
        startTime:       account.startTime.toNumber(),
        finishTime:      account.finishTime.toNumber(),
      });
    } catch (err: any) {
      setStatus(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 style={styles.panelTitle}>View Competition</h2>
      <Field label="Competition Address (PDA)">
        <input
          value={compAddress}
          onChange={(e) => setCompAddress(e.target.value)}
          placeholder="Enter competition pubkey..."
          style={styles.input}
        />
      </Field>
      <SubmitButton onClick={handleFetch} disabled={loading} loading={loading}>
        Fetch Competition
      </SubmitButton>
      {status && <Status text={status} />}
      {competition && (
        <div style={styles.card}>
          <Row label="PDA"              value={competition.pubkey} mono />
          <Row label="Game ID"          value={String(competition.gameId)} />
          <Row label="Entry Fee"        value={`${competition.entryFee} SOL`} />
          <Row label="Max Participants" value={String(competition.maxParticipants)} />
          <Row label="Start"            value={new Date(competition.startTime * 1000).toLocaleString()} />
          <Row label="Finish"           value={new Date(competition.finishTime * 1000).toLocaleString()} />
        </div>
      )}
    </div>
  );
}

// ─── Shared Components ────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={styles.label}>{label}</label>
      {children}
    </div>
  );
}

function SubmitButton({
  onClick, disabled, loading, children,
}: {
  onClick: () => void;
  disabled: boolean;
  loading: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ ...styles.button, opacity: disabled ? 0.5 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
    >
      {loading ? 'Processing...' : children}
    </button>
  );
}

function Status({ text }: { text: string }) {
  return <p style={{ ...styles.meta, marginTop: 16, wordBreak: 'break-word' }}>{text}</p>;
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={styles.row}>
      <span style={styles.rowLabel}>{label}</span>
      <span style={{ ...styles.rowValue, fontFamily: mono ? 'monospace' : 'inherit', wordBreak: 'break-all' }}>
        {value}
      </span>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  main:       { maxWidth: 640, margin: '0 auto', padding: '40px 24px', fontFamily: 'Arial, sans-serif' },
  header:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  title:      { fontSize: 28, fontWeight: 700, margin: 0 },
  tabs:       { display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid #e5e7eb', paddingBottom: 0 },
  tab:        { padding: '10px 20px', fontSize: 15, cursor: 'pointer', border: 'none', background: 'none', borderBottom: '2px solid transparent', marginBottom: -1, color: '#6b7280' },
  tabActive:  { borderBottom: '2px solid #9945FF', color: '#9945FF', fontWeight: 600 },
  panel:      { paddingTop: 8 },
  panelTitle: { fontSize: 20, fontWeight: 600, marginBottom: 24, marginTop: 0 },
  label:      { display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6, color: '#374151' },
  input:      { width: '100%', padding: '10px 12px', fontSize: 15, border: '1px solid #d1d5db', borderRadius: 8, boxSizing: 'border-box', outline: 'none' },
  button:     { marginTop: 8, padding: '12px 28px', fontSize: 15, fontWeight: 600, background: '#9945FF', color: '#fff', border: 'none', borderRadius: 8 },
  meta:       { fontSize: 14, color: '#374151' },
  card:       { marginTop: 24, border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' },
  row:        { display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #f3f4f6', fontSize: 14 },
  rowLabel:   { fontWeight: 500, color: '#6b7280', flexShrink: 0, marginRight: 16 },
  rowValue:   { color: '#111827', textAlign: 'right' },
};