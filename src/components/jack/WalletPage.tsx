'use client';
import { useJack } from '@/lib/assistant';
import Link from 'next/link';
import { useState } from 'react';
import { Badge, Banner, Button, Chip, Dialog, Field, Icon } from '@/ui';
import { api, type Schemas } from '@/lib/api/client';
import { toApiError } from '@/lib/api/errors';
import './wallet.css';

type Wallet = Schemas['WalletDto'];
type Receipt = Schemas['ReceiptDto'];
type Limit = 'perPurchase' | 'perDay' | 'perMonth';

const LIMITS: { id: Limit; label: string }[] = [
  { id: 'perPurchase', label: 'Per purchase' },
  { id: 'perDay', label: 'Per day' },
  { id: 'perMonth', label: 'Per month' },
];

const money = (n: number) => n.toLocaleString('en-US');
const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const MAX_LIMIT = 100_000_000;
/** A limit as typed ("12,000"): a whole number, or null when it isn't one. */
const parseLimit = (s: string): number | null => {
  const t = s.replace(/[,\s]/g, '');
  return /^\d+$/.test(t) ? Number(t) : null;
};
const limitProblem = (s: string): string | null => {
  const n = parseLimit(s);
  if (n === null) return 'Enter a whole amount, like 25,000.';
  if (n > MAX_LIMIT) return `Use ${money(MAX_LIMIT)} or less.`;
  return null;
};
/** A site address typed as a link or with www, reduced to its domain ("example.com"). */
const siteAddress = (s: string): string | null => {
  const t = s.trim().toLowerCase();
  let host = t;
  try {
    host = new URL(t.includes('://') ? t : `https://${t}`).hostname;
  } catch {
    return null;
  }
  host = host.replace(/^www\./, '');
  return /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(host) ? host : null;
};

const STATUS = {
  paid: { tone: 'success', icon: 'check', label: 'Paid' },
  refunded: { tone: 'neutral', icon: 'rotate-ccw', label: 'Refunded' },
  failed: { tone: 'danger', icon: 'circle-x', label: 'Failed' },
} as const;

