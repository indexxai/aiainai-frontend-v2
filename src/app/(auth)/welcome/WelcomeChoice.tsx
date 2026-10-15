'use client';
import { useState } from 'react';
import { Banner, Icon, cx } from '@/ui';
import { api } from '@/lib/api/client';
import { toApiError } from '@/lib/api/errors';
import { JackImg } from '@/components/jack/JackImg';
import { JACKS } from '@/lib/jack';
import { openInSpace, type Space } from '@/lib/space';

const OPTIONS: { value: Space; who: string; text: string }[] = [
  {
    value: 'personal',
    who: 'For personal use',
    text: 'Help with your own life: travel, bills, shopping and everyday questions.',
  },
  {
    value: 'business',
    who: 'For business',
    text: 'A team of agents for your business: leads, social posts, invoices and reports.',
  },
];

/**
 * Sign-up step 1 of 2, "What will you use Jack for?" (design "Sign-up — Personal or Business").
 * One tap saves the answer, then "What should Jack help with first?" follows.
 */
export function WelcomeChoice({ next }: { next: string }) {
  const [busy, setBusy] = useState<Space | null>(null);
  const [error, setError] = useState('');

  const choose = async (use: Space) => {
    if (busy) return;
    setBusy(use);
    setError('');
    const { data, error: err } = await api.PATCH('/api/me/onboarding', { body: { use } });
    if (!data) {
      setBusy(null);
      setError(toApiError(err).message);
      return;
    }
    // A full load, so the next step reads the saved answer fresh.
    openInSpace(`/welcome/goals?next=${encodeURIComponent(next)}`);
  };

  return (
    <>
      <div className="au-head">
        <h1 className="au-title">What will you use Jack for?</h1>
        <p className="au-sub">Pick one to start. Jack sets himself up for it.</p>
      </div>
      {error && <Banner tone="danger">{error}</Banner>}
      <div className="au-choices" role="group" aria-label="What will you use Jack for?">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            className={cx('au-choice', busy === o.value && 'on')}
            onClick={() => void choose(o.value)}
            disabled={!!busy}
            aria-busy={busy === o.value || undefined}
          >
            <span className="au-choice-av" aria-hidden>
              <JackImg space={o.value} part="full" />
            </span>
            <span className="au-choice-body">
              <span className="au-choice-who">
                {JACKS[o.value].name} <span>{o.who}</span>
              </span>
              <span className="au-choice-text">{o.text}</span>
            </span>
            <span className="au-choice-go" aria-hidden>
              <Icon
                name={busy === o.value ? 'loader-circle' : 'arrow-right'}
                size={18}
                className={busy === o.value ? 'as-spin' : undefined}
              />
            </span>
          </button>
        ))}
      </div>
      <p className="au-note">
        Not sure? Pick either. You can switch any time from the top bar or the sidebar. Business opens a short
        set-up next: the business name, apps and team.
      </p>
    </>
  );
}
