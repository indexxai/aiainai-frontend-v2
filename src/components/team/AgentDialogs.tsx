'use client';
import { useState } from 'react';
import { Banner, Button, Chip, Dialog, Icon, Tabs, cx, type IconName } from '@/ui';
import { ModelPicker } from '@/components/models/ModelPicker';
import { api, type Schemas } from '@/lib/api/client';
import { toApiError } from '@/lib/api/errors';
import type { ModelMenu } from '@/lib/models';
import type { Agent } from '@/lib/team/types';
import { AgentAvatar } from './AgentAvatar';
import { ToolTags } from './TeamSetup';

type Draft = Schemas['DraftAgentDto'];
export type Rule = Agent['rule'];

export const RULES: { value: Rule; label: string }[] = [
  { value: 'team', label: 'Team setting' },
  { value: 'ask', label: 'Always ask me' },
  { value: 'auto', label: 'Automatic' },
];

/** Common roles (design: TeamFlow add agent, "Pick a role"). */
const ROLES: { label: string; icon: IconName; text: string }[] = [
  {
    label: 'Research',
    icon: 'search',
    text: 'A research agent that finds local competitors, their services and prices',
  },
  {
    label: 'Marketing',
    icon: 'megaphone',
    text: 'A marketing agent that plans a weekly content calendar and writes social posts',
  },
  { label: 'Email', icon: 'mail', text: 'An email agent that drafts replies and follow-ups for my approval' },
  { label: 'CRM', icon: 'contact', text: 'A CRM agent that keeps contacts and deals up to date' },
  {
    label: 'Documents',
    icon: 'file-text',
    text: 'A documents agent that drafts proposals, quotes and reports',
  },
  { label: 'Designer', icon: 'pen-tool', text: 'A designer that creates posters, ads and social graphics' },
  { label: 'Reviews', icon: 'star', text: 'An agent that drafts replies to customer reviews' },
  { label: 'Bookings', icon: 'calendar', text: 'An agent that handles booking requests and reminders' },
  { label: 'Reporting', icon: 'chart-column', text: 'An agent that builds weekly and monthly reports' },
];
const EXAMPLES = [
  'A research agent for competitor prices',
  'Someone to answer reviews',
  'A bookkeeping helper for invoices',
];

/**
 * Add an agent in two steps (design: TeamFlow add-describe / add-roles / add-review / add-duplicate):
 * describe it or pick a role, Jack drafts it, you check it, it joins the team.
 */
