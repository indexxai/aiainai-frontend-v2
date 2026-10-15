'use client';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Badge, Banner, Button, Icon, cx } from '@/ui';
import { Markdown } from '@/components/chat/Markdown';
import { Composer } from '@/components/composer/Composer';
import { useShellCrumbs } from '@/components/shell/crumbs';
import { api, type Schemas } from '@/lib/api/client';
import { toApiError, type ApiError } from '@/lib/api/errors';
import { nameOf, type ModelMenu } from '@/lib/models';
import { MODES, type Agent, type Team } from '@/lib/team/types';
import { AgentAvatar, AgentStatus } from './AgentAvatar';
import { AddAgentDialog, EditAgentDialog, RemoveAgentDialog, TeamFullDialog } from './AgentDialogs';
import { ApprovalCard, ApprovalsView, useApprovalActions, type Approval } from './Approvals';
import { ToolTags } from './TeamSetup';
import { AgentProfile, SettingsView, TasksView } from './TeamViews';
import './team.css';

type Room = Schemas['RoomDto'];
type Msg = Schemas['RoomMessageDto'];
type Task = Schemas['TaskDto'];
type Page = 'room' | 'tasks' | 'approvals' | 'settings';
/** `home` is the phone's team overview; on wider screens it shows the team room. */
type View = { kind: 'home' | Page } | { kind: 'agent'; id: string };
const PAGES: Page[] = ['room', 'tasks', 'approvals', 'settings'];

const MODE_SHORT = {
  important: 'Asks before important actions',
  all: 'Asks before everything',
  auto: 'Runs on its own',
};
const MODE_ICON = { important: 'hand', all: 'shield-check', auto: 'zap' } as const;
const POLL_MS = 2000;

const TASK_LABEL: Record<Task['status'], string> = {
  queued: 'Queued',
  running: 'Working',
  waiting_approval: 'Needs you',
  done: 'Done',
  failed: 'Didn’t finish',
  cancelled: 'Cancelled',
};
const TASK_DOT: Record<Task['status'], Agent['status']> = {
  queued: 'idle',
  running: 'working',
  waiting_approval: 'waiting',
  done: 'done',
  failed: 'error',
  cancelled: 'paused',
};
const TITLES = {
  room: ['Team room', ''],
  tasks: ['Tasks', 'Planned and assigned by Captain Jack'],
  approvals: ['Approvals', 'Actions waiting for your OK'],
  settings: ['Team settings', 'Autonomy, safety, model and spending'],
} as const;

const when = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const today = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();
const emptyRoom = (agents: Agent[]): Room => ({
  messages: [],
  tasks: [],
  agents,
  busy: false,
  pendingApprovals: 0,
  paused: false,
  spentToday: 0,
  dailyLimit: null,
});

/**
 * The team's workspace (design: TeamFlow): members and pages on the left; the team room, a direct
 * chat with one agent, the task board, approvals or settings in the middle.
 */
