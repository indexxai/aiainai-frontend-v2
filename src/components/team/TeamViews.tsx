'use client';
import { useState } from 'react';
import { Badge, Button, Chip, Dialog, Icon, Switch, cx, type IconName } from '@/ui';
import { ModelPicker } from '@/components/models/ModelPicker';
import { api, type Schemas } from '@/lib/api/client';
import { toApiError } from '@/lib/api/errors';
import type { ModelMenu } from '@/lib/models';
import type { Agent, Team, TeamMode } from '@/lib/team/types';
import { AgentAvatar, AgentStatus } from './AgentAvatar';
import { RULES, type Rule } from './AgentDialogs';
import { ToolTags } from './TeamSetup';

type Task = Schemas['TaskDto'];

/* ── Tasks board (design: TeamFlow tasks) ─────────────────────────────────── */

const COLUMNS: { title: string; has: Task['status'][] }[] = [
  { title: 'Planned', has: ['queued'] },
  { title: 'In progress', has: ['running'] },
  { title: 'Needs you', has: ['waiting_approval'] },
  { title: 'Done', has: ['done', 'failed', 'cancelled'] },
];
const NOTE: Partial<Record<Task['status'], { icon: IconName; text: string }>> = {
  failed: { icon: 'circle-alert', text: 'Didn’t finish' },
  cancelled: { icon: 'ban', text: 'Cancelled' },
  waiting_approval: { icon: 'hand', text: 'Waiting for your OK' },
};
const STATUS: Record<Task['status'], Agent['status']> = {
  queued: 'idle',
  running: 'working',
  waiting_approval: 'waiting',
  done: 'done',
  failed: 'error',
  cancelled: 'paused',
};

export function TasksView({
  tasks,
  agents,
  onGiveTask,
}: {
  tasks: Task[];
  agents: Agent[];
  onGiveTask: () => void;
}) {
  const [who, setWho] = useState<string | null>(null);
  const byId = new Map(agents.map((a) => [a.id, a]));
  const shown = who ? tasks.filter((t) => t.agentId === who) : tasks;
  return (
    <main className="tw-tasks">
      <div className="tw-tasks-bar">
        <Chip shape="tag" selected={!who} onClick={() => setWho(null)}>
          All agents
        </Chip>
        {agents.map((a) => (
          <Chip key={a.id} shape="tag" selected={who === a.id} onClick={() => setWho(a.id)}>
            {a.name}
          </Chip>
        ))}
        <span className="grow" />
        <Button size="sm" icon="plus" onClick={onGiveTask}>
          Give Jack a task
        </Button>
      </div>
      <div className="tw-cols">
        {COLUMNS.map((c) => {
          const items = shown.filter((t) => c.has.includes(t.status));
          return (
            <section key={c.title} className="tw-colm" aria-label={c.title}>
              <div className="tw-colm-h">
                <b className="grow">{c.title}</b>
                <span className="muted tm-sm">{items.length}</span>
              </div>
              {items.map((t) => {
                const a = byId.get(t.agentId);
                const note =
                  t.status === 'cancelled' && t.error?.startsWith('Rejected')
                    ? { icon: 'rotate-ccw' as const, text: 'Sent back for a new version' }
                    : NOTE[t.status];
                return (
                  <div key={t.id} className="tm-card tw-task">
                    <div className="tw-task-t">{t.title}</div>
                    <div className="tm-card-top">
                      <AgentAvatar icon={a?.icon} size={20} />
                      <span className="muted tm-sm grow">{a?.name ?? 'Removed agent'}</span>
                      <AgentStatus status={STATUS[t.status]} />
                    </div>
                    {t.status === 'running' && (
                      <span className="tw-bar">
                        <i style={{ width: `${t.progress}%` }} />
                      </span>
                    )}
                    {note && (
                      <div className="muted tm-sm tw-task-note">
                        <Icon name={note.icon} size={14} />
                        {note.text}
                      </div>
                    )}
                  </div>
                );
              })}
              {!items.length && <div className="muted tm-sm tw-colm-empty">Nothing here</div>}
            </section>
          );
        })}
      </div>
    </main>
  );
}

/* ── Team settings (design: TeamFlow settings) ────────────────────────────── */

