'use client';
import { useState } from 'react';
import { Badge, Button, Chip, Dialog, Icon, Switch, cx } from '@/ui';
import { api, type Schemas } from '@/lib/api/client';
import { toApiError } from '@/lib/api/errors';
import { AgentAvatar } from './AgentAvatar';

/** An approval; from the v2 Approvals page it also says which space it belongs to. */
export type Approval = Schemas['ApprovalDto'] & { space?: 'personal' | 'business' };

/** Act in the approval's own space (the v2 Approvals page lists both spaces). */
const spaceHeaders = (a: Approval) => (a.space ? { 'x-aiainai-space': a.space } : undefined);
const SPACE_LABEL = { personal: 'Personal', business: 'Business' } as const;

const REASONS = ['Wrong tone', 'Wrong recipients', 'Not now', 'Something else'];

export function decisionBadge(a: Approval): { tone: 'success' | 'neutral' | 'warning'; label: string } {
  if (a.status === 'pending') return { tone: 'warning', label: 'Waiting for you' };
  switch (a.outcome) {
    case 'edited':
      return { tone: 'success', label: 'Approved with your edits' };
    case 'auto':
      return { tone: 'success', label: 'Went ahead (team runs on its own)' };
    case 'revise':
      return { tone: 'neutral', label: 'Rejected — new version coming' };
    case 'dropped':
      return { tone: 'neutral', label: 'Rejected — dropped' };
    default:
      return { tone: 'success', label: 'Approved' };
  }
}

/** Approve / Edit first / Reject, with the two dialogs from the design (reject, edit). */
export function useApprovalActions(onDone: (msg: string) => void, onError: (msg: string) => void) {
  const [busy, setBusy] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<Approval | null>(null);
  const [editing, setEditing] = useState<Approval | null>(null);

  const approve = async (a: Approval, opts: { draft?: string; always?: boolean } = {}) => {
    setBusy(a.id);
    const { data, error } = await api.POST('/api/team/approvals/{id}/approve', {
      params: { path: { id: a.id } },
      body: opts,
      headers: spaceHeaders(a),
    });
    setBusy(null);
    if (!data) return onError(toApiError(error).message);
    onDone(opts.draft !== undefined ? 'Approved with your edits' : 'Approved');
  };

  const reject = async (a: Approval, reason: string, next: 'revise' | 'drop') => {
    setBusy(a.id);
    const { data, error } = await api.POST('/api/team/approvals/{id}/reject', {
      params: { path: { id: a.id } },
      body: { reason, next },
      headers: spaceHeaders(a),
    });
    setBusy(null);
    if (!data) return onError(toApiError(error).message);
    onDone(next === 'revise' ? 'Sent back for a new version' : 'Dropped');
  };

  const dialogs = (
    <>
      <RejectDialog
        approval={rejecting}
        onClose={() => setRejecting(null)}
        onReject={(reason, next) => {
          const a = rejecting!;
          setRejecting(null);
          void reject(a, reason, next);
        }}
      />
      <EditDialog
        approval={editing}
        onClose={() => setEditing(null)}
        onSave={(draft) => {
          const a = editing!;
          setEditing(null);
          void approve(a, { draft });
        }}
      />
    </>
  );

  return { busy, approve, askReject: setRejecting, askEdit: setEditing, dialogs };
}

/** The approval card in the team room (design: TeamFlow room, approval message). */
export function ApprovalCard({
  a,
  actions,
}: {
  a: Approval;
  actions: ReturnType<typeof useApprovalActions>;
}) {
  const d = decisionBadge(a);
  return (
    <div className={cx('tm-card', 'tw-ap', a.status === 'pending' && 'pending')}>
      <div className="tm-card-top">
        <span className="tw-ap-ic">
          <Icon name="hand" size={18} />
        </span>
        <b className="tm-sm grow">{a.title}</b>
        <span className="tm-tag">{a.impact}</span>
      </div>
      <div className="tw-preview">
        {a.preview.map((l, i) => (
          <span key={i}>{l}</span>
        ))}
      </div>
      {a.status === 'pending' ? (
        <div className="tm-row">
          <Button
            size="sm"
            variant="primary"
            icon="check"
            loading={actions.busy === a.id}
            onClick={() => void actions.approve(a)}
          >
            Approve
          </Button>
          <Button size="sm" icon="pencil" onClick={() => actions.askEdit(a)}>
            Edit first
          </Button>
          <Button size="sm" variant="ghost" onClick={() => actions.askReject(a)}>
            Reject
          </Button>
        </div>
      ) : (
        <div>
          <Badge tone={d.tone} icon={false}>
            {d.label}
          </Badge>
        </div>
      )}
    </div>
  );
}

