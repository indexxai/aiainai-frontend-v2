'use client';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Badge, Button, Dialog, Icon, Tabs, cx, type IconName } from '@/ui';
import { api, type Schemas } from '@/lib/api/client';
import { formatDay } from '@/lib/credits';
import { useShellCrumbs } from '@/components/shell/crumbs';
import { CreditsBanner } from './CreditsBanner';
import './billing.css';

type Summary = Schemas['BillingSummaryDto'];
type History = Schemas['HistoryDto'];
type Item = Schemas['HistoryItemDto'];

const TOOL_ICONS: Record<string, IconName> = {
  chat: 'message-square',
  docs: 'file-text',
  image: 'image',
  research: 'globe',
  team: 'users',
  files: 'folder',
};

const STATUS: Record<Item['status'], { label: string; tone: 'success' | 'danger' | 'neutral' }> = {
  charged: { label: 'Charged', tone: 'success' },
  stopped: { label: 'Stopped', tone: 'neutral' },
  failed: { label: 'Failed · not charged', tone: 'danger' },
  added: { label: 'Added', tone: 'success' },
  expired: { label: 'Expired', tone: 'neutral' },
};

const n = (x: number) => x.toLocaleString('en-US');
const gb = (bytes: number) => {
  const v = bytes / 1024 ** 3;
  return `${Number.isInteger(v) || v >= 10 ? Math.round(v) : v.toFixed(1)} GB`;
};