const MODE_CARDS: { value: TeamMode; label: string; icon: IconName; desc: string; rec?: boolean }[] = [
  {
    value: 'all',
    label: 'Ask me first',
    icon: 'hand',
    desc: 'Every action waits for your OK. Slowest, but nothing happens without you.',
  },
  {
    value: 'important',
    label: 'Ask for important actions',
    icon: 'shield-check',
    desc: 'Agents work on their own and ask before the actions you choose below.',
    rec: true,
  },
  {
    value: 'auto',
    label: 'Automatic',
    icon: 'zap',
    desc: 'Captain Jack approves routine work for you and reports back. You can stop the team any time.',
  },
];
const SAFETY: { key: keyof Team['safety']; icon: IconName; label: string; sub: string }[] = [
  {
    key: 'send_email',
    icon: 'mail',
    label: 'Sending emails or messages to customers',
    sub: 'Replies, follow-ups, newsletters, booking confirmations',
  },
  {
    key: 'publish_post',
    icon: 'megaphone',
    label: 'Publishing anything public',
    sub: 'Social posts, review replies, website changes',
  },
  {
    key: 'change_crm',
    icon: 'contact',
    label: 'Changing or deleting records',
    sub: 'CRM deals, contacts, bookings',
  },
  {
    key: 'share_externally',
    icon: 'share-2',
    label: 'Sharing outside the team',
    sub: 'Files and messages to people outside your business',
  },
];
const LIMITS: { value: 200 | 500 | 1000 | null; label: string }[] = [
  { value: 200, label: '200 credits' },
  { value: 500, label: '500 credits' },
  { value: 1000, label: '1,000 credits' },
  { value: null, label: 'No limit' },
];