/** Wallet (v2 design): the card Jack pays with, your limits, blocked sites and receipts. One space at a time. */
export function WalletPage({
  initial,
  receipts,
  space,
}: {
  initial: Wallet;
  receipts: Receipt[];
  space: 'personal' | 'business';
}) {
  const jack = useJack();
  const [w, setW] = useState(initial);
  const [limits, setLimits] = useState(() => ({
    perPurchase: money(initial.perPurchase),
    perDay: money(initial.perDay),
    perMonth: money(initial.perMonth),
  }));
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);
  const [blocking, setBlocking] = useState(false);
  const [open, setOpen] = useState<Receipt | null>(null);
  const card = w.card as unknown as { brand: string; last4: string };
  const label = (s: string) => w.siteKinds.find((k) => k.id === s)?.label ?? s;
  const changed = LIMITS.some((l) => parseLimit(limits[l.id]) !== w[l.id]);
  const [limitErrors, setLimitErrors] = useState<Partial<Record<Limit, string>>>({});

  const patch = async (body: Schemas['UpdateWalletDto'], ok: string) => {
    const { data, error } = await api.PATCH('/api/wallet', { body });
    if (!data) {
      setToast({ tone: 'danger', text: toApiError(error).message });
      return false;
    }
    setW(data);
    setToast({ tone: 'success', text: ok });
    return true;
  };

  const saveLimits = async () => {
    // Check every field first; nothing is saved while one is wrong.
    const errors: Partial<Record<Limit, string>> = {};
    for (const l of LIMITS) {
      const p = limitProblem(limits[l.id]);
      if (p) errors[l.id] = p;
    }
    const n = (id: Limit) => parseLimit(limits[id]) ?? 0;
    if (!errors.perPurchase && !errors.perDay && n('perPurchase') > n('perDay'))
      errors.perPurchase = 'Can’t be more than the daily limit.';
    if (!errors.perDay && !errors.perMonth && n('perDay') > n('perMonth'))
      errors.perDay = 'Can’t be more than the monthly limit.';
    setLimitErrors(errors);
    if (Object.keys(errors).length) {
      setToast(null);
      return;
    }
    setSaving(true);
    const ok = await patch(
      { perPurchase: n('perPurchase'), perDay: n('perDay'), perMonth: n('perMonth') },
      'Limits saved',
    );
    setSaving(false);
    if (ok)
      setLimits({
        perPurchase: money(n('perPurchase')),
        perDay: money(n('perDay')),
        perMonth: money(n('perMonth')),
      });
  };

  const exportCsv = () => {
    const rows = [
      ['Date', 'What', 'Seller', 'Site', 'Amount', 'Currency', 'Status', 'Card', 'Test'],
      ...receipts.map((r) => [
        r.createdAt.slice(0, 10),
        r.item,
        r.seller,
        r.site,
        String(r.amount),
        r.currency,
        r.status,
        `•••• ${r.cardLast4}`,
        r.test ? 'yes' : 'no',
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `aiainai-receipts-${space}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="wal">
      <div className="wal-head">
        <h1 className="title-lg">Wallet</h1>
        <p>
          How {jack.name} pays, and the limits he works within
          {space === 'business' ? ' for the business' : ''}.
        </p>
      </div>
      {w.test && (
        <Banner tone="neutral" icon="info">
          Test mode: {jack.name} goes through the whole purchase, but no real money moves. Real one-time cards
          start once card issuing is switched on.
        </Banner>
      )}
      {toast && (
        <Banner tone={toast.tone} onDismiss={() => setToast(null)}>
          {toast.text}
        </Banner>
      )}

      <div className="wal-top">
        <section className="wal-card" aria-labelledby="wal-card-h">
          <h2 id="wal-card-h" className="wal-ov">
            Card
          </h2>
          <div className="wal-plastic">
            <div className="wal-plastic-top">
              <span className="wal-plastic-name">One-time cards</span>
              {w.test && (
                <Badge tone="warning" icon={false}>
                  Test
                </Badge>
              )}
              <Icon name="shield-check" size={18} label="Protected" />
            </div>
            <div>
              <div className="wal-number">•••• •••• •••• {card.last4}</div>
              <div className="wal-sm wal-muted">
                From your {card.brand} · each purchase gets its own card number
              </div>
            </div>
          </div>
          <p className="wal-sm wal-muted">
            Sites never see your real card, and a one-time card can’t be charged again.
          </p>
          <div>
            <Button size="sm" icon="credit-card" disabled title="Available when card issuing is switched on">
              Change card
            </Button>
          </div>
        </section>

        <section className="wal-card" aria-labelledby="wal-limits-h">
          <h2 id="wal-limits-h" className="wal-ov">
            Spending limits
          </h2>
          <div className="wal-limits">
            {LIMITS.map((l) => (
              <Field
                key={l.id}
                label={`${l.label} (${w.currency})`}
                inputMode="numeric"
                value={limits[l.id]}
                error={limitErrors[l.id]}
                onChange={(e) => {
                  setLimits((x) => ({ ...x, [l.id]: e.target.value }));
                  setLimitErrors((x) => ({ ...x, [l.id]: undefined }));
                }}
              />
            ))}
          </div>
          <div className="wal-spent wal-sm">
            <span>
              Spent today:{' '}
              <b>
                {w.currency} {money(w.spentToday)}
              </b>
            </span>
            <span>
              This month:{' '}
              <b>
                {w.currency} {money(w.spentMonth)}
              </b>
            </span>
            {changed && (
              <Button
                size="sm"
                variant="primary"
                icon="check"
                loading={saving}
                onClick={() => void saveLimits()}
              >
                Save limits
              </Button>
            )}
          </div>
          <div className="wal-lock wal-sm">
            <Icon name="lock" size={16} />
            <span>
              {jack.name} asks you before every purchase, with the item, price and seller. This is always on.
            </span>
          </div>

          <h2 className="wal-ov wal-ov-gap">Sites {jack.name} must never use</h2>
          <div className="wal-chips">
            {w.blockedSites.map((s) => (
              <span key={s} className="as-chip tag wal-site">
                <Icon name="ban" size={16} />
                {label(s)}
                <button
                  type="button"
                  className="wal-x"
                  aria-label={`Allow ${label(s)} again`}
                  onClick={() =>
                    void patch(
                      { blockedSites: w.blockedSites.filter((x) => x !== s) },
                      `${label(s)} allowed again`,
                    )
                  }
                >
                  <Icon name="x" size={14} />
                </button>
              </span>
            ))}
            <Button size="sm" variant="ghost" icon="plus" onClick={() => setBlocking(true)}>
              Block a site
            </Button>
          </div>
        </section>
      </div>

      <section className="wal-card wal-receipts" aria-labelledby="wal-rec-h">
        <div className="wal-rec-head">
          <h2 id="wal-rec-h" className="wal-ov">
            Receipts
          </h2>
          <Button size="sm" variant="ghost" icon="download" disabled={!receipts.length} onClick={exportCsv}>
            Export CSV
          </Button>
        </div>
        {receipts.length ? (
          <div className="wal-table-wrap">
            <table className="wal-tbl">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>What</th>
                  <th>Seller</th>
                  <th className="num">Amount</th>
                  <th>Status</th>
                  <th>
                    <span className="sr-only">Receipt</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((r) => {
                  const st = STATUS[r.status];
                  return (
                    <tr key={r.id}>
                      <td>{day(r.createdAt)}</td>
                      <td>{r.item}</td>
                      <td>{r.seller}</td>
                      <td className="num">
                        {r.currency} {money(r.amount)}
                      </td>
                      <td>
                        <Badge tone={st.tone} icon={st.icon}>
                          {st.label}
                          {r.test ? ' · test' : ''}
                        </Badge>
                      </td>
                      <td>
                        <button type="button" className="wal-link" onClick={() => setOpen(r)}>
                          Receipt
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="wal-sm wal-muted wal-none">
            No purchases yet. When {jack.name} buys something for you, the receipt shows here.
          </p>
        )}
      </section>

      <BlockDialog
        open={blocking}
        wallet={w}
        onClose={() => setBlocking(false)}
        onBlock={async (site) => {
          const ok = await patch(
            { blockedSites: [...w.blockedSites, site] },
            `${jack.name} won’t use ${label(site)}`,
          );
          if (ok) setBlocking(false);
          return ok;
        }}
      />
      <Dialog open={!!open} title="Receipt" width={440} onClose={() => setOpen(null)}>
        {open && (
          <dl className="wal-receipt">
            {[
              ['What', open.item],
              ['Seller', `${open.seller} · ${open.site}`],
              ['Amount', `${open.currency} ${money(open.amount)}`],
              ['Paid with', `One-time card •••• ${open.cardLast4}`],
              ['Date', new Date(open.createdAt).toLocaleString('en-GB')],
              [
                'Status',
                `${STATUS[open.status].label}${open.test ? ' (test mode — no real money moved)' : ''}`,
              ],
            ].map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
            {open.chatId && (
              <div>
                <dt>Asked in</dt>
                <dd>
                  <Link href={`/chat/${open.chatId}`}>The conversation</Link>
                </dd>
              </div>
            )}
          </dl>
        )}
      </Dialog>
    </div>
  );
}

function BlockDialog({
  open,
  wallet,
  onClose,
  onBlock,
}: {
  open: boolean;
  wallet: Wallet;
  onClose: () => void;
  onBlock: (site: string) => Promise<boolean>;
}) {
  const jack = useJack();
  const [site, setSite] = useState('');
  const [siteError, setSiteError] = useState('');
  const kinds = wallet.siteKinds.filter((k) => !wallet.blockedSites.includes(k.id));
  const submit = async (value: string, kind = false) => {
    if (!value.trim()) return;
    const entry = kind ? value : siteAddress(value);
    if (!entry) return setSiteError('Enter a site address, like example.com.');
    if (wallet.blockedSites.includes(entry)) return setSiteError('That site is already blocked.');
    if (await onBlock(entry)) setSite('');
  };
  return (
    <Dialog
      open={open}
      title="Block a site"
      description={`${jack.name} won’t open these sites, even if a task leads there.`}
      width={480}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" icon="ban" disabled={!site.trim()} onClick={() => void submit(site)}>
            Block
          </Button>
        </>
      }
    >
      {kinds.length > 0 && (
        <div className="wal-chips wal-kinds">
          {kinds.map((k) => (
            <Chip key={k.id} shape="tag" icon="ban" onClick={() => void submit(k.id, true)}>
              {k.label}
            </Chip>
          ))}
        </div>
      )}
      <Field
        label="Or a site address"
        placeholder="example.com"
        value={site}
        error={siteError || undefined}
        onChange={(e) => {
          setSite(e.target.value);
          setSiteError('');
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void submit(site);
        }}
      />
    </Dialog>
  );
}
