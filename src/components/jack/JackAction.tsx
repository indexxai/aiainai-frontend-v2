'use client';
import { useJack } from '@/lib/assistant';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Badge, Banner, Button, Dialog, Icon, cx, type IconName } from '@/ui';
import { AgentAvatar } from '@/components/jack/AgentAvatar';
import { JACKS } from '@/lib/jack';
import { api, type Schemas } from '@/lib/api/client';
import { toApiError } from '@/lib/api/errors';
import { approvalsChanged } from '@/lib/approvals-count';
import './jack-action.css';
import { VoiceField } from '@/components/voice/Voice';

export type JackAction = Schemas['JackActionDto'];

export const ACTION_META: Record<JackAction['kind'], { icon: IconName; badge: string; approve: string }> = {
  purchase: { icon: 'credit-card', badge: 'Purchase', approve: 'Approve and pay' },
  send_email: { icon: 'mail', badge: 'Email', approve: 'Approve and send' },
  calendar_event: { icon: 'calendar', badge: 'Calendar', approve: 'Add to calendar' },
  slack_message: { icon: 'hash', badge: 'Slack', approve: 'Approve and post' },
};

/** Kinds whose text can be changed before approving. */
const EDITABLE: JackAction['kind'][] = ['send_email', 'slack_message'];

export function actionState(a: JackAction): { tone: 'success' | 'neutral' | 'warning'; label: string } {
  switch (a.status) {
    case 'pending':
      return { tone: 'warning', label: 'Waiting for you' };
    case 'done':
      return {
        tone: 'success',
        label:
          a.kind === 'purchase'
            ? 'Paid'
            : a.kind === 'send_email'
              ? 'Sent'
              : a.kind === 'slack_message'
                ? 'Posted'
                : 'Added',
      };
    case 'rejected':
      return { tone: 'neutral', label: 'You said not now' };
    case 'cancelled':
      return { tone: 'neutral', label: 'Cancelled' };
    default:
      return { tone: 'warning', label: 'Didn’t go through' };
  }
}

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

/** Approve (optionally with an edited email text) or reject one of Jack's requests. */
export function useJackActionCalls(
  onDone: (a: JackAction, msg: string) => void,
  onError: (msg: string) => void,
) {
  const [busy, setBusy] = useState<string | null>(null);
  const approve = async (a: JackAction, body?: string) => {
    setBusy(a.id);
    const { data, error } = await api.POST('/api/approvals/jack/{id}/approve', {
      params: { path: { id: a.id } },
      body: body !== undefined ? { body } : {},
    });
    setBusy(null);
    if (!data) return onError(toApiError(error).message);
    approvalsChanged(); // the count in the header
    if (data.status === 'failed') return onError(data.result);
    onDone(data, data.result || 'Done');
  };
  const reject = async (a: JackAction) => {
    setBusy(a.id);
    const { data, error } = await api.POST('/api/approvals/jack/{id}/reject', {
      params: { path: { id: a.id } },
      body: {},
    });
    setBusy(null);
    if (!data) return onError(toApiError(error).message);
    approvalsChanged();
    onDone(data, a.kind === 'purchase' ? 'Rejected — nothing was paid' : 'Rejected — nothing was sent');
  };
  return { busy, approve, reject };
}

type Calls = ReturnType<typeof useJackActionCalls>;

