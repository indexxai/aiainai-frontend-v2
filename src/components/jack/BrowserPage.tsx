'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Badge, Banner, Button, Icon, cx, type IconName } from '@/ui';
import { useShellCrumbs } from '@/components/shell/crumbs';
import { api, type Schemas } from '@/lib/api/client';
import { toApiError } from '@/lib/api/errors';
import { JackActionInline } from './JackAction';
import './browser.css';

type Task = Schemas['BrowserTaskDto'];
type Control = 'pause' | 'resume' | 'takeover' | 'giveback' | 'stop';

const STATUS: Record<
  Task['status'],
  { tone: 'info' | 'neutral' | 'warning' | 'success' | 'danger'; icon: IconName; label: string }
> = {
  running: { tone: 'info', icon: 'loader-circle', label: 'Working' },
  paused: { tone: 'neutral', icon: 'circle-pause', label: 'Paused' },
  taken_over: { tone: 'warning', icon: 'hand', label: 'You’re in control' },
  waiting: { tone: 'warning', icon: 'hand', label: 'Needs you' },
  done: { tone: 'success', icon: 'circle-check', label: 'Done' },
  failed: { tone: 'danger', icon: 'circle-alert', label: 'Didn’t finish' },
  stopped: { tone: 'neutral', icon: 'square', label: 'Stopped' },
};

const STEP: Record<Task['steps'][number]['state'], { icon: IconName; label: string; cls: string }> = {
  done: { icon: 'circle-check', label: 'Done', cls: 'ok' },
  working: { icon: 'loader-circle', label: 'Working', cls: 'work' },
  needs_you: { icon: 'hand', label: 'Needs you', cls: 'you' },
  failed: { icon: 'circle-alert', label: 'Didn’t work', cls: 'bad' },
};

const ACTIVE = new Set<Task['status']>(['running', 'paused', 'taken_over', 'waiting']);
const time = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

function banner(t: Task): string {
  const working = [...t.steps].reverse().find((s) => s.state === 'working')?.text;
  switch (t.status) {
    case 'running':
      return `${working ? `Jack: ${working}.` : 'Jack is working.'} Payment will wait for your OK.`;
    case 'paused':
      return 'Paused. Jack won’t click or type anything until you resume.';
    case 'taken_over':
      return 'You’re in control. Jack is watching and won’t touch anything until you give it back.';
    case 'waiting':
      return 'Jack stopped at the payment step. Nothing is paid until you approve.';
    case 'done':
      return t.summary || 'Finished.';
    case 'failed':
      return t.summary || 'Jack couldn’t finish this task.';
    default:
      return 'Stopped. Nothing was paid, and the browser was closed.';
  }
}