function when(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === today.toDateString()) return `Today, ${time}`;
  const y = new Date(today);
  y.setDate(y.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return `Yesterday, ${time}`;
  return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}, ${time}`;
}

/** Billing and usage (design: BillingFlow overview). Payments arrive with Stripe in milestone 2. */
export function BillingView({ summary, history }: { summary: Summary; history: History }) {
  const pathname = usePathname();
  useShellCrumbs({
    path: pathname,
    items: [{ label: 'Settings', href: '/settings' }, { label: 'Billing and usage' }],
    back: '/settings',
  });
  const [items, setItems] = useState(history.items);
  const [cursor, setCursor] = useState(history.nextCursor);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('usage');
  const [dialog, setDialog] = useState<'plans' | 'topup' | null>(null);

  const { plan, credits, storage } = summary;
  const reset = formatDay(plan.periodEnd);
  const planLeft = Math.min(credits.plan, plan.monthlyCredits);
  const pctLeft = plan.monthlyCredits ? Math.round((planLeft / plan.monthlyCredits) * 100) : 0;
  const maxTool = Math.max(1, ...summary.byTool.map((t) => t.credits));

  const loadMore = async () => {
    if (!cursor) return;
    setLoading(true);
    const { data } = await api.GET('/api/billing/history', { params: { query: { cursor } } });
    setLoading(false);
    if (data) {
      setItems((i) => [...i, ...data.items]);
      setCursor(data.nextCursor);
    }
  };

  const exportCsv = () => {
    const rows = [
      ['Date', 'Activity', 'Status', 'Credits'],
      ...items.map((i) => [i.at, i.activity, STATUS[i.status].label, String(i.credits)]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `aiainai-credits-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="bl">
      <CreditsBanner credits={credits} plan={plan.key} />

      <div className="bl-head">
        <div>
          <h1 className="title-lg bl-title">Billing and usage</h1>
          <p className="bl-sub">Your plan, credits, storage and invoices. Plan credits reset on {reset}.</p>
        </div>
        <div className="bl-actions">
          <Button onClick={() => setDialog('plans')}>Compare plans</Button>
          <Button variant="primary" icon="zap" onClick={() => setDialog('topup')}>
            Top up credits
          </Button>
        </div>
      </div>

      <div className="bl-grid3">
        <section className="bl-card" aria-labelledby="bl-plan">
          <div className="bl-card-top">
            <h2 id="bl-plan" className="bl-ov">
              Plan
            </h2>
            <Badge tone="success">Active</Badge>
          </div>
          <div>
            <div className="bl-plan-name">{plan.label}</div>
            <div className="bl-muted">
              {/* The Pro price isn't set yet (OPEN_DECISIONS D12); show it here once it is. */}
              {plan.key === 'free' && 'No charge · '}
              {n(plan.monthlyCredits)} credits a month
            </div>
          </div>
          <div className="bl-muted sm">Credits renew on {reset}</div>
          <div className="bl-card-btns">
            <Button size="sm" onClick={() => setDialog('plans')}>
              {plan.key === 'free' ? 'Upgrade' : 'Change plan'}
            </Button>
          </div>
        </section>

        <section className="bl-card" aria-labelledby="bl-credits">
          <h2 id="bl-credits" className="bl-ov">
            Credits
          </h2>
          <div className="bl-big-row">
            <span className="bl-big">{n(credits.spendable)}</span>
            <span className="bl-muted">credits available</span>
          </div>
          <div
            className="bl-meter"
            role="meter"
            aria-label="Plan credits left"
            aria-valuenow={pctLeft}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div style={{ width: `${pctLeft}%` }} />
          </div>
          <div className="bl-kvs">
            <div className="bl-kv">
              <span>Plan credits · reset {formatDay(plan.periodEnd).replace(/ \d{4}$/, '')}</span>
              <b>
                {n(planLeft)} of {n(plan.monthlyCredits)}
              </b>
            </div>
            <div className="bl-kv">
              <span>Top-up credits · roll over</span>
              <b>{n(credits.topup)}</b>
            </div>
            <div className="bl-kv">
              <span>Held for running jobs</span>
              <b>{n(credits.held)}</b>
            </div>
          </div>
        </section>

        <section className="bl-card" aria-labelledby="bl-storage">
          <h2 id="bl-storage" className="bl-ov">
            Storage
          </h2>
          <div className="bl-big-row">
            <span className="bl-big">{gb(storage.usedBytes)}</span>
            <span className="bl-muted">of {gb(storage.limitBytes)}</span>
          </div>
          <div className="bl-meter" aria-hidden>
            <div style={{ width: `${Math.min(100, (storage.usedBytes / storage.limitBytes) * 100)}%` }} />
          </div>
          <div className="bl-kvs">
            <div className="bl-kv">
              <span>Files and uploads</span>
              <b>0 GB</b>
            </div>
            <div className="bl-kv">
              <span>Generated images and exports</span>
              <b>0 GB</b>
            </div>
          </div>
        </section>
      </div>

      <div className="bl-grid2">
        <section className="bl-card" aria-labelledby="bl-tools">
          <div className="bl-card-top">
            <h2 id="bl-tools" className="bl-ov">
              Credits by tool this period
            </h2>
            <span className="bl-muted sm">{n(summary.usedThisPeriod)} used</span>
          </div>
          {summary.byTool.length === 0 ? (
            <p className="bl-muted sm bl-empty">Nothing used yet this period.</p>
          ) : (
            <ul className="bl-tools">
              {summary.byTool.map((t) => (
                <li key={t.tool}>
                  <span className="bl-tool-name">
                    <Icon name={TOOL_ICONS[t.tool] ?? 'sparkles'} size={16} />
                    {t.label}
                  </span>
                  <span className="bl-bar" aria-hidden>
                    <i style={{ width: `${(t.credits / maxTool) * 100}%` }} />
                  </span>
                  <b>{n(t.credits)}</b>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bl-card" aria-labelledby="bl-pay">
          <h2 id="bl-pay" className="bl-ov">
            Payment
          </h2>
          <div className="bl-pay-empty">
            <span className="bl-pay-ic">
              <Icon name="credit-card" size={18} />
            </span>
            <div>
              <div className="bl-strong">No card yet</div>
              <div className="bl-muted sm">
                Paying for Jack Personal and buying credits arrive in the next update. Payments will be
                handled securely by Stripe.
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="bl-card bl-history" aria-labelledby="bl-hist">
        <div className="bl-hist-head">
          <h2 id="bl-hist" className="bl-h2">
            History
          </h2>
          <Tabs
            variant="segmented"
            label="History"
            value={tab}
            onChange={setTab}
            items={[
              { value: 'usage', label: 'Usage' },
              { value: 'invoices', label: 'Invoices' },
            ]}
          />
          {tab === 'usage' && items.length > 0 && (
            <Button size="sm" variant="ghost" icon="download" onClick={exportCsv}>
              Export CSV
            </Button>
          )}
        </div>
        {tab === 'invoices' ? (
          <p className="bl-muted sm bl-empty">Invoices appear here after your first payment.</p>
        ) : items.length === 0 ? (
          <p className="bl-muted sm bl-empty">No credit activity yet.</p>
        ) : (
          <div className="bl-table-wrap">
            <table className="bl-table">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Activity</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="num">
                    Credits
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.id}>
                    <td className="muted">{when(i.at)}</td>
                    <td>{i.activity}</td>
                    <td>
                      <Badge tone={STATUS[i.status].tone}>{STATUS[i.status].label}</Badge>
                    </td>
                    <td className={cx('num', i.credits === 0 && 'muted')}>
                      {i.credits > 0 ? `+${n(i.credits)}` : i.credits < 0 ? `−${n(-i.credits)}` : '0'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {tab === 'usage' && cursor && (
          <Button
            size="sm"
            variant="ghost"
            className="bl-more"
            loading={loading}
            onClick={() => void loadMore()}
          >
            Show more
          </Button>
        )}
      </section>

      <Dialog
        open={dialog === 'plans'}
        title="Compare plans"
        description="Pay Jack once and he picks the best quality for the price from every AI. Credits pay for AI work: a quick answer uses about 1, a long document about 6."
        width={960}
        onClose={() => setDialog(null)}
        footer={
          <>
            <span className="bl-muted sm bl-grow">Upgrading arrives with payments in the next update.</span>
            <Button variant="primary" onClick={() => setDialog(null)}>
              Done
            </Button>
          </>
        }
      >
        <div className="bl-plans">
          {[
            {
              key: 'free',
              name: 'Jack Free',
              price: '$0',
              per: '',
              credits: '100 credits a month',
              rows: ['Auto and the fast models', '1 GB storage', 'Chat, Docs, Images, Research'],
            },
            {
              key: 'pro',
              name: 'Jack Personal',
              price: '$20',
              per: 'a month',
              credits: '2,000 credits a month',
              rows: [
                'Every model, incl. GPT, Claude Opus, Gemini Pro',
                '20 GB storage',
                'Top-ups that roll over',
              ],
            },
            {
              key: 'plus',
              name: 'Jack Plus',
              price: '$50',
              per: 'a month',
              credits: 'Higher limits and more credit',
              rows: ['Priority workflows and advanced tools', 'Early access to new models'],
              soon: true,
            },
            {
              key: 'team',
              name: 'Captain Jack Team',
              price: '$100',
              per: 'per workspace a month',
              credits: 'For teams and small businesses',
              rows: ['Shared workspace for your team', 'Central billing and usage controls'],
              soon: true,
            },
            {
              key: 'enterprise',
              name: 'Captain Jack Enterprise',
              price: 'Custom',
              per: 'by agreement',
              credits: 'For organisations at scale',
              rows: ['Governance, security and compliance', 'Dedicated support and SLA'],
              soon: true,
            },
          ].map((p) => (
            <div key={p.key} className={cx('bl-plan', plan.key === p.key && 'current')}>
              <div className="bl-plan-tag">
                {plan.key === p.key && <Badge icon={false}>Current plan</Badge>}
                {'soon' in p && <Badge icon={false}>Coming soon</Badge>}
              </div>
              <b>{p.name}</b>
              <div className="bl-plan-price">
                {p.price} {p.per && <span>{p.per}</span>}
              </div>
              <div className="bl-muted">{p.credits}</div>
              <ul>
                {p.rows.map((r) => (
                  <li key={r}>
                    <Icon name="check" size={16} />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Dialog>
      <Dialog
        open={dialog === 'topup'}
        title="Top up credits"
        description="Buying extra credits arrives with payments in the next update. Top-up credits never expire and are used after your plan credits."
        width={480}
        onClose={() => setDialog(null)}
        footer={
          <Button variant="primary" onClick={() => setDialog(null)}>
            OK
          </Button>
        }
      />
    </div>
  );
}
