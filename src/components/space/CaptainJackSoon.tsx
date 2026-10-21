'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Button, Icon, type IconName } from '@/ui';
import { JackImg } from '@/components/jack/JackImg';
import { api } from '@/lib/api/client';
import { toApiError } from '@/lib/api/errors';
import { useJack } from '@/lib/assistant';
import './captain-soon.css';

const COMING: { icon: IconName; title: string; text: string }[] = [
  {
    icon: 'users',
    title: 'An AI crew built for your business',
    text: 'Describe what you do and he proposes the agents.',
  },
  { icon: 'mail', title: 'Leads, posts, CRM and reports', text: 'The jobs that pile up, handled every day.' },
  { icon: 'hand', title: 'You stay in control', text: 'Anything important waits for your OK.' },
];

/**
 * Captain Jack (the Business space) before launch: what's coming, a way to hear when he's
 * ready, and the way back to the Personal assistant (design "Captain Jack — coming soon").
 */
export function CaptainJackSoon({ onList, email }: { onList: boolean; email: string }) {
  const jack = useJack('personal');
  const [listed, setListed] = useState(onList);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const join = async () => {
    setBusy(true);
    setError('');
    const { error: err, response } = await api.POST('/api/me/waitlist', { body: { list: 'captain-jack' } });
    setBusy(false);
    if (response.ok) setListed(true);
    else setError(toApiError(err).message);
  };

  return (
    <div className="cjs">
      <div className="cjs-art" aria-hidden>
        <JackImg space="business" part="full" className="cjs-img" />
        <div className="cjs-shadow" />
      </div>
      <div className="cjs-body">
        <span className="cjs-pill">
          <b aria-hidden />
          Coming soon
        </span>
        <h1 className="cjs-title">Captain Jack is getting his crew ready.</h1>
        <p className="cjs-lead">
          Soon Captain Jack will run a crew of AI agents for your business. Until then, {jack.title} is here
          to help with everything else.
        </p>
        <ul className="cjs-list">
          {COMING.map((c) => (
            <li key={c.title}>
              <span className="cjs-ic" aria-hidden>
                <Icon name={c.icon} size={16} />
              </span>
              <span>
                <b>{c.title}</b>
                <span>{c.text}</span>
              </span>
            </li>
          ))}
        </ul>
        {listed ? (
          <p className="cjs-done" role="status">
            <Icon name="circle-check" size={20} />
            You’re on the list. We’ll email {email} when Captain Jack is ready.
          </p>
        ) : (
          <>
            {error && (
              <p className="cjs-error" role="alert">
                {error}
              </p>
            )}
          </>
        )}
        <div className="cjs-actions">
          {!listed && (
            <Button variant="primary" icon="bell" loading={busy} onClick={() => void join()}>
              Tell me when it’s ready
            </Button>
          )}
          <Link href="/" className="cjs-link">
            Go to {jack.title}
            <Icon name="arrow-right" size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
