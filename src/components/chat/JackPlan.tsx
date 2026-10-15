import Link from 'next/link';
import { Icon, cx, type IconName } from '@/ui';
import type { ChatMessage, PlanStep } from '@/lib/chat/client';
import { JackActionInline } from '@/components/jack/JackAction';

const TOOL: Record<PlanStep['tool'], { icon: IconName; name: string }> = {
  doc: { icon: 'file-text', name: 'AI Docs' },
  image: { icon: 'image', name: 'AI Image' },
  team: { icon: 'users', name: 'AI Crews' },
  calendar: { icon: 'calendar', name: 'Google Calendar' },
  email: { icon: 'mail', name: 'Gmail' },
  browse: { icon: 'globe', name: 'Jack’s browser' },
  send_email: { icon: 'send', name: 'Gmail' },
  add_event: { icon: 'calendar', name: 'Google Calendar' },
};

const STATE: Record<PlanStep['status'], { icon: IconName; label: string }> = {
  running: { icon: 'loader-circle', label: 'Working' },
  waiting: { icon: 'hand', label: 'Needs you' },
  done: { icon: 'circle-check', label: 'Done' },
  failed: { icon: 'circle-alert', label: 'Didn’t finish' },
  skipped: { icon: 'circle-minus', label: 'Not started' },
};

/** What Jack started for one answer (v2 Conversation design: the cards above his reply). */
export function PlanCards({ steps, onActionChanged }: { steps: PlanStep[]; onActionChanged?: () => void }) {
  return (
    <ul className="jp-cards" aria-label="What Jack started">
      {steps.map((s, i) => {
        const body = (
          <>
            <span className="jp-tool">
              <Icon name={TOOL[s.tool].icon} size={18} />
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
  const answers = messages.filter((m) => m.role === 'assistant');
  const latest = [...answers].reverse().find((m) => m.plan.length);
  const last = answers.at(-1);
  const used = [...new Set(answers.flatMap((m) => m.plan.map((s) => s.tool)))];
  const credits = answers.reduce((n, m) => n + m.credits, 0);
  const model = liveModel ?? last?.modelName ?? null;
  return (
    <aside className="jp-panel" aria-label="Jack’s plan">
      <h2 className="jp-ov">Jack’s plan</h2>
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
          When Jack writes a document, makes images or hands work to your team, his plan shows here.
        </p>
      )}
      <div className="jp-rule" />
      <h2 className="jp-ov">Used for this</h2>
      <ul className="jp-used">
        {used.map((t) => (
          <li key={t}>
            <Icon name={TOOL[t].icon} size={16} />
            <span>{TOOL[t].name}</span>
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
        Answers so far: {credits} {credits === 1 ? 'credit' : 'credits'}
        {used.length ? '. Documents and images show their own cost.' : ''}
      </p>
    </aside>
  );
}