export function TeamRoom({
  team: initialTeam,
  menu,
  initial,
}: {
  team: Team;
  menu: ModelMenu;
  initial: Room | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [team, setTeam] = useState(initialTeam);
  const [room, setRoom] = useState<Room>(initial ?? emptyRoom(team.agents));
  const [dmState, setDmState] = useState<{ id: string; room: Room } | null>(null);
  // The open page lives in the URL (?v=tasks, ?agent=…), so Back and links work.
  const params = useSearchParams();
  const v = params.get('v');
  const view: View = params.get('agent')
    ? { kind: 'agent', id: params.get('agent')! }
    : PAGES.includes(v as Page)
      ? { kind: v as Page }
      : { kind: 'home' };
  const main = view.kind === 'home' ? 'room' : view.kind;
  const tab = params.get('tab') === 'chat' ? 'chat' : 'profile';
  const [approvals, setApprovals] = useState<{ pending: Approval[]; decided: Approval[] }>({
    pending: [],
    decided: [],
  });
  const [board, setBoard] = useState<Task[]>([]);
  const [toast, setToast] = useState('');
  const [pausing, setPausing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [full, setFull] = useState(false);
  const [editing, setEditing] = useState<Agent | null>(null);
  const [removing, setRemoving] = useState<Agent | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const agentId = view.kind === 'agent' ? view.id : null;
  const dm = dmState && dmState.id === agentId ? dmState.room : null;

  const load = useCallback(async () => {
    const { data } = await api.GET('/api/team/room');
    if (data) setRoom(data);
  }, []);
  const loadDm = useCallback(async (id: string) => {
    const { data } = await api.GET('/api/team/agents/{id}/chat', { params: { path: { id } } });
    if (data) setDmState({ id, room: data });
  }, []);
  const loadApprovals = useCallback(async () => {
    const { data } = await api.GET('/api/team/approvals');
    if (data) setApprovals({ pending: data.pending, decided: data.decided });
  }, []);
  const loadBoard = useCallback(async () => {
    const { data } = await api.GET('/api/team/tasks');
    if (data) setBoard(data.tasks);
  }, []);

  const go = (to: View, chat = false) => {
    setError(null);
    const q =
      to.kind === 'agent'
        ? `?agent=${to.id}${chat ? '&tab=chat' : ''}`
        : to.kind === 'home'
          ? ''
          : `?v=${to.kind}`;
    router.push(`${pathname}${q}`, { scroll: false });
  };

  // Load what the open page needs (also after Back/Forward).
  const viewKey = agentId ? `agent:${agentId}` : view.kind;
  useEffect(() => {
    // Fetching data for the page in the URL; the state is set when the request returns.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (viewKey === 'approvals') void loadApprovals();
    if (viewKey === 'tasks') void loadBoard();
    if (viewKey.startsWith('agent:')) void loadDm(viewKey.slice(6));
  }, [viewKey, loadApprovals, loadBoard, loadDm]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const refreshAll = () => {
    void load();
    if (agentId) void loadDm(agentId);
    if (view.kind === 'approvals') void loadApprovals();
    if (view.kind === 'tasks') void loadBoard();
  };

  const actions = useApprovalActions(
    (msg) => {
      setToast(msg);
      refreshAll();
    },
    (msg) => setError({ code: 'conflict', message: msg, requestId: 'unknown' }),
  );

  // While agents are working, check for their results (room, the open chat and the board).
  const busy = room.busy || !!dm?.busy;
  const wasBusy = useRef(busy);
  useEffect(() => {
    if (!busy) {
      if (wasBusy.current) router.refresh(); // credits in the sidebar
      wasBusy.current = false;
      return;
    }
    wasBusy.current = true;
    const t = setInterval(() => {
      void load();
      if (agentId) void loadDm(agentId);
      if (view.kind === 'tasks') void loadBoard();
    }, POLL_MS);
    return () => clearInterval(t);
  }, [busy, load, loadDm, loadBoard, agentId, view.kind, router]);

  const togglePause = async () => {
    setPausing(true);
    const { data } = await api.POST(room.paused ? '/api/team/resume' : '/api/team/pause');
    setPausing(false);
    if (data) setRoom(data);
  };

  const agents = room.agents;
  const n = agents.length;
  const working = [...room.tasks, ...(dm?.tasks ?? [])].filter((t) => t.status === 'running');
  // An agent with a running task shows as working straight away (its record catches up a moment later).
  const statusOf = (a: Agent): Agent['status'] =>
    working.some((t) => t.agentId === a.id) ? 'working' : a.status === 'working' ? 'idle' : a.status;
  const agent = agentId ? agents.find((a) => a.id === agentId) : undefined;
  const openTasksOf = (a: Agent) =>
    [...room.tasks, ...board].filter(
      (t, i, all) =>
        t.agentId === a.id &&
        ['queued', 'waiting_approval'].includes(t.status) &&
        all.findIndex((x) => x.id === t.id) === i,
    ).length;

  const updateAgent = (a: Agent) => {
    setRoom((r) => ({ ...r, agents: r.agents.map((x) => (x.id === a.id ? a : x)) }));
    setDmState((d) =>
      d ? { ...d, room: { ...d.room, agents: d.room.agents.map((x) => (x.id === a.id ? a : x)) } } : d,
    );
  };

  const [title, sub] =
    view.kind === 'agent'
      ? [agent?.name ?? 'Agent', agent ? `Direct chat · ${agent.role}` : '']
      : main === 'room'
        ? [
            'Team room',
            `Captain Jack and ${n} agent${n === 1 ? '' : 's'} · everything your team says and does`,
          ]
        : TITLES[main as Page];

  useShellCrumbs({
    path: pathname,
    items: [{ label: 'AI Crews', href: pathname }, { label: view.kind === 'home' ? team.name : title }],
    back:
      view.kind === 'home'
        ? undefined
        : view.kind === 'agent' && tab === 'chat'
          ? `${pathname}?agent=${view.id}`
          : pathname,
  });

  return (
    <div className="tw">
      <aside className="tw-side" aria-label="Team">
        <div className="tw-side-head">
          <span className="heading">{team.name}</span>
          <button
            type="button"
            className="tw-mode"
            title={MODES.find((m) => m.value === team.mode)?.label}
            onClick={() => go({ kind: 'settings' })}
          >
            <Icon name={MODE_ICON[team.mode]} size={16} />
            <span className="grow">{MODE_SHORT[team.mode]}</span>
            <Icon name="chevron-right" size={14} />
          </button>
        </div>
        <div className="tw-side-body">
          {(
            [
              ['room', 'message-circle', 'Team room'],
              ['tasks', 'list-checks', 'Tasks'],
              ['approvals', 'hand', 'Approvals'],
              ['settings', 'sliders-horizontal', 'Settings'],
            ] as const
          ).map(([k, icon, label]) => (
            <button
              key={k}
              type="button"
              className={cx('tw-nav', main === k && 'on')}
              onClick={() => go({ kind: k })}
            >
              <Icon name={icon} size={18} />
              <span className="grow">{label}</span>
              {k === 'approvals' && room.pendingApprovals > 0 && (
                <Badge tone="warning" icon={false}>
                  {room.pendingApprovals}
                </Badge>
              )}
            </button>
          ))}
          <div className="tm-ov tw-sec">Captain</div>
          <button
            type="button"
            className={cx('tw-member', main === 'room' && 'on')}
            onClick={() => go({ kind: 'room' })}
          >
            <AgentAvatar captain size={32} status={room.busy ? 'working' : 'idle'} />
            <span className="grow">
              <span className="nm">Captain Jack</span>
              <AgentStatus status={room.paused ? 'paused' : room.busy ? 'working' : 'idle'} />
            </span>
          </button>
          <div className="tm-ov tw-sec">Team · {n}</div>
          {agents.map((a) => (
            <button
              key={a.id}
              type="button"
              className={cx('tw-member', agentId === a.id && 'on')}
              onClick={() => go({ kind: 'agent', id: a.id })}
            >
              <AgentAvatar icon={a.icon} size={32} status={statusOf(a)} />
              <span className="grow">
                <span className="nm">{a.name}</span>
                <AgentStatus status={statusOf(a)} />
              </span>
            </button>
          ))}
          {!n && (
            <div className="muted tm-sm tw-empty">No agents yet. Add one, or ask Jack to suggest a team.</div>
          )}
          <button
            type="button"
            className="tw-nav"
            onClick={() => (n >= team.limit ? setFull(true) : setAdding(true))}
          >
            <Icon name="user-plus" size={18} />
            <span className="grow">Add agent</span>
          </button>
        </div>
        <div className="tw-side-foot">
          <Button
            variant={room.paused ? 'primary' : 'secondary'}
            icon={room.paused ? 'play' : 'circle-pause'}
            loading={pausing}
            onClick={() => void togglePause()}
          >
            {room.paused ? 'Resume team' : 'Pause team'}
          </Button>
        </div>
      </aside>

      <div className="tw-main">
        <header className="tw-head">
          {agent && <AgentAvatar icon={agent.icon} size={28} />}
          <span className="tw-title">{title}</span>
          <span className="muted tm-sm tw-sub">{sub}</span>
          {agent && (
            <Button
              size="sm"
              className="tw-narrow-only"
              icon={tab === 'chat' ? 'user' : 'message-circle'}
              onClick={() => go({ kind: 'agent', id: agent.id }, tab !== 'chat')}
            >
              {tab === 'chat' ? 'Profile' : 'Message'}
            </Button>
          )}
        </header>
        {room.paused && (
          <div className="tw-banner">
            <Banner
              tone="warning"
              icon="circle-pause"
              actionLabel="Resume team"
              onAction={() => void togglePause()}
            >
              Your team is paused. No agent starts new work, sends, publishes or changes anything until you
              resume.
            </Banner>
          </div>
        )}
        {view.kind === 'home' && (
          <TeamHub
            team={team}
            room={room}
            statusOf={statusOf}
            pausing={pausing}
            go={go}
            onAdd={() => (n >= team.limit ? setFull(true) : setAdding(true))}
            onPause={() => void togglePause()}
          />
        )}
        {view.kind === 'approvals' && <ApprovalsView list={approvals} mode={team.mode} actions={actions} />}
        {view.kind === 'tasks' && (
          <TasksView tasks={board} agents={agents} onGiveTask={() => go({ kind: 'room' })} />
        )}
        {view.kind === 'settings' && (
          <SettingsView
            team={team}
            menu={menu}
            onChange={(t) => {
              setTeam(t);
              void load();
            }}
            onDeleted={() => router.refresh()}
            onToast={setToast}
          />
        )}
        {main === 'room' && (
          <div className={cx('tw-body', view.kind === 'home' && 'tw-at-home')}>
            <Conversation
              key="room"
              room={room}
              menu={menu}
              actions={actions}
              intro={<Welcome agents={agents} empty={!room.messages.length} />}
              placeholder="Message Captain Jack — ask for work, or ask a question"
              label="Message Captain Jack"
              typingName="Captain Jack"
              typingCaptain
              error={error}
              setError={setError}
              onSend={async (text, model) => {
                const { data, error: err } = await api.POST('/api/team/room', { body: { text, model } });
                if (data) setRoom(data);
                return data ? null : toApiError(err);
              }}
            />
            <Report room={room} statusOf={statusOf} />
          </div>
        )}
        {view.kind === 'agent' && !agent && (
          <div className="tw-body">
            <div className="tw-caught-up">
              <span className="ok">
                <Icon name="user-x" size={40} />
              </span>
              <div className="title">This agent isn&apos;t on the team any more</div>
              <div className="muted tm-sm">
                It may have been removed. Its finished work stays in Docs and Images.
              </div>
              <Button icon="message-circle" onClick={() => go({ kind: 'room' })}>
                Go to the team room
              </Button>
            </div>
          </div>
        )}
        {view.kind === 'agent' && agent && (
          <div className="tw-body tw-agent" data-tab={tab}>
            <Conversation
              key={agent.id}
              room={dm ?? emptyRoom(agents)}
              menu={menu}
              actions={actions}
              intro={
                <div className="tm-msg">
                  <AgentAvatar icon={agent.icon} size={32} />
                  <div className="tm-msg-body">
                    <div className="who">{agent.name}</div>
                    <div className="txt">
                      {agent.paused
                        ? `I’m paused. Resume me to give me work.`
                        : `Hi! Ask me for something directly — ${agent.role.charAt(0).toLowerCase()}${agent.role.slice(1)} I’ll post what I make here.`}
                    </div>
                  </div>
                </div>
              }
              placeholder={`Message ${agent.name}`}
              label={`Message ${agent.name}`}
              typingName={agent.name}
              typingIcon={agent.icon}
              error={error}
              setError={setError}
              disabled={agent.paused}
              onSend={async (text) => {
                const { data, error: err } = await api.POST('/api/team/agents/{id}/chat', {
                  params: { path: { id: agent.id } },
                  body: { text },
                });
                if (data) setDmState({ id: agent.id, room: data });
                void load();
                return data ? null : toApiError(err);
              }}
            />
            <AgentProfile
              agent={agent}
              task={(dm?.tasks ?? [])
                .concat(room.tasks)
                .find((t) => t.agentId === agent.id && (t.status === 'running' || t.status === 'queued'))}
              menu={menu}
              teamModelName={team.defaultModel === 'auto' ? 'Auto' : nameOf(menu, team.defaultModel)}
              onChange={(a) => {
                updateAgent(a);
                setToast(a.paused ? `${a.name} is paused` : 'Saved');
              }}
              onMessage={() => go({ kind: 'agent', id: agent.id }, true)}
              onEdit={() => setEditing(agent)}
              onRemove={() => {
                void loadBoard();
                setRemoving(agent);
              }}
            />
          </div>
        )}
      </div>

      <AddAgentDialog
        open={adding}
        menu={menu}
        onClose={() => setAdding(false)}
        onAdded={(a) => {
          setToast(`${a.name} joined the team`);
          void load().then(() => go({ kind: 'agent', id: a.id }));
        }}
      />
      <TeamFullDialog open={full} limit={team.limit} onClose={() => setFull(false)} />
      <EditAgentDialog
        agent={editing}
        onClose={() => setEditing(null)}
        onSaved={(a) => {
          updateAgent(a);
          setEditing(null);
          setToast('Saved');
        }}
      />
      <RemoveAgentDialog
        agent={removing}
        others={agents.filter((a) => a.id !== removing?.id)}
        openTasks={removing ? openTasksOf(removing) : 0}
        onClose={() => setRemoving(null)}
        onRemoved={(name) => {
          setRemoving(null);
          setToast(`${name} was removed`);
          go({ kind: 'home' });
          void load();
        }}
      />
      {actions.dialogs}
      {toast && (
        <div className="de-toast tw-toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}

/** Phone: the team at a glance (design: MobileFlow "AI Crews") — Jack, what needs you, the agents. */
function TeamHub({
  team,
  room,
  statusOf,
  pausing,
  go,
  onAdd,
  onPause,
}: {
  team: Team;
  room: Room;
  statusOf: (a: Agent) => Agent['status'];
  pausing: boolean;
  go: (v: View) => void;
  onAdd: () => void;
  onPause: () => void;
}) {
  const waiting = room.pendingApprovals;
  const line = room.paused
    ? 'Your team is paused. Nobody starts new work until you resume.'
    : waiting
      ? `${waiting} ${waiting === 1 ? 'thing needs' : 'things need'} your OK before ${waiting === 1 ? 'it goes' : 'they go'} out.`
      : room.busy
        ? 'Your team is working. I’ll post results in the team room.'
        : 'Everyone is ready. Tell me what you need in the team room.';
  const taskOf = (a: Agent) =>
    room.tasks.find((t) => t.agentId === a.id && (t.status === 'running' || t.status === 'queued'))?.title ??
    a.role;
  return (
    <main className="tw-hub">
      <div className="tm-card">
        <div className="tm-card-top">
          <AgentAvatar captain size={44} status={room.busy ? 'working' : 'idle'} />
          <div className="grow">
            <div className="title">Captain Jack</div>
            <div className="muted tm-sm">Team lead · {team.name}</div>
          </div>
        </div>
        <p className="tm-sm tw-hub-line">{line}</p>
        <div className="tm-row">
          {waiting > 0 && (
            <Button variant="primary" icon="hand" onClick={() => go({ kind: 'approvals' })}>
              Review {waiting}
            </Button>
          )}
          <Button icon="message-circle" onClick={() => go({ kind: 'room' })}>
            Team room
          </Button>
        </div>
      </div>
      <div className="tm-ov">Agents · {room.agents.length}</div>
      <div className="tm-card tw-list">
        {room.agents.map((a) => (
          <button
            key={a.id}
            type="button"
            className="tw-list-row tw-hub-row"
            onClick={() => go({ kind: 'agent', id: a.id })}
          >
            <AgentAvatar icon={a.icon} size={40} status={statusOf(a)} />
            <span className="grow">
              <span className="tw-list-l">{a.name}</span>
              <span className="muted tm-sm tw-sub">{taskOf(a)}</span>
            </span>
            <AgentStatus status={statusOf(a)} />
          </button>
        ))}
        <button type="button" className="tw-list-row tw-hub-row" onClick={onAdd}>
          <span className="tw-hub-ic">
            <Icon name="user-plus" size={18} />
          </span>
          <span className="grow tw-list-l">Add agent</span>
        </button>
      </div>
      <div className="tm-ov">Team</div>
      <div className="tm-card tw-list">
        {(
          [
            ['tasks', 'list-checks', 'Tasks'],
            ['approvals', 'hand', 'Approvals'],
            ['settings', 'sliders-horizontal', 'Settings'],
          ] as const
        ).map(([k, icon, label]) => (
          <button key={k} type="button" className="tw-list-row tw-hub-row" onClick={() => go({ kind: k })}>
            <span className="tw-hub-ic">
              <Icon name={icon} size={18} />
            </span>
            <span className="grow tw-list-l">{label}</span>
            {k === 'approvals' && waiting > 0 && (
              <Badge tone="warning" icon={false}>
                {waiting}
              </Badge>
            )}
            <Icon name="chevron-right" size={16} />
          </button>
        ))}
      </div>
      <Button
        variant={room.paused ? 'primary' : 'secondary'}
        icon={room.paused ? 'play' : 'circle-pause'}
        loading={pausing}
        onClick={onPause}
      >
        {room.paused ? 'Resume team' : 'Pause team'}
      </Button>
    </main>
  );
}

function Welcome({ agents, empty }: { agents: Agent[]; empty: boolean }) {
  const n = agents.length;
  const needs = agents.filter((a) => a.status === 'setup').length;
  return (
    <div className="tm-msg">
      <AgentAvatar captain size={32} />
      <div className="tm-msg-body">
        <div className="who">Captain Jack</div>
        <div className="txt">
          {n
            ? `Your team is ready. Tell me what you need — I'll hand it to the right agent and post the results here.${needs ? ` ${needs === 1 ? 'One agent needs' : `${needs} agents need`} a tool connected before they can send or update anything, but they can draft.` : ''}`
            : 'Your team is set up. Add your first agent and I’ll get it working.'}
        </div>
        {n > 0 && empty && (
          <div className="tm-card tw-rows">
            {agents.map((a) => (
              <div key={a.id} className="tw-row">
                <AgentAvatar icon={a.icon} size={24} />
                <span className="tw-row-name">{a.name}</span>
                <span className="muted tm-sm grow">{a.firstTasks[0] ?? a.role}</span>
                <AgentStatus status={a.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** A feed with its composer: the team room or a direct chat. */
function Conversation({
  room,
  menu,
  actions,
  intro,
  placeholder,
  label,
  typingName,
  typingCaptain,
  typingIcon,
  error,
  setError,
  disabled,
  onSend,
}: {
  room: Room;
  menu: ModelMenu;
  actions: ReturnType<typeof useApprovalActions>;
  intro: ReactNode;
  placeholder: string;
  label: string;
  typingName: string;
  typingCaptain?: boolean;
  typingIcon?: string;
  error: ApiError | null;
  setError: (e: ApiError | null) => void;
  disabled?: boolean;
  onSend: (text: string, model: string) => Promise<ApiError | null>;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState('');
  const [model, setModel] = useState(menu.selected);
  const [sending, setSending] = useState<string | null>(null);
  const feed = useRef<HTMLDivElement>(null);
  const byId = new Map(room.agents.map((a) => [a.id, a]));
  const tasks = new Map(room.tasks.map((t) => [t.id, t]));
  const working = room.tasks.filter((t) => t.status === 'running');

  useEffect(() => {
    feed.current?.scrollTo({ top: feed.current.scrollHeight, behavior: 'smooth' });
  }, [room.messages.length, sending]);

  const send = async (text: string) => {
    const t = text.trim();
    if (!t || sending) return;
    setSending(t);
    setDraft('');
    setError(null);
    const err = await onSend(t, model);
    setSending(null);
    if (err) {
      setError(err);
      setDraft(t);
    } else router.refresh();
  };

  return (
    <div className="tw-chat">
      <div className="tw-feed" ref={feed} aria-live="polite">
        {intro}
        {room.messages.map((m, i) => {
          const prev = room.messages[i - 1];
          const day =
            !prev || new Date(prev.createdAt).toDateString() !== new Date(m.createdAt).toDateString();
          return (
            <div key={m.id} className="tw-item">
              {day && (
                <div className="tw-day muted tm-sm">
                  <i />
                  {today(m.createdAt)
                    ? 'Today'
                    : new Date(m.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  <i />
                </div>
              )}
              <RoomMessage m={m} tasks={tasks} byId={byId} actions={actions} />
            </div>
          );
        })}
        {sending && (
          <>
            <div className="tm-bubble">{sending}</div>
            <div className="tm-msg" role="status">
              <AgentAvatar captain={typingCaptain} icon={typingIcon} size={32} />
              <span className="muted tm-typing">
                <Icon name="loader-circle" size={16} className="as-spin" />
                {typingName} is typing…
              </span>
            </div>
          </>
        )}
        {working.map((t) => {
          const a = byId.get(t.agentId);
          return (
            <div key={t.id} className="tm-msg" role="status">
              <AgentAvatar icon={a?.icon} size={32} status="working" />
              <span className="muted tm-typing">
                <Icon name="loader-circle" size={16} className="as-spin" />
                {a?.name ?? 'An agent'} is working on “{t.title}”…
              </span>
            </div>
          );
        })}
      </div>
      <div className="tw-compose">
        {error && (
          <Banner
            tone="danger"
            actionLabel={error.code === 'insufficient_credits' ? 'Top up' : undefined}
            onAction={() => router.push('/settings/billing')}
            onDismiss={() => setError(null)}
          >
            {error.message}
          </Banner>
        )}
        <Composer
          menu={menu}
          model={model}
          onModelChange={setModel}
          onSend={(t) => {
            void send(t);
          }}
          running={!!sending}
          placeholder={placeholder}
          label={label}
          connectors={false}
          modeChip={false}
          rows={1}
          disabled={disabled}
          text={draft}
          onTextChange={setDraft}
        />
      </div>
    </div>
  );
}

/** Captain's report beside the team room. */
function Report({ room, statusOf }: { room: Room; statusOf: (a: Agent) => Agent['status'] }) {
  const agents = room.agents;
  const current = (a: Agent) =>
    room.tasks.find((t) => t.agentId === a.id && t.status === 'running') ??
    room.tasks.find((t) => t.agentId === a.id && t.status === 'queued');
  const doneToday = room.tasks.filter((t) => t.status === 'done' && today(t.createdAt)).length;
  const pct = room.dailyLimit ? Math.min(100, Math.round((room.spentToday / room.dailyLimit) * 100)) : 0;
  return (
    <aside className="tw-report" aria-label="Captain's report">
      <div className="tm-card-top">
        <AgentAvatar captain status={room.busy ? 'working' : 'idle'} />
        <div>
          <div className="tm-name sm">Captain&apos;s report</div>
          <div className="muted tm-sm">Updated just now</div>
        </div>
      </div>
      <div className="tw-stats">
        <div className="tm-card">
          <b>{agents.filter((a) => statusOf(a) === 'working').length}</b>
          <span className="muted tm-sm">Working</span>
        </div>
        <div className="tm-card">
          <b>{agents.filter((a) => ['waiting', 'setup'].includes(statusOf(a))).length}</b>
          <span className="muted tm-sm">Need you</span>
        </div>
        <div className="tm-card">
          <b>{doneToday}</b>
          <span className="muted tm-sm">Done today</span>
        </div>
      </div>
      <div className="tm-ov">Agents</div>
      {agents.map((a) => {
        const t = current(a);
        return (
          <div key={a.id} className={cx('tm-card', 'tw-agent')}>
            <span className="tm-card-top">
              <AgentAvatar icon={a.icon} size={24} />
              <span className="tm-name sm grow">{a.name}</span>
              <AgentStatus status={statusOf(a)} />
            </span>
            <span className="muted tm-sm">{t ? t.title : a.role}</span>
            {t ? (
              <span className="tw-bar">
                <i style={{ width: `${t.progress}%` }} />
              </span>
            ) : (
              <ToolTags tools={a.tools} />
            )}
          </div>
        );
      })}
      <div className="tm-card tw-credits-card">
        <span className="tm-card-top">
          <span className="tm-sm grow">Credits used today</span>
          <b className="tm-sm">{room.spentToday}</b>
        </span>
        {room.dailyLimit ? (
          <>
            <span className="tw-bar">
              <i style={{ width: `${pct}%` }} />
            </span>
            <span className="muted tm-sm">Daily limit {room.dailyLimit} · change in team settings</span>
          </>
        ) : (
          <span className="muted tm-sm">No daily limit · change in team settings</span>
        )}
      </div>
    </aside>
  );
}

function RoomMessage({
  m,
  tasks,
  byId,
  actions,
}: {
  m: Msg;
  tasks: Map<string, Task>;
  byId: Map<string, Agent>;
  actions: ReturnType<typeof useApprovalActions>;
}) {
  if (m.from === 'user') return <div className="tm-bubble">{m.text}</div>;
  const agent = m.agentId ? byId.get(m.agentId) : undefined;
  const name = m.from === 'jack' ? 'Captain Jack' : (m.agentName ?? 'Agent');
  return (
    <div className="tm-msg">
      <AgentAvatar captain={m.from === 'jack'} icon={m.agentIcon ?? agent?.icon} size={32} />
      <div className="tm-msg-body">
        <div className="who">
          {name}
          {m.toName && <span className="muted"> → {m.toName}</span>}
          <span className="when">{when(m.createdAt)}</span>
        </div>
        {m.kind === 'error' ? (
          <div className="tm-card tw-error" role="alert">
            <span className="tm-card-top">
              <Icon name="circle-alert" size={18} />
              <b className="tm-sm">Something didn’t finish</b>
            </span>
            <span className="muted tm-sm">{m.text}</span>
            {/out of credits/i.test(m.text) && (
              <Link href="/settings/billing" className="as-btn primary sm tw-topup">
                Top up
              </Link>
            )}
          </div>
        ) : (
          <div className="txt tw-md">
            <Markdown text={m.text} />
          </div>
        )}
        {m.kind === 'approval' && m.approval && <ApprovalCard a={m.approval} actions={actions} />}
        {m.kind === 'plan' && m.taskIds.length > 0 && (
          <div className="tm-card tw-rows">
            {m.taskIds.map((id) => {
              const t = tasks.get(id);
              if (!t) return null;
              const a = byId.get(t.agentId);
              return (
                <div key={id} className="tw-row">
                  <AgentAvatar icon={a?.icon} size={24} />
                  <span className="tw-row-name">{a?.name ?? 'Agent'}</span>
                  <span className="muted tm-sm grow">{t.title}</span>
                  <span className={cx('as-agent-status', TASK_DOT[t.status])}>
                    <span className={cx('as-agent-dot', 'inline', TASK_DOT[t.status])} />
                    {t.status === 'cancelled' && t.error?.startsWith('Rejected')
                      ? 'Sent back'
                      : TASK_LABEL[t.status]}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        {m.result?.type === 'document' && (
          <Link href={m.result.url} className="tm-card tw-result">
            <span className="tw-result-ic">
              <Icon name="file-text" size={18} />
            </span>
            <span className="grow">
              <b className="tm-sm">{m.result.title}</b>
              <span className="muted tm-sm">Document · open in Docs to edit</span>
            </span>
            <Icon name="arrow-right" size={16} />
          </Link>
        )}
        {m.result?.type === 'image' && m.result.thumbUrl && (
          <Link
            href={m.result.url}
            className="tw-image"
            aria-label={`Open image: ${m.result.title ?? 'image'}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- served by the API with auth */}
            <img src={m.result.thumbUrl} alt={m.result.title ?? 'Image'} />
          </Link>
        )}
        {m.credits > 0 && (
          <span className="tw-cost">
            {m.credits} credit{m.credits === 1 ? '' : 's'}
          </span>
        )}
      </div>
    </div>
  );
}