/** Approvals page (design: TeamFlow approvals): waiting and decided on the left, the selected one on the right. */
export function ApprovalsView({
  list,
  mode,
  actions,
}: {
  list: { pending: Approval[]; decided: Approval[] };
  mode: 'important' | 'all' | 'auto';
  actions: ReturnType<typeof useApprovalActions>;
}) {
  const [selId, setSelId] = useState<string | null>(null);
  const all = [...list.pending, ...list.decided];
  const sel = all.find((a) => a.id === selId) ?? list.pending[0] ?? null;
  return (
    <div className="tw-aps">
      <div className="tw-aps-list">
        <div className="tm-ov tw-aps-h">Waiting for you · {list.pending.length}</div>
        {list.pending.map((a) => (
          <ApprovalRow key={a.id} a={a} on={sel?.id === a.id} pick={() => setSelId(a.id)} />
        ))}
        {!list.pending.length && <div className="muted tm-sm tw-aps-none">Nothing is waiting for you.</div>}
        {list.decided.length > 0 && <div className="tm-ov tw-aps-h">Decided</div>}
        {list.decided.map((a) => (
          <ApprovalRow key={a.id} a={a} on={sel?.id === a.id} pick={() => setSelId(a.id)} decided />
        ))}
      </div>
      <main className="tw-aps-main">
        <ApprovalDetail sel={sel} mode={mode} actions={actions} />
      </main>
    </div>
  );
}

/** The selected approval: exactly what will happen, why Jack is asking, and the decision. */
export function ApprovalDetail({
  sel,
  mode,
  actions,
}: {
  sel: Approval | null;
  mode: 'important' | 'all' | 'auto';
  actions: ReturnType<typeof useApprovalActions>;
}) {
  const [always, setAlways] = useState(false);
  const d = sel ? decisionBadge(sel) : null;
  return (
    <>
      {sel && d ? (
        <>
          <div className="tm-card-top">
            <AgentAvatar icon={sel.agentIcon} size={40} />
            <div className="grow">
              <div className="title">{sel.title}</div>
              <div className="muted tm-sm">
                Requested by {sel.agentName} · checked by Captain Jack
                {sel.space ? ` · ${SPACE_LABEL[sel.space]} space` : ''}
              </div>
            </div>
            <Badge tone="warning" icon={false}>
              {sel.impact}
            </Badge>
          </div>
          <div className="tm-card">
            <div className="tm-ov">Exactly what will happen</div>
            <div className="tw-preview big">
              {sel.preview.map((l, i) => (
                <span key={i}>{l}</span>
              ))}
            </div>
            {sel.tool && (
              <span className="muted tm-sm">
                Goes out through {sel.tool}. It isn&apos;t connected yet, so an approved draft waits until you
                connect it.
              </span>
            )}
          </div>
          {sel.status === 'pending' && mode !== 'auto' && (
            <div className="tm-card tw-why">
              <span className="tm-sm grow">
                Why Jack is asking: your team setting asks before <b>{sel.kindLabel.toLowerCase()}</b>.
              </span>
              <Switch checked={always} onChange={setAlways} label={`Always allow for ${sel.agentName}`} />
            </div>
          )}
          {sel.status === 'pending' ? (
            <div className="tm-row">
              <Button
                variant="primary"
                icon="check"
                loading={actions.busy === sel.id}
                onClick={() => void actions.approve(sel, always ? { always: true } : {})}
              >
                Approve
              </Button>
              <Button icon="pencil" onClick={() => actions.askEdit(sel)}>
                Edit first
              </Button>
              <Button variant="ghost" onClick={() => actions.askReject(sel)}>
                Reject
              </Button>
            </div>
          ) : (
            <div className="tw-decided">
              <Badge tone={d.tone} icon={false}>
                {d.label}
              </Badge>
              {sel.note && <span className="muted tm-sm">Reason: {sel.note}</span>}
            </div>
          )}
        </>
      ) : (
        <div className="tw-caught-up">
          <span className="ok">
            <Icon name="circle-check" size={40} />
          </span>
          <div className="title">You&apos;re all caught up</div>
          <div className="muted tm-sm">
            When an agent needs your OK, Jack puts it here and in the team room.
          </div>
        </div>
      )}
    </>
  );
}

