'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

const PROGRAM_ID =
  '2HK29Di58nED836JN14U1bPsxW4q52FLW5knoJEDmYQJ';

const GAMES = [
  { id: 1, name: 'Dodge Body' },
  { id: 2, name: 'Pose Match' },
  { id: 3, name: 'Shadow Runner' },
];

function ClientWalletButton() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return <WalletMultiButton />;
}

function toLocalDatetimeValue(date: Date) {
  const pad = (n: number) =>
    String(n).padStart(2, '0');

  return `${date.getFullYear()}-${pad(
    date.getMonth() + 1
  )}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
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

function durationLabel(
  startVal: string,
  finishVal: string
) {
  if (!startVal || !finishVal) return null;

  const diff =
    (new Date(finishVal).getTime() -
      new Date(startVal).getTime()) /
    1000;

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

export default function CreateChallengePage() {
  const wallet = useWallet();

  const [isMobile, setIsMobile] = useState(false);

  const [showPreview, setShowPreview] =
    useState(false);

  const [showTips, setShowTips] =
    useState(false);

  useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth < 900);
    };

    check();

    window.addEventListener('resize', check);

    return () =>
      window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    document.body.style.overflow =
      showPreview || showTips ? 'hidden' : '';

    return () => {
      document.body.style.overflow = '';
    };
  }, [showPreview, showTips]);

  const [form, setForm] = useState({
    username: '',
    description: '',
    gameId: GAMES[0]?.id ?? 1,
    entryFee: '0.1',
    maxParticipants: '100',
    startTime: defaultStart(),
    finishTime: defaultFinish(),
  });

  const [loading, setLoading] = useState(false);

  const [status, setStatus] = useState<{
    type: 'success' | 'error';
    msg: string;
  } | null>(null);

  const [resultPda, setResultPda] =
    useState('');

  const set =
    (k: keyof typeof form) =>
    (
      e: React.ChangeEvent<
        | HTMLInputElement
        | HTMLSelectElement
        | HTMLTextAreaElement
      >
    ) =>
      setForm(f => ({
        ...f,
        [k]: e.target.value,
      }));

  const handleStartChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newStart = e.target.value;

    setForm(f => {
      const startMs = new Date(newStart).getTime();

      const finishMs = new Date(
        f.finishTime
      ).getTime();

      const newFinish =
        finishMs <= startMs
          ? toLocalDatetimeValue(
              new Date(
                startMs + 60 * 60 * 1000
              )
            )
          : f.finishTime;

      return {
        ...f,
        startTime: newStart,
        finishTime: newFinish,
      };
    });
  };

  const duration = durationLabel(
    form.startTime,
    form.finishTime
  );

  const handleCreate = async () => {
    setLoading(true);

    try {
      await new Promise(resolve =>
        setTimeout(resolve, 1500)
      );

      setResultPda('mock_pda_here');

      setStatus({
        type: 'success',
        msg: 'Challenge created!',
      });
    } catch (e: any) {
      setStatus({
        type: 'error',
        msg: e.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={s.main}>
      {/* Header */}

      <div style={s.header}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <a href="/" style={s.backBtn}>
            ← Back
          </a>

          <div>
            <h1 style={s.title}>
              Create Challenge
            </h1>

            <p style={s.subtitle}>
              Set up a new MotionPlay competition
            </p>
          </div>
        </div>

        <ClientWalletButton />
      </div>

      {/* Body */}

      <div
        style={{
          ...s.body,
          gridTemplateColumns: isMobile
            ? '1fr'
            : '1fr 320px',
        }}
      >
        {/* Form */}

        <div style={s.formCol}>
          {/* Identity */}

          <Section label="Identity">
            <Field label="Your Display Name">
              <input
                value={form.username}
                onChange={set('username')}
                placeholder="Justin"
                style={s.input}
              />
            </Field>

            <Field label="Challenge Name">
              <input
                value={form.description}
                onChange={set('description')}
                placeholder="Friday Speed Run"
                style={s.input}
              />
            </Field>
          </Section>

          {/* Game */}

          <Section label="Game">
            <Field label="Select Game">
              <select
                value={form.gameId}
                onChange={set('gameId')}
                style={s.select}
              >
                {GAMES.map(g => (
                  <option
                    key={g.id}
                    value={g.id}
                  >
                    #{g.id} — {g.name}
                  </option>
                ))}
              </select>
            </Field>
          </Section>

          {/* Schedule */}

          <Section label="Schedule">
            <div style={s.dateRow}>
              <Field label="Start">
                <input
                  type="datetime-local"
                  value={form.startTime}
                  onChange={handleStartChange}
                  style={s.input}
                />
              </Field>

              <Field label="Finish">
                <input
                  type="datetime-local"
                  value={form.finishTime}
                  onChange={set('finishTime')}
                  style={s.input}
                />
              </Field>
            </div>

            {duration && (
              <div style={s.durationPill}>
                ⏱ Duration:{' '}
                <strong>{duration}</strong>
              </div>
            )}
          </Section>

          {/* Entry */}

          <Section label="Entry">
            <div style={s.dateRow}>
              <Field label="Entry Fee">
                <input
                  type="number"
                  value={form.entryFee}
                  onChange={set('entryFee')}
                  style={s.input}
                />
              </Field>

              <Field label="Max Players">
                <input
                  type="number"
                  value={form.maxParticipants}
                  onChange={set(
                    'maxParticipants'
                  )}
                  style={s.input}
                />
              </Field>
            </div>
          </Section>

          {/* Status */}

          {status && (
            <div
              style={{
                ...s.statusBox,
                ...(status.type === 'success'
                  ? s.statusSuccess
                  : s.statusError),
              }}
            >
              {status.msg}
            </div>
          )}

          {/* Submit */}

          <button
            onClick={handleCreate}
            disabled={loading}
            style={s.submitBtn}
          >
            {loading
              ? 'Creating...'
              : 'Create Challenge'}
          </button>
        </div>

        {/* Desktop Sidebar */}

        {!isMobile && (
          <div style={s.sidebar}>
            {/* Preview */}

            <div style={s.previewCard}>
              <p style={s.previewTitle}>
                Preview
              </p>

              <div style={s.previewTop}>
                <span style={s.previewPill}>
                  ● Live
                </span>

                <span style={s.previewGameBadge}>
                  Game #{form.gameId}
                </span>
              </div>

              <h3 style={s.previewName}>
                {form.description ||
                  'Challenge name…'}
              </h3>

              <div style={s.previewPrizeRow}>
                <span style={s.previewPrizeLabel}>
                  Max Prize
                </span>

                <span style={s.previewPrizeValue}>
                  {(
                    parseFloat(form.entryFee) *
                    parseInt(
                      form.maxParticipants
                    )
                  ).toFixed(2)}{' '}
                  SOL
                </span>
              </div>

              <div style={s.previewStats}>
                <PreviewStat
                  label="Entry"
                  value={`${form.entryFee} SOL`}
                />

                <PreviewStat
                  label="Players"
                  value={form.maxParticipants}
                />

                <PreviewStat
                  label="Duration"
                  value={duration ?? '—'}
                />
              </div>
            </div>

            {/* Tips */}

            <div style={s.tipsCard}>
              <p style={s.tipsTitle}>Tips</p>

              <ul style={s.tipsList}>
                <li>
                  Short competitions get more
                  engagement.
                </li>

                <li>
                  Bigger prize pools attract more
                  players.
                </li>

                <li>
                  Share your challenge link after
                  creation.
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Dock */}

      {isMobile && (
        <>
          <div style={s.mobileDock}>
            <button
              style={s.mobileDockBtn}
              onClick={() =>
                setShowPreview(true)
              }
            >
              👁 Preview
            </button>

            <button
              style={s.mobileDockBtn}
              onClick={() => setShowTips(true)}
            >
              💡 Tips
            </button>
          </div>

          {/* Preview Overlay */}

          {showPreview && (
            <div style={s.mobileOverlay}>
              <div style={s.mobileSheet}>
                <div style={s.mobileSheetHeader}>
                  <h3 style={{ margin: 0 }}>
                    Preview
                  </h3>

                  <button
                    style={s.mobileClose}
                    onClick={() =>
                      setShowPreview(false)
                    }
                  >
                    ✕
                  </button>
                </div>

                <div style={s.previewCard}>
                  <div style={s.previewTop}>
                    <span style={s.previewPill}>
                      ● Live
                    </span>

                    <span
                      style={s.previewGameBadge}
                    >
                      Game #{form.gameId}
                    </span>
                  </div>

                  <h3 style={s.previewName}>
                    {form.description ||
                      'Challenge name…'}
                  </h3>

                  <div style={s.previewPrizeRow}>
                    <span
                      style={s.previewPrizeLabel}
                    >
                      Max Prize
                    </span>

                    <span
                      style={s.previewPrizeValue}
                    >
                      {(
                        parseFloat(
                          form.entryFee
                        ) *
                        parseInt(
                          form.maxParticipants
                        )
                      ).toFixed(2)}{' '}
                      SOL
                    </span>
                  </div>

                  <div style={s.previewStats}>
                    <PreviewStat
                      label="Entry"
                      value={`${form.entryFee} SOL`}
                    />

                    <PreviewStat
                      label="Players"
                      value={
                        form.maxParticipants
                      }
                    />

                    <PreviewStat
                      label="Duration"
                      value={duration ?? '—'}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tips Overlay */}

          {showTips && (
            <div style={s.mobileOverlay}>
              <div style={s.mobileSheet}>
                <div style={s.mobileSheetHeader}>
                  <h3 style={{ margin: 0 }}>
                    Tips
                  </h3>

                  <button
                    style={s.mobileClose}
                    onClick={() =>
                      setShowTips(false)
                    }
                  >
                    ✕
                  </button>
                </div>

                <div style={s.tipsCard}>
                  <ul style={s.tipsList}>
                    <li>
                      Future start times help
                      players join.
                    </li>

                    <li>
                      1–6 hour competitions work
                      well.
                    </li>

                    <li>
                      Share your play link after
                      creating.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={s.section}>
      <p style={s.sectionLabel}>{label}</p>

      {children}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={s.field}>
      <label style={s.fieldLabel}>
        {label}
      </label>

      {children}
    </div>
  );
}

function PreviewStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div style={s.previewStat}>
      <span style={s.previewStatLabel}>
        {label}
      </span>

      <span style={s.previewStatVal}>
        {value}
      </span>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  main: {
    maxWidth: 1100,
    margin: '0 auto',
    padding: '24px',
    fontFamily: 'Arial, sans-serif',
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 28,
    gap: 16,
  },

  title: {
    fontSize: 24,
    fontWeight: 700,
    margin: 0,
  },

  subtitle: {
    margin: 0,
    color: '#6b7280',
    fontSize: 13,
  },

  backBtn: {
    textDecoration: 'none',
    color: '#6b7280',
    border: '1px solid #e5e7eb',
    padding: '6px 12px',
    borderRadius: 8,
  },

  body: {
    display: 'grid',
    gap: 24,
  },

  formCol: {
    display: 'flex',
    flexDirection: 'column',
  },

  section: {
    border: '1px solid #e5e7eb',
    borderRadius: 14,
    padding: 20,
    marginBottom: 16,
    background: '#fff',
  },

  sectionLabel: {
    margin: '0 0 16px',
    fontWeight: 700,
    fontSize: 12,
    textTransform: 'uppercase',
    color: '#9ca3af',
  },

  field: {
    marginBottom: 16,
  },

  fieldLabel: {
    display: 'block',
    marginBottom: 6,
    fontSize: 14,
    fontWeight: 500,
  },

  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #d1d5db',
    fontSize: 14,
    boxSizing: 'border-box',
  },

  select: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #d1d5db',
    fontSize: 14,
    boxSizing: 'border-box',
  },

  dateRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
  },

  durationPill: {
    display: 'inline-block',
    padding: '6px 12px',
    borderRadius: 100,
    background: '#f0fdf4',
    color: '#15803d',
    marginTop: 4,
  },

  submitBtn: {
    width: '100%',
    height: 52,
    borderRadius: 12,
    border: 'none',
    background: '#9945FF',
    color: '#fff',
    fontWeight: 700,
    fontSize: 16,
  },

  statusBox: {
    padding: 14,
    borderRadius: 10,
    marginBottom: 16,
  },

  statusSuccess: {
    background: '#dcfce7',
    color: '#166534',
  },

  statusError: {
    background: '#fee2e2',
    color: '#991b1b',
  },

  sidebar: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    position: 'sticky',
    top: 24,
  },

  previewCard: {
    border: '1px solid #e5e7eb',
    borderRadius: 14,
    padding: 18,
    background: '#fff',
  },

  previewTitle: {
    margin: '0 0 14px',
    fontSize: 12,
    fontWeight: 700,
    textTransform: 'uppercase',
    color: '#9ca3af',
  },

  previewTop: {
    display: 'flex',
    gap: 8,
    marginBottom: 12,
  },

  previewPill: {
    background: '#dcfce7',
    color: '#166534',
    borderRadius: 100,
    padding: '4px 10px',
    fontSize: 12,
    fontWeight: 700,
  },

  previewGameBadge: {
    background: '#f3f4f6',
    borderRadius: 100,
    padding: '4px 10px',
    fontSize: 12,
  },

  previewName: {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 14,
  },

  previewPrizeRow: {
    display: 'flex',
    justifyContent: 'space-between',
    background: '#faf5ff',
    borderRadius: 12,
    padding: '12px 14px',
    marginBottom: 14,
  },

  previewPrizeLabel: {
    color: '#7c3aed',
    fontWeight: 600,
  },

  previewPrizeValue: {
    color: '#9945FF',
    fontWeight: 700,
    fontSize: 18,
  },

  previewStats: {
    display: 'flex',
    gap: 10,
  },

  previewStat: {
    flex: 1,
    border: '1px solid #f3f4f6',
    borderRadius: 10,
    padding: 10,
  },

  previewStatLabel: {
    display: 'block',
    color: '#9ca3af',
    fontSize: 11,
    marginBottom: 4,
  },

  previewStatVal: {
    fontWeight: 700,
  },

  tipsCard: {
    border: '1px solid #e5e7eb',
    borderRadius: 14,
    padding: 18,
    background: '#fafafa',
  },

  tipsTitle: {
    margin: '0 0 12px',
    fontWeight: 700,
  },

  tipsList: {
    margin: 0,
    paddingLeft: 18,
    color: '#6b7280',
    lineHeight: 1.7,
  },

  mobileDock: {
    position: 'fixed',
    left: 16,
    right: 16,
    bottom: 16,
    display: 'flex',
    gap: 12,
    zIndex: 200,
  },

  mobileDockBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    border: 'none',
    background: '#111827',
    color: '#fff',
    fontWeight: 700,
    fontSize: 15,
  },

  mobileOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    zIndex: 500,
    display: 'flex',
    alignItems: 'flex-end',
  },

  mobileSheet: {
    width: '100%',
    maxHeight: '85vh',
    overflowY: 'auto',
    background: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },

  mobileSheetHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },

  mobileClose: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    border: 'none',
    background: '#f3f4f6',
    fontSize: 18,
  },
};