export function AddAgentDialog({
  open,
  menu,
  onClose,
  onAdded,
}: {
  open: boolean;
  menu: ModelMenu;
  onClose: () => void;
  onAdded: (agent: Agent) => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [tab, setTab] = useState<'describe' | 'pick'>('describe');
  const [text, setText] = useState('');
  const [role, setRole] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [name, setName] = useState('');
  const [model, setModel] = useState('auto');
  const [rule, setRule] = useState<Rule>('team');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const close = () => {
    setStep(1);
    setDraft(null);
    setError('');
    onClose();
  };

  const describe = tab === 'describe' ? text.trim() : (ROLES.find((r) => r.label === role)?.text ?? '');

  const makeDraft = async () => {
    setBusy(true);
    setError('');
    const { data, error: err } = await api.POST('/api/team/agents/draft', {
      body: { description: describe },
    });
    setBusy(false);
    if (!data) return setError(toApiError(err).message);
    setDraft(data);
    setName(data.name);
    setStep(2);
  };

  const add = async () => {
    if (!draft) return;
    setBusy(true);
    setError('');
    const { data, error: err } = await api.POST('/api/team/agents', {
      body: {
        name: name.trim() || draft.name,
        icon: draft.icon,
        does: draft.does,
        duties: draft.duties,
        tools: draft.tools.map((t) => t.label),
        model,
        rule,
      },
    });
    if (!data) {
      setBusy(false);
      return setError(toApiError(err).message);
    }
    // Jack writes its instructions before it starts.
    const ready = await api.POST('/api/team/agents/{id}/prepare', { params: { path: { id: data.id } } });
    setBusy(false);
    onAdded(ready.data ?? data);
    close();
  };

  if (step === 2 && draft)
    return (
      <Dialog
        open={open}
        title="Check your new agent"
        step="Step 2 of 2"
        description="Jack drafted this from your description. Change anything before it joins the team."
        width={600}
        onClose={close}
        className="tw-dialog"
        footer={
          <>
            <Button variant="ghost" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button variant="primary" icon="user-plus" loading={busy} onClick={() => void add()}>
              Add {name.trim() || draft.name}
            </Button>
          </>
        }
      >
        {draft.duplicateOf && (
          <Banner tone="warning" actionLabel="Keep my team as is" onAction={close}>
            You already have a {draft.duplicateOf.name} agent. Jack suggests giving this work to it instead of
            adding another.
          </Banner>
        )}
        <div className="tm-card-top">
          <AgentAvatar icon={draft.icon} size={48} />
          <label className="tw-field grow">
            <span className="muted tm-sm">Name</span>
            <input
              className="tw-input"
              aria-label="Agent name"
              value={name}
              maxLength={40}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
        </div>
        <div className="tw-col">
          <div className="tm-ov">What it will do</div>
          <div className="tw-preview big">
            {(draft.duties.length ? draft.duties : [draft.does]).map((d, i) => (
              <span key={i}>· {d}</span>
            ))}
          </div>
        </div>
        <div className="tw-col">
          <div className="tm-ov">Tools and access</div>
          <ToolTags tools={draft.tools} />
        </div>
        <div className="tw-col">
          <div className="tm-ov">Model</div>
          <div className="tm-card-top">
            <ModelPicker menu={menu} value={model} onChange={setModel} align="start" />
            <span className="muted tm-sm">Auto lets Jack pick the best model for each task.</span>
          </div>
        </div>
        <div className="tw-col">
          <div className="tm-ov">Before acting</div>
          <div className="tm-chips">
            {RULES.map((r) => (
              <Chip key={r.value} shape="tag" selected={rule === r.value} onClick={() => setRule(r.value)}>
                {r.label}
              </Chip>
            ))}
          </div>
        </div>
        <div className="tm-card-top muted tm-sm">
          <AgentAvatar captain size={20} />
          Reports to Captain Jack
        </div>
        {error && (
          <span className="tw-err" role="alert">
            {error}
          </span>
        )}
      </Dialog>
    );

  return (
    <Dialog
      open={open}
      title="Add an agent"
      step="Step 1 of 2"
      description="Describe what you need, or start from a common role. Jack drafts the agent for you to check."
      width={600}
      onClose={close}
      className="tw-dialog"
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button
            variant="primary"
            icon="sparkles"
            loading={busy}
            disabled={describe.length < 3}
            onClick={() => void makeDraft()}
          >
            Draft the agent
          </Button>
        </>
      }
    >
      <Tabs
        variant="segmented"
        label="How to add"
        value={tab}
        onChange={(v) => setTab(v as 'describe' | 'pick')}
        items={[
          { value: 'describe', label: 'Describe it' },
          { value: 'pick', label: 'Pick a role' },
        ]}
      />
      {tab === 'describe' ? (
        <>
          <label className="tw-field">
            <span className="tm-sm tw-lbl">What should this agent do?</span>
            <textarea
              className="tw-edit"
              aria-label="Describe the agent"
              rows={4}
              maxLength={1000}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </label>
          <div className="tm-chips">
            <span className="muted tm-sm">For example:</span>
            {EXAMPLES.map((e) => (
              <Chip key={e} shape="tag" onClick={() => setText(e)}>
                {e}
              </Chip>
            ))}
          </div>
        </>
      ) : (
        <div className="tw-roles">
          {ROLES.map((r) => (
            <button
              key={r.label}
              type="button"
              className={cx('tw-role', role === r.label && 'on')}
              aria-pressed={role === r.label}
              onClick={() => setRole(r.label)}
            >
              <AgentAvatar icon={r.icon} size={28} />
              {r.label}
            </button>
          ))}
        </div>
      )}
      {error && (
        <span className="tw-err" role="alert">
          {error}
        </span>
      )}
    </Dialog>
  );
}

/** The team is full on this plan (design: TeamFlow limit). */
export function TeamFullDialog({
  open,
  limit,
  onClose,
}: {
  open: boolean;
  limit: number;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={open}
      title="Your team is full on Free"
      description={`Jack Free includes Captain Jack and up to ${limit} agents. Captain Jack Team can have up to 10 agents.`}
      width={480}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Not now
          </Button>
          <a href="/settings/billing" className="as-btn primary">
            <Icon name="zap" size={16} />
            Upgrade to Jack Personal
          </a>
        </>
      }
    >
      <span className="muted tm-sm">You can also remove an agent you no longer need, then add this one.</span>
    </Dialog>
  );
}

