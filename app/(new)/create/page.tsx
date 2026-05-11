'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

const PROGRAM_ID = '2HK29Di58nED836JN14U1bPsxW4q52FLW5knoJEDmYQJ';

// ── Game registry — add your games here ──────────────────────────────────────
const GAMES = [
  { id: 1,  name: 'Dodge Body'       },
  { id: 2,  name: 'Pose Match'       },
  { id: 3,  name: 'Shadow Runner'    },
  // add more as you build them
];

function ClientWalletButton() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <WalletMultiButton />;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function toLocalDatetimeValue(date: Date) {
  // Returns "YYYY-MM-DDTHH:MM" for <input type="datetime-local">
  const pad  = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function defaultStart() {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 5, 0, 0);
  return toLocalDatetimeValue(d);
}

function defaultFinish() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setMinutes(d.getMinutes() + 5, 0, 0);
  return toLocalDatetimeValue(d);
}

function durationLabel(startVal: string, finishVal: string) {
  if (!startVal || !finishVal) return null;
  const diff = (new Date(finishVal).getTime() - new Date(startVal).getTime()) / 1000;
  if (diff <= 0) return null;
  const d = Math.floor(diff / 86400);
  const h = Math.floor((diff % 86400) / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  return parts.join(' ') || '<1m';
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CreateChallengePage() {
  const wallet = useWallet();

  const [form, setForm] = useState({
    username:        '',
    description:     '',
    gameId:          GAMES[0]?.id ?? 1,
    entryFee:        '0.1',
    maxParticipants: '100',
    startTime:       defaultStart(),
    finishTime:      defaultFinish(),
  });

  const [loading,   setLoading]   = useState(false);
  const [status,    setStatus]    = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [resultPda, setResultPda] = useState('');
  const [copied,    setCopied]    = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  // Keep finish always after start
  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStart = e.target.value;
    setForm(f => {
      const startMs  = new Date(newStart).getTime();
      const finishMs = new Date(f.finishTime).getTime();
      const newFinish = finishMs <= startMs
        ? toLocalDatetimeValue(new Date(startMs + 60 * 60 * 1000)) // +1 hour
        : f.finishTime;
      return { ...f, startTime: newStart, finishTime: newFinish };
    });
  };

  const duration = durationLabel(form.startTime, form.finishTime);

  const validate = () => {
    if (!form.description.trim()) return 'Enter a challenge name.';
    if (!form.username.trim())    return 'Enter a display name.';
    const fee = parseFloat(form.entryFee);
    if (isNaN(fee) || fee < 0)   return 'Entry fee must be 0 or more SOL.';
    const max = parseInt(form.maxParticipants);
    if (isNaN(max) || max < 2)   return 'Need at least 2 participants.';
    if (!form.startTime)          return 'Pick a start time.';
    if (!form.finishTime)         return 'Pick a finish time.';
    const start  = new Date(form.startTime).getTime();
    const finish = new Date(form.finishTime).getTime();
    if (finish <= start)          return 'Finish time must be after start time.';
    return null;
  };

  const handleCreate = async () => {
    const err = validate();
    if (err) { setStatus({ type: 'error', msg: err }); return; }
    if (!wallet.publicKey) { setStatus({ type: 'error', msg: 'Connect your wallet first.' }); return; }

    setLoading(true); setStatus(null); setResultPda('');
    try {
      const { Connection, PublicKey, SystemProgram, clusterApiUrl } = await import('@solana/web3.js');
      const { AnchorProvider, BN, Program }                         = await import('@coral-xyz/anchor');
      const { IDL }                                                  = await import('@/idl1');

      const programId  = new PublicKey(PROGRAM_ID);
      const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
      const provider   = new AnchorProvider(connection, wallet as any, { commitment: 'confirmed' });
      const program    = new Program(IDL as any, provider) as any;

      const gameId       = Number(form.gameId);
      const randomString = `mp_${Date.now()}`;
      const startTime    = Math.floor(new Date(form.startTime).getTime()  / 1000);
      const finishTime   = Math.floor(new Date(form.finishTime).getTime() / 1000);
      const entryFee     = Math.round(parseFloat(form.entryFee) * 1_000_000_000);

      const [compPda] = PublicKey.findProgramAddressSync([
        Buffer.from('competition'),
        wallet.publicKey.toBuffer(),
        new Uint8Array(new BigUint64Array([BigInt(gameId)]).buffer),
        Buffer.from(randomString),
      ], programId);

      const [vaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault'), compPda.toBuffer()], programId
      );

      await program.methods
        .createCompetition({
          username:        form.username.trim(),
          description:     form.description.trim(),
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
      setStatus({ type: 'success', msg: 'Challenge created on devnet!' });
    } catch (e: any) {
      setStatus({ type: 'error', msg: e.message });
    } finally {
      setLoading(false);
    }
  };

  const copyPda = () => {
    navigator.clipboard.writeText(resultPda);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const playUrl  = resultPda ? `/play?comp=${encodeURIComponent(resultPda)}&gameId=${form.gameId}` : '';
  const shareUrl = resultPda ? `${typeof window !== 'undefined' ? window.location.origin : ''}/play?comp=${encodeURIComponent(resultPda)}&gameId=${form.gameId}` : '';

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <main style={s.main}>
      {/* Header */}
      <div style={s.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a href="/competitions" style={s.backBtn}>← Back</a>
          <div>
            <h1 style={s.title}>Create Challenge</h1>
            <p style={s.subtitle}>Set up a new MotionPlay competition</p>
          </div>
        </div>
        <ClientWalletButton />
      </div>

      <div style={s.body}>
        {/* ── Form ──────────────────────────────────────────────────────────── */}
        <div style={s.formCol}>

          {/* Section: Identity */}
          <Section label="Identity">
            <Field label="Your Display Name" hint="Shown on leaderboard">
              <input
                value={form.username}
                onChange={set('username')}
                placeholder="e.g. Justin"
                style={s.input}
                maxLength={32}
              />
            </Field>
            <Field label="Challenge Name" hint="Visible to all players">
              <input
                value={form.description}
                onChange={set('description')}
                placeholder="e.g. Friday Speed Run"
                style={s.input}
                maxLength={64}
              />
            </Field>
          </Section>

          {/* Section: Game */}
          <Section label="Game">
            <Field label="Select Game" hint="Which game players will compete in">
              <select value={form.gameId} onChange={set('gameId')} style={s.select}>
                {GAMES.map(g => (
                  <option key={g.id} value={g.id}>#{g.id} — {g.name}</option>
                ))}
              </select>
            </Field>
          </Section>

          {/* Section: Schedule */}
          <Section label="Schedule">
            <div style={s.dateRow}>
              <Field label="Start Date & Time" hint="When players can begin">
                <input
                  type="datetime-local"
                  value={form.startTime}
                  onChange={handleStartChange}
                  min={toLocalDatetimeValue(new Date())}
                  style={s.input}
                />
              </Field>
              <Field label="Finish Date & Time" hint="When scoring closes">
                <input
                  type="datetime-local"
                  value={form.finishTime}
                  onChange={set('finishTime')}
                  min={form.startTime}
                  style={s.input}
                />
              </Field>
            </div>
            {duration && (
              <div style={s.durationPill}>
                ⏱ Duration: <strong>{duration}</strong>
              </div>
            )}
            {/* Quick presets */}
            <div style={s.presets}>
              <span style={s.presetLabel}>Quick finish:</span>
              {[
                { label: '1 hour',  hours: 1  },
                { label: '6 hours', hours: 6  },
                { label: '1 day',   hours: 24 },
                { label: '3 days',  hours: 72 },
                { label: '1 week',  hours: 168 },
              ].map(({ label, hours }) => (
                <button key={label} style={s.presetBtn} onClick={() => {
                  const startMs = form.startTime ? new Date(form.startTime).getTime() : Date.now();
                  setForm(f => ({ ...f, finishTime: toLocalDatetimeValue(new Date(startMs + hours * 3600 * 1000)) }));
                }}>
                  {label}
                </button>
              ))}
            </div>
          </Section>

          {/* Section: Entry */}
          <Section label="Entry Settings">
            <div style={s.dateRow}>
              <Field label="Entry Fee (SOL)" hint="0 for free entry">
                <div style={s.inputGroup}>
                  <input
                    type="number"
                    value={form.entryFee}
                    onChange={set('entryFee')}
                    min="0"
                    step="0.01"
                    style={{ ...s.input, paddingRight: 44 }}
                  />
                  <span style={s.inputSuffix}>SOL</span>
                </div>
              </Field>
              <Field label="Max Participants" hint="How many players can join">
                <input
                  type="number"
                  value={form.maxParticipants}
                  onChange={set('maxParticipants')}
                  min="2"
                  max="10000"
                  style={s.input}
                />
              </Field>
            </div>
            {parseFloat(form.entryFee) > 0 && !isNaN(parseInt(form.maxParticipants)) && (
              <div style={s.prizePreview}>
                <span style={s.prizePreviewLabel}>Max prize pool</span>
                <span style={s.prizePreviewValue}>
                  {(parseFloat(form.entryFee) * parseInt(form.maxParticipants)).toFixed(2)} SOL
                </span>
              </div>
            )}
          </Section>

          {/* Status */}
          {status && (
            <div style={{ ...s.statusBox, ...(status.type === 'success' ? s.statusSuccess : s.statusError) }}>
              {status.type === 'success' ? '✅' : '⚠'} {status.msg}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleCreate}
            disabled={loading || !wallet.publicKey}
            style={{
              ...s.submitBtn,
              opacity: (loading || !wallet.publicKey) ? 0.5 : 1,
              cursor:  (loading || !wallet.publicKey) ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <span style={s.spinner} /> Creating…
              </span>
            ) : !wallet.publicKey ? 'Connect Wallet to Create' : 'Create Challenge'}
          </button>

          {!wallet.publicKey && (
            <p style={s.walletHint}>Connect your Solana wallet using the button above.</p>
          )}
        </div>

        {/* ── Preview / Result sidebar ──────────────────────────────────────── */}
        <div style={s.sidebar}>

          {/* Live preview */}
          <div style={s.previewCard}>
            <p style={s.previewTitle}>Preview</p>

            <div style={s.previewTop}>
              <span style={s.previewPill}>● Live</span>
              {form.gameId && (
                <span style={s.previewGameBadge}>
                  Game #{form.gameId} — {GAMES.find(g => g.id === Number(form.gameId))?.name ?? 'Unknown'}
                </span>
              )}
            </div>

            <h3 style={s.previewName}>
              {form.description.trim() || <span style={{ color: '#d1d5db' }}>Challenge name…</span>}
            </h3>

            <div style={s.previewPrizeRow}>
              <span style={s.previewPrizeLabel}>Max Prize</span>
              <span style={s.previewPrizeValue}>
                {parseFloat(form.entryFee) > 0 && !isNaN(parseInt(form.maxParticipants))
                  ? `${(parseFloat(form.entryFee) * parseInt(form.maxParticipants)).toFixed(2)} SOL`
                  : 'Free'}
              </span>
            </div>

            <div style={s.previewStats}>
              <PreviewStat label="Entry"    value={`${form.entryFee || '0'} SOL`} />
              <PreviewStat label="Max"      value={`${form.maxParticipants || '—'} players`} />
              <PreviewStat label="Duration" value={duration ?? '—'} />
            </div>

            <div style={s.previewDates}>
              <PreviewDate label="Starts" value={form.startTime  ? new Date(form.startTime).toLocaleString()  : '—'} />
              <PreviewDate label="Ends"   value={form.finishTime ? new Date(form.finishTime).toLocaleString() : '—'} />
            </div>

            <div style={s.previewCreator}>
              <span style={s.previewCreatorLabel}>Created by</span>
              <span style={s.previewCreatorVal}>
                {form.username.trim() || <span style={{ color: '#d1d5db' }}>your name…</span>}
              </span>
            </div>
          </div>

          {/* Result after creation */}
          {resultPda && (
            <div style={s.resultCard}>
              <p style={s.resultTitle}>🎉 Challenge Created!</p>

              <p style={s.resultLabel}>Competition Address</p>
              <div style={s.pdaRow}>
                <code style={s.pdaCode}>{resultPda.slice(0, 12)}…{resultPda.slice(-8)}</code>
                <button onClick={copyPda} style={s.copyBtn}>{copied ? '✓ Copied' : 'Copy'}</button>
              </div>

              <div style={s.resultActions}>
                <a href={playUrl} style={s.playBtn}>▶ Play Now</a>
                <button onClick={() => { navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                  style={s.shareBtn}>
                  {copied ? '✓ Copied link' : '🔗 Copy Share Link'}
                </button>
              </div>

              <a href="/competitions" style={s.viewAllLink}>View all competitions →</a>
            </div>
          )}

          {/* Tips */}
          <div style={s.tipsCard}>
            <p style={s.tipsTitle}>Tips</p>
            <ul style={s.tipsList}>
              <li>Set a start time in the future so players have time to join before scoring opens.</li>
              <li>Higher entry fees = bigger prize pools but fewer entrants.</li>
              <li>Shorter competitions (1–6 hours) tend to drive more engagement.</li>
              <li>Share the play link after creating — players who join will see a ▶ Play Now button.</li>
            </ul>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={s.section}>
      <p style={s.sectionLabel}>{label}</p>
      {children}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={s.field}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <label style={s.fieldLabel}>{label}</label>
        {hint && <span style={s.fieldHint}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function PreviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={s.previewStat}>
      <span style={s.previewStatLabel}>{label}</span>
      <span style={s.previewStatVal}>{value}</span>
    </div>
  );
}

function PreviewDate({ label, value }: { label: string; value: string }) {
  return (
    <div style={s.previewDate}>
      <span style={s.previewDateLabel}>{label}</span>
      <span style={s.previewDateVal}>{value}</span>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  main:     { maxWidth: 1100, margin: '0 auto', padding: '32px 24px', fontFamily: 'Arial, sans-serif', minHeight: '100vh' },
  header:   { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 },
  title:    { fontSize: 22, fontWeight: 700, margin: '0 0 2px' },
  subtitle: { fontSize: 13, color: '#6b7280', margin: 0 },
  backBtn:  { fontSize: 14, color: '#6b7280', textDecoration: 'none', padding: '6px 12px', border: '1px solid #e5e7eb', borderRadius: 8, whiteSpace: 'nowrap' as const },

  body:     { display: 'grid', gridTemplateColumns: '1fr 320px', gap: 28, alignItems: 'start' },
  formCol:  { display: 'flex', flexDirection: 'column' as const, gap: 0 },

  section:      { border: '1px solid #e5e7eb', borderRadius: 14, padding: '20px 20px 4px', marginBottom: 16, background: '#fff' },
  sectionLabel: { fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: '#9ca3af', margin: '0 0 16px' },

  field:      { marginBottom: 16 },
  fieldLabel: { fontSize: 14, fontWeight: 500, color: '#374151' },
  fieldHint:  { fontSize: 12, color: '#9ca3af' },

  input:  { width: '100%', padding: '10px 12px', fontSize: 14, border: '1px solid #d1d5db', borderRadius: 8, boxSizing: 'border-box' as const, outline: 'none', fontFamily: 'Arial, sans-serif', color: '#111827', background: '#fff' },
  select: { width: '100%', padding: '10px 12px', fontSize: 14, border: '1px solid #d1d5db', borderRadius: 8, boxSizing: 'border-box' as const, outline: 'none', background: '#fff', cursor: 'pointer', color: '#111827' },

  inputGroup:  { position: 'relative' as const },
  inputSuffix: { position: 'absolute' as const, right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#9ca3af', fontWeight: 600, pointerEvents: 'none' as const },

  dateRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },

  durationPill: { display: 'inline-block', background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: 100, fontSize: 13, padding: '5px 14px', marginBottom: 12 },

  presets:     { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' as const, marginBottom: 4 },
  presetLabel: { fontSize: 12, color: '#9ca3af', marginRight: 2 },
  presetBtn:   { fontSize: 12, padding: '4px 10px', border: '1px solid #e5e7eb', borderRadius: 100, background: '#f9fafb', cursor: 'pointer', color: '#374151', fontWeight: 500 },

  prizePreview:      { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 10, padding: '10px 14px', marginTop: 4, marginBottom: 4 },
  prizePreviewLabel: { fontSize: 13, color: '#7c3aed', fontWeight: 500 },
  prizePreviewValue: { fontSize: 18, fontWeight: 700, color: '#9945FF' },

  statusBox:     { padding: '12px 16px', borderRadius: 10, fontSize: 14, marginBottom: 16, lineHeight: 1.5 },
  statusSuccess: { background: '#f0fdf4', border: '1px solid #86efac', color: '#15803d' },
  statusError:   { background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626' },

  submitBtn: { width: '100%', padding: '14px', fontSize: 16, fontWeight: 700, background: '#9945FF', color: '#fff', border: 'none', borderRadius: 10, marginBottom: 8 },
  walletHint: { textAlign: 'center' as const, fontSize: 13, color: '#9ca3af', margin: 0 },
  spinner:    { display: 'inline-block', width: 14, height: 14, border: '2px solid #ffffff44', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' },

  // Sidebar
  sidebar: { display: 'flex', flexDirection: 'column' as const, gap: 16, position: 'sticky' as const, top: 24 },

  previewCard:       { border: '1px solid #e5e7eb', borderRadius: 14, padding: '18px', background: '#fff' },
  previewTitle:      { fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: '#9ca3af', margin: '0 0 14px' },
  previewTop:        { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 },
  previewPill:       { fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 100, background: '#dcfce7', color: '#15803d' },
  previewGameBadge:  { fontSize: 11, fontWeight: 500, padding: '3px 8px', borderRadius: 100, background: '#f3f4f6', color: '#374151' },
  previewName:       { fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 14px', lineHeight: 1.3, minHeight: 22 },
  previewPrizeRow:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#faf5ff', borderRadius: 10, padding: '10px 12px', marginBottom: 12 },
  previewPrizeLabel: { fontSize: 12, color: '#7c3aed', fontWeight: 500, textTransform: 'uppercase' as const },
  previewPrizeValue: { fontSize: 18, fontWeight: 700, color: '#9945FF' },
  previewStats:      { display: 'flex', border: '1px solid #f3f4f6', borderRadius: 10, overflow: 'hidden', marginBottom: 12 },
  previewStat:       { flex: 1, padding: '8px 10px', display: 'flex', flexDirection: 'column' as const, gap: 2, borderRight: '1px solid #f3f4f6' },
  previewStatLabel:  { fontSize: 10, color: '#9ca3af', textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
  previewStatVal:    { fontSize: 13, fontWeight: 600, color: '#111827' },
  previewDates:      { display: 'flex', flexDirection: 'column' as const, gap: 6, marginBottom: 12 },
  previewDate:       { display: 'flex', justifyContent: 'space-between', fontSize: 13 },
  previewDateLabel:  { color: '#6b7280', fontWeight: 500 },
  previewDateVal:    { color: '#111827' },
  previewCreator:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid #f3f4f6', fontSize: 13 },
  previewCreatorLabel:{ color: '#9ca3af' },
  previewCreatorVal: { fontWeight: 600, color: '#374151' },

  resultCard:    { border: '1px solid #86efac', borderRadius: 14, padding: '18px', background: '#f0fdf4' },
  resultTitle:   { fontSize: 15, fontWeight: 700, color: '#15803d', margin: '0 0 14px' },
  resultLabel:   { fontSize: 12, color: '#6b7280', margin: '0 0 6px', fontWeight: 500 },
  pdaRow:        { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 },
  pdaCode:       { flex: 1, fontFamily: 'monospace', fontSize: 12, background: '#fff', border: '1px solid #d1fae5', borderRadius: 6, padding: '6px 10px', color: '#065f46', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const },
  copyBtn:       { padding: '6px 12px', fontSize: 12, fontWeight: 600, background: '#fff', border: '1px solid #86efac', borderRadius: 6, cursor: 'pointer', color: '#15803d', whiteSpace: 'nowrap' as const },
  resultActions: { display: 'flex', flexDirection: 'column' as const, gap: 8, marginBottom: 12 },
  playBtn:       { display: 'block', textAlign: 'center' as const, padding: '10px', fontSize: 14, fontWeight: 700, background: '#9945FF', color: '#fff', borderRadius: 8, textDecoration: 'none' },
  shareBtn:      { padding: '10px', fontSize: 14, fontWeight: 600, background: '#fff', border: '1px solid #86efac', borderRadius: 8, cursor: 'pointer', color: '#15803d' },
  viewAllLink:   { display: 'block', textAlign: 'center' as const, fontSize: 13, color: '#6b7280', textDecoration: 'none' },

  tipsCard:  { border: '1px solid #e5e7eb', borderRadius: 14, padding: '16px 18px', background: '#fafafa' },
  tipsTitle: { fontSize: 13, fontWeight: 600, color: '#374151', margin: '0 0 10px' },
  tipsList:  { margin: 0, padding: '0 0 0 18px', fontSize: 13, color: '#6b7280', lineHeight: 1.7 },
};