/** The full request on the Approvals page (v2 design "Approvals — a purchase waiting for your OK"). */
export function JackActionDetail({ a, calls }: { a: JackAction; calls: Calls }) {
  const jack = useJack(a.space);
  const meta = ACTION_META[a.kind];
  const st = actionState(a);
  const [editing, setEditing] = useState(false);
  return (
    <div className="ja">
      <div className="ja-top">
        <span className="ja-ic big">
          <Icon name={meta.icon} size={24} />
        </span>
        <div className="ja-grow">
          <div className="title">{a.title}</div>
          <div className="ja-muted">
            Requested by {jack.title} · {a.space === 'business' ? 'Business' : 'Personal'} space ·{' '}
            {time(a.createdAt)}
          </div>
        </div>
        <Badge tone="warning" icon="hand">
          {meta.badge}
        </Badge>
      </div>
      <section className="ja-card">
        <h2 className="ja-ov">Exactly what will happen</h2>
        <dl className="ja-kv">
          {a.details.map((d) => (
            <div key={d.label} className="ja-kv-row">
              <dt>{d.label}</dt>
              <dd className={d.label === 'Pay' ? 'strong' : d.label === 'Text' ? 'pre' : undefined}>
                {d.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>
      {a.limits && a.limits.length > 0 && (
        <section className="ja-card">
          <h2 className="ja-ov">Your limits</h2>
          <div className="ja-limits">
            {a.limits.map((l) => (
              <div key={l.label} className="ja-limit">
                <div className="ja-limit-row">
                  <span>{l.label}</span>
                  <span className="ja-muted">
                    {l.used.toLocaleString('en-US')} of {l.limit.toLocaleString('en-US')}
                  </span>
                </div>
                <div className={cx('ja-bar', l.used > l.limit && 'over')}>
                  <i
                    style={{ width: `${Math.min(100, Math.round((l.used / Math.max(1, l.limit)) * 100))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="ja-muted">
            Change your limits in <Link href="/wallet">Wallet</Link>.
          </p>
        </section>
      )}
      {a.status === 'pending' && a.blocked && (
        <Banner tone="warning" icon="circle-alert">
          {a.blocked}
        </Banner>
      )}
      {a.kind === 'purchase' && (
        <p className="ja-lock">
          <Icon name="lock" size={16} /> Purchases always ask you first. This can’t be switched off.
        </p>
      )}
      {a.status === 'pending' ? (
        <div className="ja-actions">
          <Button
            variant="primary"
            icon="check"
            loading={calls.busy === a.id}
            disabled={!!a.blocked}
            onClick={() => void calls.approve(a)}
          >
            {meta.approve}
          </Button>
          {EDITABLE.includes(a.kind) && (
            <Button icon="pencil" onClick={() => setEditing(true)}>
              Edit first
            </Button>
          )}
          <Button variant="ghost" onClick={() => void calls.reject(a)}>
            Reject
          </Button>
        </div>
      ) : (
        <div className="ja-decided">
          <Badge tone={st.tone} icon={false}>
            {st.label}
          </Badge>
          {a.result && <span className="ja-muted">{a.result}</span>}
        </div>
      )}
      {EDITABLE.includes(a.kind) && (
        <EditEmail
          open={editing}
          slack={a.kind === 'slack_message'}
          initial={a.body ?? ''}
          onClose={() => setEditing(false)}
          onSend={(body) => {
            setEditing(false);
            void calls.approve(a, body);
          }}
        />
      )}
    </div>
  );
}

function EditEmail({
  open,
  slack = false,
  initial,
  onClose,
  onSend,
}: {
  open: boolean;
  slack?: boolean;
  initial: string;
  onClose: () => void;
  onSend: (body: string) => void;
}) {
  const [text, setText] = useState(initial);
  return (
    <Dialog
      open={open}
      title={slack ? 'Edit the message' : 'Edit the email'}
      description={
        slack
          ? 'Change the text, then post it. Nothing is posted until you press Post.'
          : 'Change the text, then send it. Nothing is sent until you press Send.'
      }
      width={560}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" icon="send" onClick={() => onSend(text)} disabled={!text.trim()}>
            {slack ? 'Post' : 'Send'}
          </Button>
        </>
      }
    >
      <label htmlFor="ja-email" className="sr-only">
        {slack ? 'Message text' : 'Email text'}
      </label>
      <VoiceField value={text} onChange={setText}>
        <textarea
          id="ja-email"
          className="ja-textarea"
          rows={8}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </VoiceField>
    </Dialog>
  );
}

/** The request as a card inside the conversation (v2 design: purchase card under Jack's reply). */
export function JackActionInline({ a, onChanged }: { a: JackAction; onChanged: () => void }) {
  const [error, setError] = useState('');
  // A new request showing up in the chat: update the count in the header.
  useEffect(() => {
    if (a.status === 'pending') approvalsChanged();
  }, [a.id, a.status]);
  const calls = useJackActionCalls(
    () => onChanged(),
    (msg) => setError(msg),
  );
  const meta = ACTION_META[a.kind];
  return (
    <div className="ja-inline">
      <div className="ja-inline-head">
        <Icon name={meta.icon} size={18} />
        <span className="ja-inline-title">{a.title}</span>
        <Badge tone="warning" icon="hand">
          Waiting for you
        </Badge>
      </div>
      <dl className="ja-kv small">
        {a.details.slice(0, 4).map((d) => (
          <div key={d.label} className="ja-kv-row">
            <dt>{d.label}</dt>
            <dd className={d.label === 'Pay' ? 'strong' : undefined}>{d.value}</dd>
          </div>
        ))}
      </dl>
      {(a.blocked || error) && <p className="ja-warn">{error || a.blocked}</p>}
      <div className="ja-actions">
        <Button
          size="sm"
          variant="primary"
          icon="check"
          loading={calls.busy === a.id}
          disabled={!!a.blocked}
          onClick={() => void calls.approve(a)}
        >
          {meta.approve}
        </Button>
        <Link href="/approvals" className="as-btn secondary sm">
          <Icon name="pencil" size={16} />
          {EDITABLE.includes(a.kind) ? 'Edit' : 'Details'}
        </Link>
        <Button size="sm" variant="ghost" onClick={() => void calls.reject(a)}>
          Reject
        </Button>
        <span className="ja-muted ja-note">
          {a.kind === 'purchase'
            ? 'Nothing is paid until you approve.'
            : 'Nothing happens until you approve.'}
        </span>
      </div>
    </div>
  );
}

/** A row in the Approvals list for one of Jack's requests. */
export function JackActionRow({ a, on, pick }: { a: JackAction; on: boolean; pick: () => void }) {
  const jack = useJack(a.space);
  const meta = ACTION_META[a.kind];
  const st = actionState(a);
  const money = a.amount !== undefined ? ` · ${a.currency} ${a.amount.toLocaleString('en-US')}` : '';
  return (
    <button
      type="button"
      className={cx('tw-aprow', on && 'on')}
      onClick={pick}
      aria-current={on || undefined}
    >
      {a.status === 'pending' ? (
        <span className="ja-ic">
          <Icon name={meta.icon} size={18} />
        </span>
      ) : (
        <AgentAvatar captain jack={a.space} size={32} />
      )}
      <span className="grow">
        <span className="nm">{a.title}</span>
        {a.status === 'pending' ? (
          <span className="muted tm-sm">
            {jack.title} · {a.space === 'business' ? 'Business' : 'Personal'}
            {money}
          </span>
        ) : (
          <span>
            <Badge tone={st.tone} icon={false}>
              {st.label}
            </Badge>
          </span>
        )}
      </span>
    </button>
  );
}
