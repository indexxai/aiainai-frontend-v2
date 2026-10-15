'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Badge, Banner, Button, Chip, Icon, Switch, type IconName } from '@/ui';
import { Composer } from '@/components/composer/Composer';
import { useShellCrumbs } from '@/components/shell/crumbs';
import { api } from '@/lib/api/client';
import { toApiError, type ApiError } from '@/lib/api/errors';
import type { ModelMenu } from '@/lib/models';
import {
  EXAMPLES,
  MODES,
  type Agent,
  type Analysis,
  type Proposal,
  type ProposedAgent,
  type Team,
  type TeamMode,
} from '@/lib/team/types';
import { AgentAvatar } from './AgentAvatar';
import './team.css';

type Page = 'landing' | 'interview' | 'proposal' | 'creating';
type Answers = { goals: string[]; tools: string[]; mode: TeamMode };

const NONE = 'None of these';
const CRUMB: Record<Page, string> = {
  landing: 'Get started',
  interview: 'Tell Jack about your business',
  proposal: 'Review your team',
  creating: 'Setting up',
};
const STEP: Partial<Record<Page, string>> = {
  interview: 'Step 1 of 3',
  proposal: 'Step 2 of 3',
  creating: 'Step 3 of 3',
};

/**
 * Setting up the AI Crews with Captain Jack (design: TeamFlow landing → interview → proposal →
 * creating): describe the business, answer three questions, review the proposed agents, create.
 */