export function ApprovalRow({
  a,
  on,
  pick,
  decided,
}: {
  a: Approval;
  on: boolean;
  pick: () => void;
  decided?: boolean;
}) {
  const d = decisionBadge(a);
  return (
    <button
      type="button"
      className={cx('tw-aprow', on && 'on')}
      onClick={pick}
      aria-current={on || undefined}
    >
      <AgentAvatar icon={a.agentIcon} size={32} />
      <span className="grow">
        <span className="nm">{a.title}</span>
        {decided ? (
          <span>
            <Badge tone={d.tone} icon={false}>
              {d.label}
            </Badge>
          </span>
        ) : (
          <span className="muted tm-sm">
            {a.agentName} · {a.space ? `${SPACE_LABEL[a.space]} · ` : ''}
            {a.kindLabel}
          </span>
        )}
      </span>
    </button>
  );
}

function RejectDialog({
  approval,
  onClose,
  onReject,
}: {
  approval: Approval | null;
  onClose: () => void;
  onReject: (reason: string, next: 'revise' | 'drop') => void;
}) {
  const [reason, setReason] = useState(0);
  const [next, setNext] = useState<'revise' | 'drop'>('revise');
  return (
    <Dialog
      open={!!approval}
      title="Reject this action?"
      description="Tell the agent why, so it can try again the right way. Nothing has been sent or changed."
      width={520}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Back
          </Button>
          <Button variant="primary" onClick={() => onReject(REASONS[reason]!, next)}>
            Reject
          </Button>
        </>
      }
    >
      <div className="tm-chips">
        {REASONS.map((r, i) => (
          <Chip key={r} shape="tag" selected={reason === i} onClick={() => setReason(i)}>
            {r}
          </Chip>
        ))}
      </div>
      <div className="tw-choices" role="radiogroup" aria-label="Then">
        {(
          [
            ['revise', 'rotate-ccw', `Ask ${approval?.agentName ?? 'the agent'} for a new version`],
            ['drop', 'x', 'Drop this task'],
          ] as const
        ).map(([v, icon, label]) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={next === v}
            className={cx('tw-choice', next === v && 'on')}
            onClick={() => setNext(v)}
          >
            <Icon name={icon} size={18} />
            {label}
          </button>
        ))}
      </div>
    </Dialog>
  );
}

function EditDialog({
  approval,
  onClose,
  onSave,
}: {
  approval: Approval | null;
  onClose: () => void;
  onSave: (draft: string) => void;
}) {
  const [text, setText] = useState('');
  const [forId, setForId] = useState<string | null>(null);
  if (approval && approval.id !== forId) {
    setForId(approval.id);
    setText(approval.draft || approval.preview.join('\n'));
  }
  return (
    <Dialog
      open={!!approval}
      title="Edit before approving"
      description="Change the draft, then approve it. The agent learns from your edits."
      width={600}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" icon="check" disabled={!text.trim()} onClick={() => onSave(text)}>
            Save and approve
          </Button>
        </>
      }
    >
      <textarea
        className="tw-edit"
        aria-label="Edit draft"
        rows={8}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
    </Dialog>
  );
}