/** Edit an agent's name, job and instructions. */
export function EditAgentDialog({
  agent,
  onClose,
  onSaved,
}: {
  agent: Agent | null;
  onClose: () => void;
  onSaved: (a: Agent) => void;
}) {
  const [form, setForm] = useState({ name: '', role: '', instructions: '' });
  const [forId, setForId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (agent && agent.id !== forId) {
    setForId(agent.id);
    setForm({ name: agent.name, role: agent.role, instructions: agent.instructions });
  }
  const save = async () => {
    if (!agent) return;
    setBusy(true);
    const { data, error: err } = await api.PATCH('/api/team/agents/{id}', {
      params: { path: { id: agent.id } },
      body: { name: form.name, role: form.role, instructions: form.instructions },
    });
    setBusy(false);
    if (!data) return setError(toApiError(err).message);
    onSaved(data);
  };
  return (
    <Dialog
      open={!!agent}
      title={`Edit ${agent?.name ?? 'agent'}`}
      description="Change what this agent is called, what it does and how it works."
      width={600}
      onClose={onClose}
      className="tw-dialog"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            icon="check"
            loading={busy}
            disabled={!form.name.trim() || !form.role.trim()}
            onClick={() => void save()}
          >
            Save
          </Button>
        </>
      }
    >
      <label className="tw-field">
        <span className="tm-sm tw-lbl">Name</span>
        <input
          className="tw-input"
          value={form.name}
          maxLength={40}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </label>
      <label className="tw-field">
        <span className="tm-sm tw-lbl">What it does</span>
        <input
          className="tw-input"
          value={form.role}
          maxLength={200}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
        />
      </label>
      <label className="tw-field">
        <span className="tm-sm tw-lbl">Instructions</span>
        <textarea
          className="tw-edit"
          rows={8}
          maxLength={8000}
          value={form.instructions}
          onChange={(e) => setForm({ ...form, instructions: e.target.value })}
        />
        <span className="muted tm-sm">Written by Captain Jack when the agent joined. Edit freely.</span>
      </label>
      {error && (
        <span className="tw-err" role="alert">
          {error}
        </span>
      )}
    </Dialog>
  );
}

/** Remove an agent: what happens to its open tasks (design: TeamFlow remove). */
export function RemoveAgentDialog({
  agent,
  others,
  openTasks,
  onClose,
  onRemoved,
}: {
  agent: Agent | null;
  others: Agent[];
  openTasks: number;
  onClose: () => void;
  onRemoved: (name: string) => void;
}) {
  const [choice, setChoice] = useState<'jack' | 'agent' | 'cancel'>('jack');
  const [busy, setBusy] = useState(false);
  const other = others.find((o) => o.id !== agent?.id && !o.paused);
  const choices = [
    {
      value: 'jack' as const,
      icon: 'compass' as const,
      label: 'Let Captain Jack reassign them',
      sub: 'Jack gives each task to the best-suited agent',
    },
    ...(other
      ? [
          {
            value: 'agent' as const,
            icon: 'arrow-right-left' as const,
            label: `Give them all to ${other.name}`,
            sub: `Moves ${openTasks} open task${openTasks === 1 ? '' : 's'}`,
          },
        ]
      : []),
    {
      value: 'cancel' as const,
      icon: 'ban' as const,
      label: 'Cancel the open tasks',
      sub: 'Finished work stays in Docs and Images',
    },
  ];
  const remove = async () => {
    if (!agent) return;
    setBusy(true);
    await api.POST('/api/team/agents/{id}/remove', {
      params: { path: { id: agent.id } },
      body: { openTasks: choice, ...(choice === 'agent' && other && { to: other.id }) },
    });
    setBusy(false);
    onRemoved(agent.name);
  };
  return (
    <Dialog
      open={!!agent}
      title={`Remove ${agent?.name ?? 'agent'}?`}
      description={`${openTasks ? `It has ${openTasks} open task${openTasks === 1 ? '' : 's'}. ` : ''}Its finished work stays in Docs and Images, and you can add a similar agent later.`}
      width={520}
      onClose={onClose}
      className="tw-dialog"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Keep agent
          </Button>
          <Button variant="danger" icon="trash-2" loading={busy} onClick={() => void remove()}>
            Remove agent
          </Button>
        </>
      }
    >
      {openTasks > 0 && (
        <>
          <div className="tm-ov">What should happen to its open tasks?</div>
          <div className="tw-choices" role="radiogroup" aria-label="Open tasks">
            {choices.map((c) => (
              <button
                key={c.value}
                type="button"
                role="radio"
                aria-checked={choice === c.value}
                className={cx('tw-choice', choice === c.value && 'on')}
                onClick={() => setChoice(c.value)}
              >
                <Icon name={c.icon} size={18} />
                <span className="tw-choice-txt">
                  <b>{c.label}</b>
                  <span className="muted tm-sm">{c.sub}</span>
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </Dialog>
  );
}
