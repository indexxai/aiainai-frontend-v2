'use client';
import { useJack } from '@/lib/assistant';
import Link from 'next/link';
import { Badge, Icon, cx, type IconName } from '@/ui';
import { useSpace } from '@/lib/space-context';
import { JackImg } from '@/components/jack/JackImg';
import type { ChatMessage, PlanStep } from '@/lib/chat/client';
import { JackActionInline } from '@/components/jack/JackAction';
import { Markdown } from './Markdown';

const TOOL: Record<PlanStep['tool'], { icon: IconName; name: string }> = {
  doc: { icon: 'file-text', name: 'AI Docs' },
  image: { icon: 'image', name: 'AI Image' },
  calendar: { icon: 'calendar', name: 'Google Calendar' },
  email: { icon: 'mail', name: 'Gmail' },
  browse: { icon: 'globe', name: 'Jack’s browser' },
  send_email: { icon: 'send', name: 'Gmail' },
  add_event: { icon: 'calendar', name: 'Google Calendar' },
  drive: { icon: 'hard-drive', name: 'Google Drive' },
  slack: { icon: 'hash', name: 'Slack' },
  send_slack: { icon: 'hash', name: 'Slack' },
};

/** Steps saved by tools that no longer exist (e.g. AI Crews in older chats) still show. */
const toolOf = (t: string) => TOOL[t as PlanStep['tool']] ?? { icon: 'sparkles' as IconName, name: 'Jack' };

const STATE: Record<PlanStep['status'], { icon: IconName; label: string }> = {
  running: { icon: 'loader-circle', label: 'Working' },
  waiting: { icon: 'hand', label: 'Needs you' },
  done: { icon: 'circle-check', label: 'Done' },
  failed: { icon: 'circle-alert', label: 'Didn’t finish' },
  skipped: { icon: 'circle-minus', label: 'Not started' },
};

/** What Jack started for one answer (v2 Conversation design: the cards above his reply). */
export function PlanCards({ steps, onActionChanged }: { steps: PlanStep[]; onActionChanged?: () => void }) {
  const jack = useJack();
  return (
    <ul className="jp-cards" aria-label={`What ${jack.name} started`}>
      {steps.map((s, i) => {
        const body = (
          <>
            <span className="jp-tool">
              <Icon name={toolOf(s.tool).icon} size={18} />
            </span>
            <span className="jp-text">
              <span className="jp-title">{s.title}</span>
              <span className="jp-detail">{s.detail}</span>
            </span>
            <StepState status={s.status} />
            {s.href && <Icon name="arrow-right" size={16} className="jp-go" />}
          </>
        );
        return (
          <li key={i}>
            {s.href ? (
              <Link href={s.href} className={cx('jp-card', s.status)}>
                {body}
              </Link>
            ) : (
              <div className={cx('jp-card', s.status)}>{body}</div>
            )}
            {s.action?.status === 'pending' && (
              <JackActionInline a={s.action} onChanged={() => onActionChanged?.()} />
            )}
            {s.result && (
              <section className="jp-result" aria-label={`What ${jack.name} found`}>
                <h3 className="jp-ov">What {jack.name} found</h3>
                <Markdown text={s.result} />
              </section>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function StepState({ status }: { status: PlanStep['status'] }) {
  const st = STATE[status];
  return (
    <span className={cx('jp-state', status)} title={st.label}>
      <Icon name={st.icon} size={16} className={status === 'running' ? 'as-spin' : undefined} />
      <span className="sr-only">{st.label}</span>
    </span>
  );
}

/**
 * The right-hand panel (v2 Conversation design): Jack's latest plan, which tools were used,
 * which model answered, and what the answers cost so far.
 */
export function PlanPanel({ messages, liveModel }: { messages: ChatMessage[]; liveModel: string | null }) {
  const jack = useJack();
  const answers = messages.filter((m) => m.role === 'assistant');
  const latest = [...answers].reverse().find((m) => m.plan.length);
  const last = answers.at(-1);
  const used = [...new Set(answers.flatMap((m) => m.plan.map((s) => s.tool)))];
  const credits = answers.reduce((n, m) => n + m.credits, 0);
  const model = liveModel ?? last?.modelName ?? null;
  const steps = latest?.plan ?? [];
  const status =
    last?.status === 'streaming' || liveModel || steps.some((s) => s.status === 'running')
      ? 'working'
      : steps.some((s) => s.status === 'waiting' || s.action?.status === 'pending')
        ? 'waiting'
        : 'ready';
  return (
    <aside className="jp-panel" aria-label={`${jack.name}’s plan`}>
      <JackCard status={status} />
      <h2 className="jp-ov">{jack.name}’s plan</h2>
      {latest ? (
        <ol className="jp-steps">
          {latest.plan.map((s, i) => (
            <li key={i} className={cx('jp-step', s.status)}>
              <StepState status={s.status} />
              <span>
                {s.href ? <Link href={s.href}>{s.title}</Link> : s.title}
                <span className="jp-detail">{s.detail}</span>
              </span>
            </li>
          ))}
          <li className="jp-step done">
            <StepState status={last?.status === 'streaming' ? 'running' : 'done'} />
            <span>
              Answer you
              <span className="jp-detail">{last?.status === 'streaming' ? 'Writing now' : 'Done'}</span>
            </span>
          </li>
        </ol>
      ) : (
        <p className="jp-muted">
          When {jack.name} writes a document, makes images or uses your apps, his plan shows here.
        </p>
      )}
      <div className="jp-rule" />
      <h2 className="jp-ov">Used for this</h2>
      <ul className="jp-used">
        {used.map((t) => (
          <li key={t}>
            <Icon name={toolOf(t).icon} size={16} />
            <span>{t === 'browse' ? `${jack.name}’s browser` : toolOf(t).name}</span>
          </li>
        ))}
        <li>
          <Icon name="message-square" size={16} />
          <span>Conversation</span>
        </li>
      </ul>
      <div className="jp-rule" />
      <h2 className="jp-ov">Models</h2>
      <p className="jp-muted">
        {model
          ? `${last?.auto ? 'Chosen by Auto: ' : ''}${model} answered.`
          : 'Auto picks the model for each step.'}
      </p>
      <p className="jp-muted jp-foot">
        Answers shown here: {credits} {credits === 1 ? 'credit' : 'credits'}
        {used.length ? '. Documents and images show their own cost.' : ''}
      </p>
    </aside>
  );
}

/** Jack at the top of the panel (v2 Conversation design): who he is and what he is doing now. */
function JackCard({ status }: { status: 'working' | 'waiting' | 'ready' }) {
  const space = useSpace();
  const jack = useJack();
  return (
    <section className="jp-jack" aria-label={jack.name}>
      <div className="jp-jack-art" aria-hidden="true">
        <JackImg space={space} part="full" className="jp-jack-img" />
        <div className="jp-jack-shadow" />
      </div>
      <div className="jp-jack-text">
        <div className="jp-jack-name">{jack.name}</div>
        <div className="jp-muted">
          {space === 'business' ? 'Your business assistant' : 'Your personal assistant'}
        </div>
        <div>
          {status === 'working' ? (
            <Badge tone="info">Working</Badge>
          ) : status === 'waiting' ? (
            <Badge tone="warning" icon="hand">
              Waiting for your OK
            </Badge>
          ) : (
            <Badge tone="neutral" icon="circle-check">
              Ready
            </Badge>
          )}
        </div>
      </div>
    </section>
  );
}
