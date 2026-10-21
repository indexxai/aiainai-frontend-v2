'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Badge, Banner, Button, Dialog, Icon, Tabs, cx, type IconName } from '@/ui';
import { api, type Schemas } from '@/lib/api/client';
import { formatDay } from '@/lib/credits';
import { useShellCrumbs } from '@/components/shell/crumbs';
import { CreditsBanner } from './CreditsBanner';
import { PACKS, startCheckout } from './checkout';
import './billing.css';

type Summary = Schemas['BillingSummaryDto'];
type History = Schemas['HistoryDto'];
type Payments = Schemas['PaymentsDto'];
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
export function BillingView({
  summary,
  history,
  payments,
  checkout,
}: {
  summary: Summary;
  history: History;
  payments: Payments;
  /** Back from Stripe: the checkout id, or "cancelled". */
  checkout?: string;
}) {
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
  const [dialog, setDialog] = useState<'topup' | null>(null);
  const [pack, setPack] = useState<(typeof PACKS)[number]['id']>('1200');
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [paid, setPaid] = useState<{ tone: 'success' | 'neutral' | 'warning'; text: string } | null>(
    checkout === 'cancelled'
      ? { tone: 'neutral', text: 'Payment cancelled. Nothing was charged.' }
      : checkout
        ? { tone: 'neutral', text: 'Checking your payment…' }
        : null,
  );
  const router = useRouter();

  // Back from Stripe: confirm the payment (the webhook may not have arrived yet) and say so.
  useEffect(() => {
    if (!checkout) return;
    window.history.replaceState(null, '', pathname);
    if (checkout === 'cancelled') return;
    void api
      .POST('/api/billing/checkout/{id}/confirm', { params: { path: { id: checkout } } })
      .then(({ data }) => {
        if (!data)
          return setPaid({
            tone: 'warning',
            text: 'We couldn’t check that payment. Please refresh in a moment.',
          });
        if (data.status === 'paid') {
          setPaid({
            tone: 'success',
            text:
              data.kind === 'topup'
                ? `Payment received. ${n(data.credits)} credits added.`
                : `Payment received. You’re on Jack Personal${data.paidUntil ? ` until ${formatDay(data.paidUntil)}` : ''}.`,
          });
          router.refresh();
        } else if (data.status === 'pending')
          setPaid({
            tone: 'neutral',
            text: 'Your payment is processing. Credits appear as soon as it clears.',
          });
        else setPaid({ tone: 'warning', text: 'The payment didn’t go through. Nothing was charged.' });
      });
  }, [checkout, pathname, router]);

  const buy = async () => {
    setPaying(true);
    setPayError(null);
    const err = await startCheckout({ kind: 'topup', pack });
    if (err) {
      setPayError(err);
      setPaying(false);
    }
  };

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
      {paid ? (
        <Banner tone={paid.tone} onDismiss={() => setPaid(null)}>
          {paid.text}
        </Banner>
      ) : (
        <CreditsBanner credits={credits} plan={plan.key} />
      )}

      <div className="bl-head">
        <div>
          <h1 className="title-lg bl-title">Billing and usage</h1>
          <p className="bl-sub">Your plan, credits, storage and payments. Plan credits reset on {reset}.</p>
        </div>
        <div className="bl-actions">
          <Link href="/settings/billing/plans" className="as-btn secondary">
            Compare plans
          </Link>
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
              {plan.key === 'free' ? 'No charge · ' : '$20 a month · '}
              {n(plan.monthlyCredits)} credits a month
            </div>
          </div>
          <div className="bl-muted sm">
            {plan.paidUntil
              ? `Paid until ${formatDay(plan.paidUntil)} · doesn’t renew automatically`
              : `Credits renew on ${reset}`}
          </div>
          <div className="bl-card-btns">
            <Link href="/settings/billing/plans" className="as-btn secondary sm">
              {plan.key === 'free' ? 'Upgrade' : 'Change plan'}
            </Link>
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
              <div className="bl-strong">
                {payments.mode === 'off' ? 'Payments aren’t set up yet' : 'Pay as you go, by Stripe'}
              </div>
              <div className="bl-muted sm">
                {payments.mode === 'off'
                  ? 'Paying for Jack Personal and buying credits will be handled securely by Stripe.'
                  : 'Each payment is one-time: nothing renews automatically. Card details stay with Stripe; receipts go to your email.'}
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
              { value: 'invoices', label: 'Payments' },
            ]}
          />
          {tab === 'usage' && items.length > 0 && (
            <Button size="sm" variant="ghost" icon="download" onClick={exportCsv}>
              Export CSV
            </Button>
          )}
        </div>
        {tab === 'invoices' ? (
          payments.items.length === 0 ? (
            <p className="bl-muted sm bl-empty">Payments appear here after your first one.</p>
          ) : (
            <div className="bl-table-wrap">
              <table className="bl-table">
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Item</th>
                    <th scope="col">Status</th>
                    <th scope="col" className="num">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {payments.items.map((p) => (
                    <tr key={p.id}>
                      <td className="muted">{when(p.at)}</td>
                      <td>{p.item}</td>
                      <td>
                        <Badge tone="success">Paid</Badge>
                      </td>
                      <td className="num">
                        {(p.amountCents / 100).toLocaleString('en-US', {
                          style: 'currency',
                          currency: p.currency.toUpperCase(),
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
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
        open={dialog === 'topup'}
        title="Top up credits"
        description="One-time payment. Top-up credits never expire and are used after your plan credits."
        width={480}
        onClose={() => {
          setDialog(null);
          setPayError(null);
        }}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDialog(null)} disabled={paying}>
              Cancel
            </Button>
            <Button variant="primary" iconRight="arrow-right" loading={paying} onClick={() => void buy()}>
              Continue to payment
            </Button>
          </>
        }
      >
        <div className="bl-packs" role="radiogroup" aria-label="Credit pack">
          {PACKS.map((p) => (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={pack === p.id}
              className={cx('bl-pack', pack === p.id && 'on')}
              onClick={() => setPack(p.id)}
            >
              <span className="bl-pack-dot" aria-hidden />
              <span className="bl-pack-credits">
                <b>{n(p.credits)} credits</b>
                {'note' in p && <small>{p.note}</small>}
              </span>
              <span className="bl-pack-price">{p.price}</span>
            </button>
          ))}
        </div>
        {payError && (
          <Banner tone="warning" className="bl-pay-err">
            {payError}
          </Banner>
        )}
        <p className="bl-muted sm bl-secure">
          <Icon name="lock" size={14} /> Secure payment by Stripe. You’ll come back here when it’s done.
        </p>
      </Dialog>
    </div>
  );
}
