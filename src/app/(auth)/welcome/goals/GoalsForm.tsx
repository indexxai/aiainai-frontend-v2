'use client';
import { useState } from 'react';
import { Banner, Button, Icon, cx, type IconName } from '@/ui';
import { api } from '@/lib/api/client';
import { toApiError } from '@/lib/api/errors';
import { JackImg } from '@/components/jack/JackImg';
import { JACKS } from '@/lib/jack';
import { openInSpace, saveSpace, type Space } from '@/lib/space';

const GOALS: Record<Space, { label: string; icon: IconName }[]> = {
  personal: [
    { label: 'Travel and trips', icon: 'map-pin' },
    { label: 'Shopping and deals', icon: 'store' },
    { label: 'Writing and email', icon: 'pen-line' },
    { label: 'Research', icon: 'search' },
    { label: 'Bills and money', icon: 'receipt' },
    { label: 'Plans and reminders', icon: 'calendar' },
    { label: 'Images and design', icon: 'image' },
    { label: 'Everyday questions', icon: 'message-circle' },
  ],
  business: [
    { label: 'Replying to leads', icon: 'mail' },
    { label: 'Customer support', icon: 'message-square' },
    { label: 'Social media posts', icon: 'megaphone' },
    { label: 'Marketing reports', icon: 'chart-column' },
    { label: 'Invoices and payments', icon: 'receipt' },
    { label: 'Team workflows', icon: 'workflow' },
    { label: 'Keeping the CRM tidy', icon: 'contact' },
    { label: 'Meetings', icon: 'calendar' },
  ],
};

/**
 * "What do you want Jack to help with first?" Pick any number, or say it in your own words.
 * Personal then opens Jack's home; Business opens the Business set-up (name, apps, team).
 */
export function GoalsForm({
  use,
  next,
  hasBusiness,
  initial,
}: {
  use: Space;
  next: string;
  hasBusiness: boolean;
  initial: { goals: string[]; note: string };
}) {
  const jack = JACKS[use];
  const short = use === 'business' ? 'Captain Jack' : 'Jack';
  const [picked, setPicked] = useState<string[]>(initial.goals);
  const [note, setNote] = useState(initial.note);
  const [busy, setBusy] = useState<'save' | 'skip' | null>(null);
  const [error, setError] = useState('');

  const go = () => {
    // A full load, so the app renders in the chosen space from the first screen.
    if (use === 'business' && !hasBusiness) {
      openInSpace('/business/setup');
      return;
    }
    saveSpace(use);
    openInSpace(next);
  };

  const save = async () => {
    if (busy) return;
    setBusy('save');
    setError('');
    const { data, error: err } = await api.PATCH('/api/me/onboarding', {
      body: { goals: picked, note: note.trim() },
    });
    if (!data) {
      setBusy(null);
      setError(toApiError(err).message);
      return;
    }
    go();
  };

  const toggle = (label: string) =>
    setPicked((p) => (p.includes(label) ? p.filter((g) => g !== label) : [...p, label]));

  return (
    <>
      <div className="au-head">
        <div className="au-jack">
          <JackImg space={use} part="head" width={36} height={36} />
          <span>
            {jack.name} · {use === 'business' ? 'Business' : 'Personal'}
          </span>
        </div>
        <h1 className="au-title">What do you want {short} to help with first?</h1>
        <p className="au-sub">Pick one or more. He starts there and learns the rest as you go.</p>
      </div>
      {error && <Banner tone="danger">{error}</Banner>}
      <div className="au-goals" role="group" aria-label={`What do you want ${short} to help with first?`}>
        {GOALS[use].map((g) => {
          const on = picked.includes(g.label);
          return (
            <button
              key={g.label}
              type="button"
              role="checkbox"
              aria-checked={on}
              className={cx('au-goal', on && 'on')}
              onClick={() => toggle(g.label)}
            >
              <span className="au-goal-ic" aria-hidden>
                <Icon name={g.icon} size={18} />
              </span>
              <span className="au-goal-label">{g.label}</span>
              <span className="au-goal-ck" aria-hidden>
                {on && <Icon name="check" size={12} />}
              </span>
            </button>
          );
        })}
      </div>
      <label className="au-goal-note">
        <Icon name="message-circle" size={18} />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={300}
          placeholder={`Or tell ${short} in your own words…`}
          aria-label={`Or tell ${short} in your own words`}
        />
      </label>
      <div className="au-goal-actions">
        <Button
          variant="primary"
          iconRight="arrow-right"
          loading={busy === 'save'}
          onClick={() => void save()}
          disabled={!!busy || (!picked.length && !note.trim())}
        >
          Continue
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setBusy('skip');
            go();
          }}
          disabled={!!busy}
        >
          Skip for now
        </Button>
      </div>
      <p className="au-note">You can change this any time in Settings.</p>
    </>
  );
}
