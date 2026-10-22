'use client';
import { useJack } from '@/lib/assistant';
import Link from 'next/link';
import { useState } from 'react';
import { AgentAvatar } from '@/components/jack/AgentAvatar';
import { Chip, Icon, type IconName } from '@/ui';
import { api, type Schemas } from '@/lib/api/client';
import './activity.css';

type Activity = Schemas['ActivityDto'];
type Item = Schemas['ActivityItemDto'];
type Filter = {
  space: 'all' | 'personal' | 'business';
  kind: 'all' | 'conversation' | 'doc' | 'image' | 'purchases';
};

const FILTERS: { label: string; icon?: IconName; filter: Filter }[] = [
  { label: 'All', filter: { space: 'all', kind: 'all' } },
  { label: 'Personal', icon: 'user', filter: { space: 'personal', kind: 'all' } },
  { label: 'Business', icon: 'briefcase', filter: { space: 'business', kind: 'all' } },
  { label: 'Conversations', icon: 'message-square', filter: { space: 'all', kind: 'conversation' } },
  { label: 'Documents', icon: 'file-text', filter: { space: 'all', kind: 'doc' } },
  { label: 'Images', icon: 'image', filter: { space: 'all', kind: 'image' } },
  { label: 'Purchases', icon: 'credit-card', filter: { space: 'all', kind: 'purchases' } },
];

const same = (a: Filter, b: Filter) => a.space === b.space && a.kind === b.kind;

function dayLabel(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(now) - start(d)) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
}

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });

/** Activity (v2 design): one timeline for both spaces, with filters and what's coming up. */
export function ActivityPage({ initial }: { initial: Activity }) {
  const jack = useJack();
  const [data, setData] = useState(initial);
  const [filter, setFilter] = useState<Filter>({ space: 'all', kind: 'all' });
  const [loading, setLoading] = useState(false);

  const pick = async (f: Filter) => {
    setFilter(f);
    setLoading(true);
    const { data: next } = await api.GET('/api/activity', { params: { query: f } });
    setLoading(false);
    if (next) setData(next);
  };

  const groups: { day: string; items: Item[] }[] = [];
  for (const it of data.items) {
    const day = dayLabel(it.at);
    const g = groups.at(-1);
    if (g?.day === day) g.items.push(it);
    else groups.push({ day, items: [it] });
  }

  return (
    <div className="act">
      <div className="act-main" aria-busy={loading || undefined}>
        <div className="act-head">
          <h1 className="title-lg">Activity</h1>
          <p>Everything you and {jack.name} did in the last 30 days, and what’s planned.</p>
        </div>
        <div className="act-filters" role="group" aria-label="Show">
          {FILTERS.map((f) => (
            <Chip
              key={f.label}
              icon={f.icon}
              selected={same(f.filter, filter)}
              onClick={() => void pick(f.filter)}
            >
              {f.label}
            </Chip>
          ))}
        </div>
        {groups.length ? (
          groups.map((g) => (
            <section key={g.day} aria-label={g.day}>
              <h2 className="act-ov">{g.day}</h2>
              <ul className="act-list">
                {g.items.map((it) => (
                  <li key={it.id} className="act-row">
                    <span className="act-time">{time(it.at)}</span>
                    <Who item={it} />
                    <div className="act-what">
                      <div>
                        <b>{it.whoName}</b> {it.text}
                      </div>
                      <div className="act-detail">{it.detail}</div>
                    </div>
                    {it.href &&
                      (it.waiting ? (
                        <Link href={it.href} className="as-btn secondary sm">
                          <Icon name="hand" size={16} />
                          Review
                        </Link>
                      ) : (
                        <Link href={it.href} className="act-open">
                          Open
                        </Link>
                      ))}
                  </li>
                ))}
              </ul>
            </section>
          ))
        ) : (
          <p className="act-empty">
            {same(filter, { space: 'all', kind: 'all' })
              ? `Nothing yet. Ask ${jack.name} for something on the ${jack.name} page and it shows up here.`
              : 'Nothing here for this filter in the last 30 days.'}
          </p>
        )}
      </div>
      <aside className="act-aside" aria-label="Coming up">
        <h2 className="act-ov">Coming up</h2>
        {data.comingUp.length ? (
          <ul className="act-up">
            {data.comingUp.map((c) => (
              <li key={c.id}>
                <Icon name={(c.icon as IconName) ?? 'clock'} size={18} />
                <div>
                  {c.href ? <Link href={c.href}>{c.title}</Link> : c.title}
                  <div className="act-detail">{c.detail}</div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="act-detail">Nothing planned. Reminders and scheduled work will show here.</p>
        )}
      </aside>
    </div>
  );
}

function Who({ item }: { item: Item }) {
  if (item.who === 'jack') return <AgentAvatar captain jack={item.space} size={36} name={item.whoName} />;
  return (
    <span className="act-ic" aria-hidden>
      <Icon name={(item.icon as IconName) ?? 'circle'} size={16} />
    </span>
  );
}