export function SettingsView({
  team,
  menu,
  onChange,
  onDeleted,
  onToast,
}: {
  team: Team;
  menu: ModelMenu;
  onChange: (t: Team) => void;
  onDeleted: () => void;
  onToast: (m: string) => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const save = async (body: Schemas['TeamSettingsDto'], msg?: string) => {
    const { data, error } = await api.PATCH('/api/team', { body });
    if (data) {
      onChange(data);
      if (msg) onToast(msg);
    } else onToast(toApiError(error).message);
  };
  return (
    <main className="tw-settings">
      <section className="tw-sec-block">
        <div>
          <div className="heading">How much should the team do on its own?</div>
          <div className="muted tm-sm">
            Captain Jack follows this for every agent unless you change an agent.
          </div>
        </div>
        <div className="tw-modes" role="radiogroup" aria-label="Approval mode">
          {MODE_CARDS.map((m) => (
            <button
              key={m.value}
              type="button"
              role="radio"
              aria-checked={team.mode === m.value}
              className={cx('tw-choice', 'col', team.mode === m.value && 'on')}
              onClick={() => void save({ mode: m.value }, `Team mode: ${m.label}`)}
            >
              <span className="tm-card-top">
                <Icon name={m.icon} size={18} />
                <b className="grow">{m.label}</b>
                {m.rec && <Badge icon={false}>Recommended</Badge>}
              </span>
              <span className="muted tm-sm">{m.desc}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="tw-sec-block">
        <div>
          <div className="heading">Always ask me before</div>
          <div className="muted tm-sm">
            {team.mode === 'all'
              ? 'In this mode the team asks before every action, including these.'
              : team.mode === 'auto'
                ? 'In Automatic mode the team goes ahead with these too. Choose “Ask for important actions” to use this list.'
                : 'Agents handle everything else on their own.'}
          </div>
        </div>
        <div className={cx('tm-card', 'tw-list', team.mode !== 'important' && 'dim')}>
          {SAFETY.map((r) => (
            <div key={r.key} className="tw-list-row">
              <Icon name={r.icon} size={18} />
              <span className="grow">
                <span className="tw-list-l">{r.label}</span>
                <span className="muted tm-sm">{r.sub}</span>
              </span>
              <Switch
                checked={team.mode === 'all' || (team.mode === 'important' && team.safety[r.key])}
                disabled={team.mode !== 'important'}
                ariaLabel={r.label}
                onChange={(v) => void save({ safety: { ...team.safety, [r.key]: v } })}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="tw-sec-block">
        <div>
          <div className="heading">Model</div>
          <div className="muted tm-sm">
            Captain Jack and agents use this unless you choose a model for one of them.
          </div>
        </div>
        <div className="tm-card tw-row-card">
          <span className="tm-sm grow">Team default</span>
          <ModelPicker
            menu={menu}
            value={team.defaultModel}
            onChange={(m) => void save({ defaultModel: m }, 'Model changed')}
          />
        </div>
      </section>

      <section className="tw-sec-block">
        <div>
          <div className="heading">Daily credit limit for the team</div>
          <div className="muted tm-sm">
            When the team reaches it, Jack stops starting new work and tells you.
          </div>
        </div>
        <div className="tm-chips">
          {LIMITS.map((l) => (
            <Chip
              key={l.label}
              shape="tag"
              selected={team.dailyLimit === l.value}
              onClick={() => void save({ dailyLimit: l.value }, `Daily limit: ${l.label}`)}
            >
              {l.label}
            </Chip>
          ))}
        </div>
      </section>

      <section className="tw-sec-block">
        <div>
          <div className="heading">Your business</div>
          <div className="muted tm-sm">What you told Captain Jack when you set up the team.</div>
        </div>
        <div className="tm-card tw-row-card">
          <span className="tm-sm grow">{team.business}</span>
        </div>
      </section>

      <section className="tw-sec-block">
        <div className="heading">Danger zone</div>
        <div className="tm-card tw-row-card">
          <span className="tm-sm grow">
            Delete this team and all its agents. Documents and images they made stay in Docs and Images.
          </span>
          <Button variant="danger" size="sm" onClick={() => setConfirm(true)}>
            Delete team
          </Button>
        </div>
      </section>

      <Dialog
        open={confirm}
        title="Delete your team?"
        description="Captain Jack and every agent are removed and open tasks are cancelled. You can set up a new team afterwards."
        width={480}
        onClose={() => setConfirm(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              Keep team
            </Button>
            <Button
              variant="danger"
              icon="trash-2"
              loading={deleting}
              onClick={async () => {
                setDeleting(true);
                await api.DELETE('/api/team');
                setDeleting(false);
                setConfirm(false);
                onDeleted();
              }}
            >
              Delete team
            </Button>
          </>
        }
      />
    </main>
  );
}

/* ── Agent profile beside the direct chat (design: TeamFlow dm) ───────────── */

export function AgentProfile({
  agent,
  task,
  menu,
  teamModelName,
  onChange,
  onMessage,
  onEdit,
  onRemove,
}: {
  agent: Agent;
  task: Task | undefined;
  menu: ModelMenu;
  teamModelName: string;
  onChange: (a: Agent) => void;
  onMessage: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const patch = async (body: Schemas['UpdateAgentDto']) => {
    const { data } = await api.PATCH('/api/team/agents/{id}', { params: { path: { id: agent.id } }, body });
    if (data) onChange(data);
  };
  return (
    <aside className="tw-profile" aria-label={`About ${agent.name}`}>
      <div className="tw-col">
        <AgentAvatar icon={agent.icon} size={48} status={agent.status} />
        <div>
          <div className="title">{agent.name}</div>
          <div className="muted tm-sm">{agent.addedBy === 'user' ? 'Added by you' : 'Suggested by Jack'}</div>
        </div>
        <AgentStatus status={agent.status} />
        <Button className="tw-narrow-only" icon="message-circle" onClick={onMessage}>
          Message {agent.name}
        </Button>
      </div>
      <div className="tw-col">
        <div className="tm-ov">What it does</div>
        <div className="tm-sm">{agent.role}</div>
        {agent.duties.length > 0 && (
          <ul className="tw-duties tm-sm">
            {agent.duties.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        )}
      </div>
      <div className="tw-col">
        <div className="tm-ov">Working on</div>
        <div className="tm-sm">{task ? task.title : (agent.firstTasks[0] ?? 'Nothing right now')}</div>
        {task && (
          <span className="tw-bar">
            <i style={{ width: `${task.progress}%` }} />
          </span>
        )}
      </div>
      <div className="tw-col">
        <div className="tm-ov">Tools and access</div>
        <ToolTags tools={agent.tools} />
      </div>
      <div className="tw-col">
        <div className="tm-ov">Model</div>
        <ModelPicker
          menu={menu}
          value={agent.model}
          onChange={(m) => void patch({ model: m })}
          align="start"
        />
        <div className="muted tm-sm">
          {agent.model === 'auto'
            ? `Uses the team default (${teamModelName}).`
            : 'Changing it here affects this agent only.'}
        </div>
      </div>
      <div className="tw-col">
        <div className="tm-ov">Before acting</div>
        <div className="tm-chips">
          {RULES.map((r) => (
            <Chip
              key={r.value}
              shape="tag"
              selected={agent.rule === r.value}
              onClick={() => void patch({ rule: r.value as Rule })}
            >
              {r.label}
            </Chip>
          ))}
        </div>
        <div className="muted tm-sm">Overrides the team setting for this agent only.</div>
      </div>
      <div className="tw-col">
        <div className="tm-ov">Reports to</div>
        <div className="tm-card-top tm-sm">
          <AgentAvatar captain size={24} />
          Captain Jack
        </div>
      </div>
      <div className="tw-profile-actions">
        <Button size="sm" icon="pencil" onClick={onEdit}>
          Edit
        </Button>
        <Button
          size="sm"
          icon={agent.paused ? 'play' : 'circle-pause'}
          onClick={() => void patch({ paused: !agent.paused })}
        >
          {agent.paused ? 'Resume' : 'Pause'}
        </Button>
        <Button size="sm" variant="danger" icon="trash-2" onClick={onRemove}>
          Remove
        </Button>
      </div>
    </aside>
  );
}