/** Jack's browser, live (v2 design): what Jack is doing on the left, the page he's on to the right. */
export function BrowserPage({ initial }: { initial: Task }) {
  const pathname = usePathname();
  const [t, setT] = useState(initial);
  const [busy, setBusy] = useState<Control | null>(null);
  const [error, setError] = useState('');
  const active = ACTIVE.has(t.status);
  const st = STATUS[t.status];

  const reload = useCallback(async () => {
    const { data } = await api.GET('/api/browser/{id}', { params: { path: { id: initial.id } } });
    if (data) setT(data);
  }, [initial.id]);

  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => void reload(), 1500);
    return () => clearInterval(timer);
  }, [active, reload]);

  const control = async (c: Control) => {
    setBusy(c);
    setError('');
    const { data, error: err } = await api.POST('/api/browser/{id}/{control}', {
      params: { path: { id: t.id, control: c } },
    });
    setBusy(null);
    if (!data) return setError(toApiError(err).message);
    setT(data);
  };

  const btn = (c: Control, icon: IconName, label: string, variant: 'secondary' | 'danger' = 'secondary') => (
    <Button
      key={c}
      size="sm"
      variant={variant}
      icon={icon}
      loading={busy === c}
      onClick={() => void control(c)}
    >
      {label}
    </Button>
  );

  useShellCrumbs({
    path: pathname,
    items: [
      t.chatId
        ? {
            label: t.title.length > 34 ? `${t.title.slice(0, 32).trimEnd()}…` : t.title,
            href: `/chat/${t.chatId}`,
          }
        : { label: 'Jack', href: '/' },
      { label: 'Jack’s browser' },
    ],
    back: t.chatId ? `/chat/${t.chatId}` : '/',
    actions: (
      <div className="brw-controls">
        <Badge tone={st.tone} icon={st.icon}>
          {st.label}
        </Badge>
        {t.status === 'running' && [
          btn('takeover', 'hand', 'Take over'),
          btn('pause', 'circle-pause', 'Pause'),
        ]}
        {t.status === 'paused' && btn('resume', 'play', 'Resume')}
        {t.status === 'taken_over' && btn('giveback', 'bot', 'Give back to Jack')}
        {active && btn('stop', 'square', 'Stop', 'danger')}
      </div>
    ),
  });

  return (
    <div className="brw">
      <aside className="brw-side" aria-label="What Jack is doing">
        <h2 className="brw-ov">What Jack is doing</h2>
        <ol className="brw-log">
          {t.steps.map((s, i) => {
            const m = STEP[s.state];
            const last = i === t.steps.length - 1;
            return (
              <li key={i} className={cx(m.cls, last && s.state === 'working' && 'now')}>
                <span className="brw-t">{time(s.at)}</span>
                <Icon
                  name={m.icon}
                  size={18}
                  label={m.label}
                  className={s.state === 'working' && t.status === 'running' ? 'as-spin' : undefined}
                />
                <span>{s.text}</span>
              </li>
            );
          })}
          {active && t.status !== 'waiting' && (
            <li className="next">
              <span className="brw-t" />
              <Icon name="hand" size={18} label="Needs you" />
              <span>Before paying, Jack waits for your OK</span>
            </li>
          )}
        </ol>
        <div className="brw-rule" />
        <h2 className="brw-ov">Safety</h2>
        <ul className="brw-safety">
          <li>
            <Icon name="key-round" size={16} />
            <span>
              Jack never types passwords or card numbers. If a site asks, he stops and you take over.
            </span>
          </li>
          <li>
            <Icon name="shield-check" size={16} />
            <span>This browser is private to you and is wiped when the task ends.</span>
          </li>
          <li>
            <Icon name="ban" size={16} />
            <span>
              Jack can’t open sites you’ve blocked in <Link href="/wallet">Wallet</Link>.
            </span>
          </li>
        </ul>
        {t.chatId && (
          <Link href={`/chat/${t.chatId}`} className="brw-back">
            <Icon name="arrow-left" size={16} /> Back to the conversation
          </Link>
        )}
      </aside>

      <main className="brw-main">
        {error && (
          <Banner tone="danger" onDismiss={() => setError('')}>
            {error}
          </Banner>
        )}
        <Banner
          tone={t.status === 'failed' ? 'danger' : t.status === 'done' ? 'success' : 'neutral'}
          icon="info"
        >
          {banner(t)}
        </Banner>
        {t.action?.status === 'pending' && <JackActionInline a={t.action} onChanged={() => void reload()} />}

        <div className="brw-frame">
          <div className="brw-bar">
            <Icon name="lock" size={14} label="Secure connection" />
            <span className="brw-url">{t.view?.url ?? (t.liveUrl ? 'Live browser' : 'about:blank')}</span>
            {active ? (
              <Badge tone="neutral" icon="eye">
                {t.sample ? 'Sample view' : 'You’re watching live'}
              </Badge>
            ) : (
              <Badge tone="neutral" icon={false}>
                Closed
              </Badge>
            )}
          </div>
          {t.liveUrl && active ? (
            <iframe
              className="brw-live"
              src={t.liveUrl}
              title="Jack’s browser"
              sandbox="allow-same-origin allow-scripts"
              allow="clipboard-read; clipboard-write"
              style={{ pointerEvents: t.status === 'taken_over' ? 'auto' : 'none' }}
            />
          ) : t.view ? (
            <div className="brw-site" aria-label={`The page Jack is on: ${t.view.heading}`}>
              <div className="brw-site-top">
                <span className="brw-site-logo" />
                <span className="brw-site-name">{t.view.site}</span>
              </div>
              <div className="brw-site-h">{t.view.heading}</div>
              {t.view.fields.length > 0 && (
                <div className="brw-site-fields">
                  {t.view.fields.map((f) => (
                    <div key={f.label} className="brw-site-label">
                      {f.label}
                      <span className={cx('brw-fld', f.active && 'on')}>
                        {f.value}
                        {f.active && t.status === 'running' && <i className="brw-caret" />}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {(t.view.button || t.view.note) && (
                <div className="brw-site-foot">
                  {t.view.button && <span className="brw-site-btn">{t.view.button}</span>}
                  {t.view.note && <span className="brw-site-note">{t.view.note}</span>}
                </div>
              )}
            </div>
          ) : (
            <div className="brw-empty">
              <Icon name="globe" size={32} />
              <span>{active ? 'Opening the browser…' : 'The browser is closed.'}</span>
            </div>
          )}
        </div>
        {t.sample && (
          <p className="brw-note">
            Sample mode: no browser service is connected yet, so Jack walks through example sites and nothing
            is booked for real.
          </p>
        )}
      </main>
    </div>
  );
}
