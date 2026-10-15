'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { Composer } from '@/components/composer/Composer';
import { AgentAvatar, AgentStatus } from '@/components/team/AgentAvatar';
import { GodRing } from './GodRing';
import { Icon, type IconName } from '@/ui';
import type { Schemas } from '@/lib/api/client';
import { startChat } from '@/lib/chat/start';
import type { ModelMenu } from '@/lib/models';
import './jack.css';

type Home = Schemas['HomeDto'];
type Item = Schemas['HomeItemDto'];

/** Needs you / In progress / Jack suggests, hidden for now; true brings them back. */
const SHOW_COLUMNS = false;

const KIND_ICON: Record<Item['kind'], IconName> = {
  approval: 'hand',
  action: 'hand',
  doc: 'file-text',
  image: 'image',
  task: 'users',
};

/**
 * Jack's home (designs "God's Perspective AI Gateway — Personal/Business home"): Jack of all trades or Captain Jack
 * in the middle of every AI, the message box, and (hidden for now) three columns — what needs
 * you, what's running, and ideas to start from.
 */
export function JackHome({
  menu,
  home,
  business,
  team,
  banner,
}: {
  menu: ModelMenu;
  home: Home;
  business: { id: string; name: string } | null;
  team: Schemas['TeamDto'] | null;
  banner?: ReactNode;
}) {
  const router = useRouter();
  const [model, setModel] = useState(menu.selected);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const isBusiness = home.space === 'business' && !!business;
  const agents = (team?.agents ?? []).slice(0, 5);

  // While something is running, check again every 10 seconds so finished work drops off.
  useEffect(() => {
    if (!SHOW_COLUMNS || !home.inProgressCount) return;
    const t = setInterval(() => router.refresh(), 10_000);
    return () => clearInterval(t);
  }, [home.inProgressCount, router]);

  return (
    <div className={isBusiness ? 'jack jack-with-aside' : 'jack'}>
      <div className={SHOW_COLUMNS ? 'jack-main' : 'jack-main jack-main-centered'}>
        {banner}
        <GodRing space={isBusiness ? 'business' : 'personal'} />
        <h1 className="god-title">God’s Perspective AI Gateway</h1>
        <p className="god-hello">One Jack. Every AI.</p>
        <p className="jack-sub">
          {isBusiness ? (
            <>
              Captain Jack here. What does {business.name} need today? He picks the best quality for the price
              for each job, works with your team, and asks before anything important.
            </>
          ) : (
            <>
              Hi, I’m Jack. What do you need today? Tell me in plain words: I pick the best quality for the
              price, get it done, and ask before anything important.
            </>
          )}
        </p>

        <div className="jack-composer">
          <Composer
            menu={menu}
            model={model}
            onModelChange={setModel}
            elevated
            text={text}
            onTextChange={setText}
            placeholder={
              isBusiness ? 'Tell Captain Jack what the business needs…' : 'Tell Jack what you need…'
            }
            label="Message Jack"
            onSend={async (value) => {
              setError('');
              const r = await startChat(value, model);
              if ('error' in r) {
                setError(r.error.message);
                return false;
              }
              router.push(r.href);
            }}
          />
          {error && (
            <p className="jack-error" role="alert">
              {error}
            </p>
          )}
        </div>

        {SHOW_COLUMNS && (
          <div className="jack-cols">
            <section aria-labelledby="jack-needs" className="jack-col">
              <h2 id="jack-needs" className="jack-ov">
                Needs you{home.needsYouCount ? ` · ${home.needsYouCount}` : ''}
              </h2>
              {home.needsYou.length ? (
                home.needsYou.map((item) => (
                  <div key={item.id} className="jack-card">
                    <div className="jack-card-head">
                      <Icon name={KIND_ICON[item.kind]} size={18} />
                      <span className="jack-card-title">{item.title}</span>
                    </div>
                    <p className="jack-card-detail">{item.detail}</p>
                    <div>
                      <Link href={item.href} className="as-btn secondary sm">
                        <Icon name="hand" size={16} />
                        Review
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <p className="jack-none">
                  Nothing needs you right now. Jack asks here before anything important.
                </p>
              )}
              {home.needsYouCount > home.needsYou.length && (
                <Link href="/approvals" className="jack-more">
                  See all {home.needsYouCount}
                </Link>
              )}
            </section>

            <section aria-labelledby="jack-progress" className="jack-col">
              <h2 id="jack-progress" className="jack-ov">
                In progress{home.inProgressCount ? ` · ${home.inProgressCount}` : ''}
              </h2>
              {home.inProgress.length ? (
                home.inProgress.map((item) => (
                  <Link key={item.id} href={item.href} className="jack-job">
                    <span className="jack-job-ic">
                      <Icon name={KIND_ICON[item.kind]} size={16} />
                    </span>
                    <span className="jack-job-text">
                      <span className="jack-job-title">{item.title}</span>
                      <span className="jack-job-detail">{item.detail}</span>
                      {item.progress !== undefined && (
                        <span
                          className="jack-bar"
                          role="progressbar"
                          aria-valuenow={item.progress}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${item.title}: ${item.progress}%`}
                        >
                          <i style={{ width: `${Math.max(4, item.progress)}%` }} />
                        </span>
                      )}
                    </span>
                    <Icon name="loader-circle" size={16} className="as-spin jack-job-spin" />
                  </Link>
                ))
              ) : (
                <p className="jack-none">
                  Nothing running. Documents, images and team tasks show here while they work.
                </p>
              )}
            </section>

            <section aria-labelledby="jack-suggests" className="jack-col">
              <h2 id="jack-suggests" className="jack-ov">
                Jack suggests
              </h2>
              {home.suggestions.map((s) => (
                <button
                  key={s.text}
                  type="button"
                  className="jack-suggest"
                  onClick={() => {
                    setText(s.text);
                    document.querySelector<HTMLTextAreaElement>('.jack-composer textarea')?.focus();
                  }}
                >
                  <Icon name={s.icon as IconName} size={16} />
                  <span>{s.text}</span>
                  <Icon name="arrow-right" size={16} />
                </button>
              ))}
            </section>
          </div>
        )}
      </div>

      {isBusiness && (
        <aside className="jack-aside" aria-label="Your team">
          <div className="jack-aside-head">
            <h2 className="jack-ov">Your team</h2>
            <Link href="/team">{team ? 'Manage' : 'Set up'}</Link>
          </div>
          {agents.length ? (
            agents.map((a) => (
              <Link key={a.id} href={`/team?agent=${a.id}`} className="jack-agent">
                <AgentAvatar icon={a.icon} size={32} />
                <span className="jack-agent-text">
                  <span className="jack-agent-name">{a.name}</span>
                  <span className="jack-agent-role">{a.role}</span>
                </span>
                <AgentStatus status={a.status} />
              </Link>
            ))
          ) : (
            <p className="jack-none">
              No team yet. Jack can set one up for {business.name}: lead replies, social posts, the CRM and
              more.
            </p>
          )}
          <div className="jack-rule" />
          <h2 className="jack-ov">This space</h2>
          <div className="jack-space-rows">
            <Link href="/memory">
              <Icon name="brain" size={16} />
              <span>Business memory</span>
              <span className="jack-muted">
                {home.memoryCount} {home.memoryCount === 1 ? 'fact' : 'facts'}
              </span>
            </Link>
            <Link href="/connections">
              <Icon name="link" size={16} />
              <span>Apps</span>
              <span className="jack-muted">{home.apps.length ? home.apps.join(', ') : 'None yet'}</span>
            </Link>
            <Link href="/connections#models">
              <Icon name="shield-check" size={16} />
              <span>Models</span>
              <span className="jack-muted">Choose providers</span>
            </Link>
          </div>
          <p className="jack-aside-foot">Credits come from your one plan.</p>
        </aside>
      )}
    </div>
  );
}
