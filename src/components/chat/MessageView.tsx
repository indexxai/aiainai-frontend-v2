'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Badge, Button, Icon, IconButton, cx } from '@/ui';
import type { ChatMessage } from '@/lib/chat/client';
import type { Live } from '@/lib/chat/useChatThread';
import { Markdown } from './Markdown';
import { PlanCards } from './JackPlan';
import { AgentAvatar } from '@/components/team/AgentAvatar';

export interface AnswerActions {
  latest: boolean;
  busy: boolean;
  onRegenerate: (model?: string) => void;
  onContinue: () => void;
  onFeedback: (v: 'up' | 'down' | null) => void;
  /** Forget something Jack remembered from the message before this answer. */
  onForget?: (memoryId: string) => void;
  /** A purchase, email or event Jack asked about was approved or rejected. */
  onActionChanged?: () => void;
  /** When plan credits come back, for the "not enough credits" card. */
  resetsOn?: string;
}

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <IconButton
      icon={done ? 'check' : 'copy'}
      size="sm"
      label={done ? 'Copied' : label}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          // clipboard blocked; nothing to do
        }
      }}
    />
  );
}

export function UserMessage({ m }: { m: ChatMessage }) {
  return (
    <div className="ch-user">
      <div className="ch-bubble">{m.content}</div>
      <div className="ch-actions end">
        <CopyButton text={m.content} label="Copy message" />
      </div>
    </div>
  );
}

/** Answer header (v2): Captain Jack, the model that wrote it, whether Auto chose, and what it cost. */
function AnswerHead({ m, live }: { m: ChatMessage; live: Live | null }) {
  const name = live?.modelName ?? m.modelName;
  const auto = live ? live.auto : m.auto;
  const streaming = m.status === 'streaming';
  const lead = streaming
    ? name
      ? `Writing with ${name}`
      : m.plan.length
        ? 'Writing…'
        : 'Thinking…'
    : m.status === 'failed'
      ? name && m.content
        ? `Started with ${name}`
        : name
          ? `Tried ${name}`
          : 'Not sent'
      : name;
  return (
    <div className="ch-head">
      <AgentAvatar captain size={24} className="ch-jack" />
      <b>Captain Jack</b>
      {lead && <span className="dot">{lead}</span>}
      {name && auto && <span className="dot">chosen by Auto</span>}
      {m.status === 'complete' && m.credits > 0 && <span className="dot">{m.credits}× credits</span>}
    </div>
  );
}

export function AnswerMessage({
  m,
  live,
  actions,
}: {
  m: ChatMessage;
  live: Live | null;
  actions: AnswerActions;
}) {
  const streaming = m.status === 'streaming';
  return (
    <div className={cx('ch-answer', streaming && 'streaming')} aria-busy={streaming || undefined}>
      <AnswerHead m={m} live={live} />
      {m.plan.length > 0 && <PlanCards steps={m.plan} onActionChanged={actions.onActionChanged} />}
      {m.content ? (
        <Markdown text={m.content} />
      ) : (
        streaming && (
          <div className="ch-typing" aria-label="Writing">
            <i />
            <i />
            <i />
          </div>
        )
      )}

      {m.learned.length > 0 && (
        <div className="ch-learned">
          <Icon name="brain" size={14} />
          <span>
            Jack remembered:{' '}
            {m.learned.map((l, i) => (
              <span key={l.id}>
                {i > 0 && ' · '}
                {l.text}{' '}
                <button type="button" className="ch-forget" onClick={() => actions.onForget?.(l.id)}>
                  Forget<span className="sr-only"> “{l.text}”</span>
                </button>
              </span>
            ))}
          </span>
          <Link href="/memory" className="ch-forget">
            Memory
          </Link>
        </div>
      )}

      {m.status === 'complete' && (
        <div className="ch-actions">
          <CopyButton text={m.content} label="Copy answer" />
          <IconButton
            icon="thumbs-up"
            size="sm"
            label="Good answer"
            pressed={m.feedback === 'up'}
            onClick={() => actions.onFeedback(m.feedback === 'up' ? null : 'up')}
          />
          <IconButton
            icon="thumbs-down"
            size="sm"
            label="Bad answer"
            pressed={m.feedback === 'down'}
            onClick={() => actions.onFeedback(m.feedback === 'down' ? null : 'down')}
          />
          {actions.latest && (
            <IconButton
              icon="rotate-ccw"
              size="sm"
              label="Regenerate"
              disabled={actions.busy}
              onClick={() => actions.onRegenerate()}
            />
          )}
        </div>
      )}

      {m.status === 'stopped' && (
        <div className="ch-card">
          <Icon name="circle-pause" size={18} className="ch-card-ic" />
          <p className="ch-card-txt">
            {m.credits > 0
              ? `You stopped this answer. It used ${m.credits} ${m.credits === 1 ? 'credit' : 'credits'}.`
              : 'You stopped this answer before it started. No credits were used.'}
          </p>
          {actions.latest && (
            <span className="ch-card-btns">
              {m.content && (
                <Button size="sm" icon="play" disabled={actions.busy} onClick={actions.onContinue}>
                  Continue
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                icon="rotate-ccw"
                disabled={actions.busy}
                onClick={() => actions.onRegenerate()}
              >
                Regenerate
              </Button>
            </span>
          )}
        </div>
      )}

      {m.status === 'failed' && <FailedCard m={m} actions={actions} />}
    </div>
  );
}

function FailedCard({ m, actions }: { m: ChatMessage; actions: AnswerActions }) {
  const code = m.error?.code ?? 'service_unavailable';
  if (code === 'insufficient_credits') {
    return (
      <div className="ch-card error">
        <span className="ch-card-badge">
          <Icon name="zap" size={16} />
        </span>
        <div className="ch-card-body">
          <div className="ch-card-title">
            Not enough credits <Badge icon={false}>Usage limit reached</Badge>
          </div>
          <p className="ch-card-txt">
            This answer needs more credits than you have left. Top up
            {actions.resetsOn ? `, or wait until your credits reset on ${actions.resetsOn}` : ''}.
          </p>
        </div>
        <Link href="/settings/billing" className="as-btn primary sm">
          Top up
        </Link>
      </div>
    );
  }
  if (code === 'upgrade_required') {
    return (
      <div className="ch-card error">
        <span className="ch-card-badge">
          <Icon name="lock" size={16} />
        </span>
        <div className="ch-card-body">
          <div className="ch-card-title">{m.error?.message ?? 'This model is on Jack Personal'}</div>
          <p className="ch-card-txt">Upgrade to use it, or answer with Auto instead.</p>
        </div>
        <span className="ch-card-btns">
          {actions.latest && (
            <Button
              size="sm"
              variant="ghost"
              disabled={actions.busy}
              onClick={() => actions.onRegenerate('auto')}
            >
              Use Auto
            </Button>
          )}
          <Link href="/settings/billing" className="as-btn primary sm">
            Upgrade
          </Link>
        </span>
      </div>
    );
  }
  return (
    <div className="ch-card error">
      <span className="ch-card-badge danger">
        <Icon name="circle-alert" size={16} />
      </span>
      <div className="ch-card-body">
        <div className="ch-card-title">
          The answer didn’t finish{' '}
          <Badge tone="danger" icon={false}>
            Failed
          </Badge>
        </div>
        <p className="ch-card-txt">{m.error?.message ?? 'Something went wrong. No credits were charged.'}</p>
      </div>
      {actions.latest && (
        <Button size="sm" icon="rotate-ccw" disabled={actions.busy} onClick={() => actions.onRegenerate()}>
          Retry
        </Button>
      )}
    </div>
  );
}
