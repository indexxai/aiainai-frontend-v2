'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Badge, Banner, Button, Icon, cx, type IconName } from '@/ui';
import { api, type Schemas } from '@/lib/api/client';
import { toApiError } from '@/lib/api/errors';
import './connections.css';

type List = Schemas['ConnectionsDto'];
type App = Schemas['ConnectionDto'];
type Level = App['level'];
type AppId = 'gmail' | 'google-calendar';

const LEVELS: { id: Level; label: string; hint: string }[] = [
  { id: 'read', label: 'Read', hint: 'Jack only reads' },
  { id: 'draft', label: 'Draft', hint: 'Jack reads and writes drafts; you send' },
  { id: 'ask', label: 'Ask first', hint: 'Jack acts after you approve' },
  { id: 'auto', label: 'On its own', hint: 'Jack acts and tells you in Activity' },
];

const STATUS: Record<
  App['status'],
  { tone: 'success' | 'neutral' | 'warning'; label: string; icon?: IconName }
> = {
  connected: { tone: 'success', label: 'Connected', icon: 'check' },
  pending: { tone: 'neutral', label: 'Waiting for sign-in', icon: 'loader-circle' },
  failed: { tone: 'warning', label: 'Didn’t finish' },
  not_connected: { tone: 'neutral', label: 'Not connected' },
  coming: { tone: 'neutral', label: 'Coming soon', icon: 'clock' },
};

/**
 * Connections (v2 design): each app with how much Jack may do in it. Connecting opens the app's
 * own sign-in page; Jack never sees the password.
 */
export function ConnectionsPage({
  initial,
  returned,
  aside,
}: {
  initial: List;
  returned: string | null;
  aside: ReactNode;
}) {
  const router = useRouter();
  const [list, setList] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const checked = useRef(false);

  // Back from an app's sign-in page: check whether it worked, then tidy the address.
  useEffect(() => {
    if (!returned || checked.current) return;
    checked.current = true;
    void (async () => {
      const { data } = await api.POST('/api/connections/{app}/refresh', {
        params: { path: { app: returned } },
      });
      if (data) setList(data);
      router.replace('/connections');
    })();
  }, [returned, router]);

  const run = async (id: string, fn: () => Promise<{ data?: List; error?: unknown }>) => {
    setBusy(id);
    setError('');
    const { data, error: err } = await fn();
    setBusy(null);
    if (data) setList(data);
    else setError(toApiError(err).message);
  };

  const connect = async (app: App) => {
    setBusy(app.id);
    setError('');
    const { data, error: err } = await api.POST('/api/connections/{app}/connect', {
      params: { path: { app: app.id as AppId } },
    });
    if (!data) {
      setBusy(null);
      return setError(toApiError(err).message);
    }
    if (data.redirectUrl) {
      window.location.assign(data.redirectUrl); // the app’s own sign-in page
      return;
    }
    setBusy(null);
    setList(data.connections);
  };

  return (
    <div className="cx">
      <main className="cx-main">
        <div className="cx-head">
          <h1 className="title-lg">Connections</h1>
          <p>Apps Jack can use in this space, and how much he can do in each.</p>
        </div>
        {list.demo && (
          <Banner tone="neutral" icon="info">
            Sample mode: the server has no connector key yet, so connecting works at once and Jack sees sample
            events and email.
          </Banner>
        )}
        {error && (
          <Banner tone="danger" onDismiss={() => setError('')}>
            {error}
          </Banner>
        )}
        <section className="cx-card" aria-label="Apps">
          {list.apps.map((a) => {
            const st = STATUS[a.status];
            const on = a.status === 'connected';
            return (
              <div key={a.id} className="cx-app">
                <span className="cx-ic">
                  <Icon name={a.icon as IconName} size={18} />
                </span>
                <div className="cx-info">
                  <div className="cx-name">
                    <span>{a.name}</span>
                    <Badge tone={st.tone} icon={st.icon ?? false}>
                      {st.label}
                    </Badge>
                  </div>
                  <div className="cx-what">
                    {on && a.account ? `${a.account} · ` : ''}
                    {a.what}
                  </div>
                  {on && (
                    <div className="cx-levels" role="radiogroup" aria-label={`What Jack may do in ${a.name}`}>
                      {LEVELS.map((l) => (
                        <button
                          key={l.id}
                          type="button"
                          role="radio"
                          aria-checked={a.level === l.id}
                          title={l.hint}
                          disabled={busy === a.id}
                          className={cx('cx-level', a.level === l.id && 'on')}
                          onClick={() =>
                            a.level !== l.id &&
                            void run(a.id, () =>
                              api.PATCH('/api/connections/{app}', {
                                params: { path: { app: a.id as AppId } },
                                body: { level: l.id },
                              }),
                            )
                          }
                        >
                          {l.label}
                        </button>
                      ))}
                    </div>
                  )}
                  {on && <div className="cx-hint">{LEVELS.find((l) => l.id === a.level)?.hint}</div>}
                </div>
                <div className="cx-act">
                  {on ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      loading={busy === a.id}
                      onClick={() =>
                        void run(a.id, () =>
                          api.DELETE('/api/connections/{app}', { params: { path: { app: a.id as AppId } } }),
                        )
                      }
                    >
                      Disconnect
                    </Button>
                  ) : a.available ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      icon="link"
                      loading={busy === a.id}
                      onClick={() => void connect(a)}
                    >
                      {a.status === 'failed' || a.status === 'pending' ? 'Try again' : 'Connect'}
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}
          <div className="cx-app">
            <span className="cx-ic">
              <Icon name="globe" size={18} />
            </span>
            <div className="cx-info">
              <div className="cx-name">
                <span>Jack’s browser</span>
                {list.browser === 'live' ? (
                  <Badge tone="success" icon="circle-check">
                    Built in
                  </Badge>
                ) : list.browser === 'sample' ? (
                  <Badge tone="info" icon="info">
                    Sample sites
                  </Badge>
                ) : (
                  <Badge tone="neutral" icon="clock">
                    Not switched on yet
                  </Badge>
                )}
              </div>
              <div className="cx-what">
                Built in. Opens sites, fills in forms and compares prices. Always asks before paying.
                {list.browser === 'sample' &&
                  ' Right now he practises on example sites; nothing is booked for real.'}
              </div>
            </div>
          </div>
        </section>
        <p className="cx-note">
          <Icon name="lock" size={14} /> Sending email and paying always ask you first, whatever the level.
          Jack never sees your passwords.
        </p>
      </main>
      <div className="cx-aside">{aside}</div>
    </div>
  );
}