export function TeamSetup({
  menu,
  plan,
  onReady,
}: {
  menu: ModelMenu;
  plan: 'free' | 'pro';
  /** Called with the created team once every agent is set up ("Open team room"). */
  onReady?: (team: Team) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [page, setPage] = useState<Page>('landing');
  const [draft, setDraft] = useState('');
  const [business, setBusiness] = useState('');
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [clarify, setClarify] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({ goals: [], tools: [], mode: 'important' });
  const [thinking, setThinking] = useState<'reading' | 'proposing' | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [include, setInclude] = useState<Record<string, boolean>>({});
  const [extraAdded, setExtraAdded] = useState(false);
  const [creating, setCreating] = useState(false);
  const [team, setTeam] = useState<Team | null>(null);
  const [prepared, setPrepared] = useState<Record<string, Agent | 'failed'>>({});
  const bottom = useRef<HTMLDivElement>(null);

  useShellCrumbs({ path: pathname, items: [{ label: 'AI Crews' }, { label: CRUMB[page] }] });

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [step, thinking, clarify, analysis]);

  /* ── Step 1: Jack reads the business ── */
  const start = async (text: string) => {
    const t = text.trim();
    if (!t) return false;
    setBusiness(t);
    setDraft('');
    setPage('interview');
    setError(null);
    setClarify(false);
    setAnalysis(null);
    setThinking('reading');
    const { data, error: err } = await api.POST('/api/team/setup/analyze', { body: { business: t } });
    setThinking(null);
    if (!data) {
      setError(toApiError(err));
      return;
    }
    if (!data.clear) {
      setClarify(true);
      return;
    }
    setAnalysis(data);
    setStep(0);
    setAnswers({ goals: data.goals.slice(0, 2), tools: [], mode: 'important' });
  };

  /* ── Step 2: Jack proposes the team ── */
  const propose = async (a: Answers) => {
    setThinking('proposing');
    setError(null);
    const { data, error: err } = await api.POST('/api/team/setup/proposal', {
      body: { goals: a.goals, tools: a.tools.filter((x) => x !== NONE), mode: a.mode },
    });
    setThinking(null);
    if (!data) {
      setError(toApiError(err));
      return;
    }
    setProposal(data);
    setInclude(Object.fromEntries(data.agents.map((x) => [x.key, true])));
    setExtraAdded(false);
    setPage('proposal');
    router.refresh(); // credits
  };

  /* ── Step 3: create, then Jack writes each agent's instructions ── */
  const cards: ProposedAgent[] = proposal
    ? [...proposal.agents, ...(extraAdded && proposal.extra ? [proposal.extra] : [])]
    : [];
  const kept = cards.filter((c) => include[c.key] !== false);
  const limit = proposal?.limit ?? (plan === 'free' ? 3 : 10);
  const over = kept.length > limit;

  const create = async () => {
    setCreating(true);
    setError(null);
    const { data, error: err } = await api.POST('/api/team', {
      body: {
        mode: answers.mode,
        agents: kept.map((c) => ({
          name: c.name,
          icon: c.icon,
          does: c.does,
          tools: c.tools.map((t) => t.label),
        })),
      },
    });
    setCreating(false);
    if (!data) {
      setError(toApiError(err));
      return;
    }
    setTeam(data);
    setPrepared({});
    setPage('creating');
    for (const agent of data.agents) {
      const r = await api.POST('/api/team/agents/{id}/prepare', { params: { path: { id: agent.id } } });
      setPrepared((p) => ({ ...p, [agent.id]: r.data ?? 'failed' }));
    }
  };

  const retryAgent = async (id: string) => {
    setPrepared((p) => {
      const n = { ...p };
      delete n[id];
      return n;
    });
    const r = await api.POST('/api/team/agents/{id}/prepare', { params: { path: { id } } });
    setPrepared((p) => ({ ...p, [id]: r.data ?? 'failed' }));
  };

  /* ── View ── */
  const label = (analysis?.label ?? 'business').toLowerCase();
  const questions = analysis
    ? [
        {
          text: 'Thanks! What should your team take off your plate first? Pick as many as you like.',
          options: analysis.goals,
          picked: answers.goals,
          cta: 'Continue',
          skippable: false,
          pick: (o: string) =>
            setAnswers((a) => ({
              ...a,
              goals: a.goals.includes(o) ? a.goals.filter((x) => x !== o) : [...a.goals, o],
            })),
        },
        {
          text: 'Which tools do you already use? Your agents will work inside them, and only with your permission.',
          options: [...analysis.tools, NONE],
          picked: answers.tools,
          cta: 'Continue',
          skippable: true,
          pick: (o: string) =>
            setAnswers((a) => ({
              ...a,
              tools:
                o === NONE
                  ? a.tools.includes(NONE)
                    ? []
                    : [NONE]
                  : a.tools.includes(o)
                    ? a.tools.filter((x) => x !== o)
                    : [...a.tools.filter((x) => x !== NONE), o],
            })),
        },
        {
          text: 'Last one: how hands-on do you want to be?',
          options: MODES.map((m) => m.label),
          picked: [MODES.find((m) => m.value === answers.mode)!.label],
          cta: 'Build my team',
          skippable: false,
          pick: (o: string) => setAnswers((a) => ({ ...a, mode: MODES.find((m) => m.label === o)!.value })),
        },
      ]
    : [];

  return (
    <div className="tm">
      <header className="tm-head">
        <span className="tm-crumb">
          <b>AI Crews</b>
          <span className="sep">/</span>
          <span className="muted">{CRUMB[page]}</span>
        </span>
        {STEP[page] && <span className="muted tm-step">{STEP[page]}</span>}
      </header>

      {page === 'landing' && (
        <main className="tm-landing">
          <AgentAvatar captain name="Captain Jack" size={64} />
          <h1 className="display">Meet your AI Crews</h1>
          <p className="tm-lead">
            I&apos;m Captain Jack. People call me Jack of all trades. Tell me about your business and what
            eats your time. I&apos;ll put together a team of specialist agents, run them day to day, and check
            with you before anything important happens.
          </p>
          <div className="tm-composer">
            <Composer
              menu={menu}
              model={menu.selected}
              onModelChange={() => undefined}
              onSend={(t) => {
                void start(t);
              }}
              placeholder="Tell Jack about your business — what you do, your customers, the tools you use…"
              label="Tell Jack about your business"
              elevated
              connectors={false}
              modeChip={false}
              text={draft}
              onTextChange={setDraft}
              autoFocus
            />
          </div>
          <div className="tm-examples">
            <span className="muted">Try an example:</span>
            {EXAMPLES.map((e) => (
              <Chip key={e.label} icon={e.icon} onClick={() => void start(e.text)}>
                {e.label}
              </Chip>
            ))}
          </div>
          <div className="tm-steps">
            <div className="tm-card">
              <span className="tm-ov">1 · Tell Jack</span>
              <span className="muted">
                Describe your business in your own words. Jack asks a few questions to fill the gaps.
              </span>
            </div>
            <div className="tm-card">
              <span className="tm-ov">2 · Review your team</span>
              <span className="muted">
                Jack proposes the agents you need. Turn off any you don&apos;t want before they start.
              </span>
            </div>
            <div className="tm-card">
              <span className="tm-ov">3 · Stay in charge</span>
              <span className="muted">
                Choose what needs your approval. Watch every step in the team room and stop the team any time.
              </span>
            </div>
          </div>
        </main>
      )}

      {page === 'interview' && (
        <main className="tm-scroll">
          <div className="tm-chat">
            <div className="tm-bubble">{business}</div>
            {clarify && (
              <>
                <JackMsg>
                  Happy to help. To build the right team I need a bit more: what does your business do, who
                  are your customers, and what takes most of your time?
                </JackMsg>
                <JackMsg>
                  <span>You can also pick the closest match:</span>
                  <div className="tm-chips">
                    {EXAMPLES.map((e) => (
                      <Chip
                        key={e.label}
                        shape="tag"
                        icon={e.icon as IconName}
                        onClick={() => void start(e.text)}
                      >
                        {e.label}
                      </Chip>
                    ))}
                  </div>
                </JackMsg>
              </>
            )}
            {questions.slice(0, step + 1).map((q, i) => {
              const open = i === step && !thinking;
              const answered = i < step || (i === step && thinking === 'proposing');
              return (
                <JackMsg key={i}>
                  <span>{q.text}</span>
                  {open && (
                    <>
                      <div className="tm-chips" role="group" aria-label={q.text}>
                        {q.options.map((o) => (
                          <Chip key={o} shape="tag" selected={q.picked.includes(o)} onClick={() => q.pick(o)}>
                            {o}
                          </Chip>
                        ))}
                      </div>
                      <div className="tm-row">
                        <Button
                          size="sm"
                          variant="primary"
                          disabled={i === 0 && !answers.goals.length}
                          onClick={() => (i < 2 ? setStep(i + 1) : void propose(answers))}
                        >
                          {q.cta}
                        </Button>
                        {q.skippable && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setAnswers((a) => ({ ...a, tools: [] }));
                              setStep(i + 1);
                            }}
                          >
                            Skip
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                  {answered && <div className="tm-bubble">{q.picked.join(', ') || 'Skipped'}</div>}
                </JackMsg>
              );
            })}
            {thinking && (
              <div className="tm-msg" role="status">
                <AgentAvatar captain size={32} />
                <span className="muted tm-typing">
                  <Icon name="loader-circle" size={16} className="as-spin" />
                  {thinking === 'reading'
                    ? 'Jack is reading about your business…'
                    : 'Jack is working out which agents you need…'}
                </span>
              </div>
            )}
            {error && (
              <Banner
                tone="danger"
                actionLabel={error.code === 'insufficient_credits' ? 'Top up' : 'Try again'}
                onAction={() =>
                  error.code === 'insufficient_credits'
                    ? router.push('/settings/billing')
                    : analysis
                      ? void propose(answers)
                      : void start(business)
                }
              >
                {error.message}
              </Banner>
            )}
            <div ref={bottom} />
          </div>
          {clarify && (
            <div className="tm-chat-foot">
              <Composer
                menu={menu}
                model={menu.selected}
                onModelChange={() => undefined}
                onSend={(t) => {
                  void start(`${business}. ${t}`);
                }}
                placeholder="Tell Jack more about your business"
                label="Tell Jack more"
                connectors={false}
                modeChip={false}
                rows={1}
                text={draft}
                onTextChange={setDraft}
              />
            </div>
          )}
        </main>
      )}

      {page === 'proposal' && proposal && (
        <main className="tm-scroll tm-proposal">
          <div className="tm-prop-head">
            <AgentAvatar captain size={40} />
            <div>
              <div className="title">Here&apos;s the team I&apos;d build for your {label} business</div>
              <div className="muted tm-sm">
                Based on your goals ({answers.goals.join(', ').toLowerCase() || 'what you told me'}). Turn off
                anyone you don&apos;t need. Nothing starts until you confirm.
              </div>
            </div>
          </div>
          {over && (
            <Banner
              tone="warning"
              actionLabel={plan === 'free' ? 'Upgrade to Captain Jack Team' : undefined}
              onAction={() => router.push('/settings/billing')}
            >
              {plan === 'free'
                ? `Jack Free includes Captain Jack and up to ${limit} agents. Turn off ${kept.length - limit} to continue, or upgrade to Captain Jack Team for bigger teams.`
                : `A team can have up to ${limit} agents besides Captain Jack. Turn off ${kept.length - limit} to continue.`}
            </Banner>
          )}
          <div className="tm-grid">
            <div className="tm-card jack">
              <div className="tm-card-top">
                <AgentAvatar captain />
                <div className="grow">
                  <div className="tm-name">Captain Jack</div>
                  <div className="muted tm-sm">Team manager · always included</div>
                </div>
              </div>
              <div className="muted tm-sm">
                Plans the work, assigns tasks, keeps every agent on track and reports to you.
              </div>
            </div>
            {cards.map((c) => {
              const on = include[c.key] !== false;
              return (
                <div key={c.key} className="tm-card" style={{ opacity: on ? 1 : 0.55 }}>
                  <div className="tm-card-top">
                    <AgentAvatar icon={c.icon} />
                    <div className="grow">
                      <div className="tm-name">{c.name}</div>
                      <div className="muted tm-sm">Suggested by Jack</div>
                    </div>
                    <Switch
                      checked={on}
                      ariaLabel={`Include ${c.name}`}
                      onChange={(v) => setInclude((x) => ({ ...x, [c.key]: v }))}
                    />
                  </div>
                  <div className="tm-sm">{c.does}</div>
                  <ToolTags tools={c.tools} />
                </div>
              );
            })}
            {proposal.extra && !extraAdded && (
              <div className="tm-card dashed">
                <div className="tm-card-top">
                  <AgentAvatar icon={proposal.extra.icon} />
                  <div className="grow">
                    <div className="tm-name">{proposal.extra.name}</div>
                    <div className="muted tm-sm">Optional · Jack&apos;s suggestion</div>
                  </div>
                </div>
                <div className="muted tm-sm">{proposal.extra.does}</div>
                <div>
                  <Button size="sm" icon="plus" onClick={() => setExtraAdded(true)}>
                    Add to team
                  </Button>
                </div>
              </div>
            )}
          </div>
          {error && <Banner tone="danger">{error.message}</Banner>}
          <div className="tm-bar">
            <div className="grow">
              <div className="tm-name">
                Captain Jack + {kept.length} agent{kept.length === 1 ? '' : 's'}
              </div>
              <div className="muted tm-sm">
                Agents use credits only when they work · you can change the team any time
              </div>
            </div>
            <Button variant="ghost" onClick={() => setPage('interview')}>
              Change my answers
            </Button>
            <Button
              variant="primary"
              icon="check"
              disabled={over}
              loading={creating}
              onClick={() => void create()}
            >
              Create my team
            </Button>
          </div>
        </main>
      )}

      {page === 'creating' && team && (
        <main className="tm-scroll">
          <div className="tm-creating">
            <div className="tm-msg">
              <AgentAvatar captain size={40} status="working" />
              <div>
                <div className="title">Setting up your team</div>
                <div className="muted tm-sm">
                  I&apos;m giving each agent its instructions and tools. This takes about a minute.
                </div>
              </div>
            </div>
            {team.agents.length > 0 && (
              <div className="tm-card tm-rows">
                {team.agents.map((a, i) => {
                  const done = prepared[a.id];
                  const now = !done && team.agents.slice(0, i).every((x) => prepared[x.id]);
                  const st =
                    done === 'failed'
                      ? {
                          label: 'Not ready',
                          tone: 'danger' as const,
                          icon: 'circle-alert' as const,
                          detail: 'Jack couldn’t write its instructions.',
                        }
                      : done
                        ? done.needs
                          ? {
                              label: 'Needs setup',
                              tone: 'warning' as const,
                              icon: 'circle-alert' as const,
                              detail: `Ready — needs ${done.needs} to act`,
                            }
                          : {
                              label: 'Ready',
                              tone: 'success' as const,
                              icon: 'check' as const,
                              detail: 'Ready',
                            }
                        : now
                          ? {
                              label: 'Creating',
                              tone: 'info' as const,
                              icon: 'loader-circle' as const,
                              detail: 'Writing instructions and choosing tools…',
                            }
                          : {
                              label: 'Queued',
                              tone: 'info' as const,
                              icon: 'clock' as const,
                              detail: 'Queued',
                            };
                  return (
                    <div key={a.id} className="tm-row-agent">
                      <AgentAvatar icon={a.icon} size={32} />
                      <div className="grow">
                        <div className="tm-name sm">{a.name}</div>
                        <div className="muted tm-sm">{st.detail}</div>
                      </div>
                      {done === 'failed' ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          icon="rotate-ccw"
                          onClick={() => void retryAgent(a.id)}
                        >
                          Retry
                        </Button>
                      ) : (
                        <Badge tone={st.tone} icon={st.icon}>
                          {st.label}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {(() => {
              const needs = team.agents.filter((a) => a.needs);
              if (!needs.length) return null;
              return (
                <div className="tm-card">
                  <div className="tm-card-top">
                    <span className="tm-warn">
                      <Icon name="blocks" size={18} />
                    </span>
                    <b className="tm-sm">
                      {needs.length === 1 ? 'One agent needs' : `${needs.length} agents need`} access to your
                      tools
                    </b>
                  </div>
                  <div className="muted tm-sm">
                    They can start planning now, but can&apos;t send or update anything until you connect{' '}
                    {[...new Set(needs.map((a) => a.needs))].join(', ')}. Connecting tools arrives in a later
                    update.
                  </div>
                </div>
              );
            })()}
            <div className="tm-end">
              <Button
                variant="primary"
                iconRight="arrow-right"
                disabled={team.agents.some((a) => !prepared[a.id])}
                onClick={() => {
                  if (onReady) onReady(team);
                  router.refresh();
                }}
              >
                Open team room
              </Button>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}

function JackMsg({ children }: { children: React.ReactNode }) {
  return (
    <div className="tm-msg">
      <AgentAvatar captain size={32} />
      <div className="tm-msg-body">
        <div className="who">Captain Jack</div>
        <div className="txt">{children}</div>
      </div>
    </div>
  );
}

export function ToolTags({ tools }: { tools: { label: string; icon: string; needsSetup: boolean }[] }) {
  if (!tools.length) return null;
  return (
    <div className="tm-tags">
      {tools.map((t) => (
        <span key={t.label} className={t.needsSetup ? 'tm-tag warn' : 'tm-tag'}>
          <Icon name={t.icon as IconName} size={14} />
          {t.needsSetup ? `${t.label} · not connected` : t.label}
        </span>
      ))}
    </div>
  );
}
