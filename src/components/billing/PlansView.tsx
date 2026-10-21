'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Badge, Banner, Button, Icon, Tabs, cx, type IconName } from '@/ui';
import { formatDay } from '@/lib/credits';
import { useShellCrumbs } from '@/components/shell/crumbs';
import { startCheckout } from './checkout';
import './plans.css';

type Tab = 'personal' | 'business';
type PlanKey = 'free' | 'pro';

type Plan = {
  key: string;
  name: string;
  tagline: string;
  blurb: string;
  price: string;
  per?: string;
  features: [IconName, string][];
  /** The plan we point people to on this tab. */
  main?: boolean;
  soon?: boolean;
  /** Same as the account's `plan.key`, when this card is that plan. */
  planKey?: PlanKey;
};

const PLANS: Record<Tab, Plan[]> = {
  personal: [
    {
      key: 'free',
      planKey: 'free',
      name: 'Jack Free',
      tagline: 'Get started',
      blurb: 'Try Jack on everyday tasks with Auto and the fast AIs.',
      price: '0',
      per: '/ month',
      features: [
        ['sparkles', 'Auto and the fast models'],
        ['zap', '100 credits a month'],
        ['message-square', 'Chat, Docs, Images and Research'],
        ['hard-drive', '1 GB of storage'],
      ],
    },
    {
      key: 'personal',
      planKey: 'pro',
      name: 'Jack Personal',
      tagline: 'Every AI, one plan',
      blurb: 'Jack picks the best AI for each task and gets it done, from trips to bills to email.',
      price: '20',
      per: '/ month',
      main: true,
      features: [
        ['brain', 'Every model, incl. GPT, Claude Opus and Gemini Pro'],
        ['zap', '2,000 credits a month'],
        ['globe', 'Jack’s browser, Wallet and apps'],
        ['image', 'Higher quality image creation'],
        ['hard-drive', '20 GB of storage'],
        ['refresh-cw', 'Top-ups that roll over'],
      ],
    },
    {
      key: 'plus',
      name: 'Jack Plus',
      tagline: 'Higher limits',
      blurb: 'For people who rely on Jack throughout the day.',
      price: '50',
      per: '/ month',
      soon: true,
      features: [
        ['check', 'Everything in Personal'],
        ['zap', 'More credit and higher limits'],
        ['star', 'The strongest AIs first'],
        ['workflow', 'Priority workflows and advanced tools'],
        ['sparkles', 'Early access to new models'],
      ],
    },
  ],
  business: [
    {
      key: 'team',
      name: 'Captain Jack Team',
      tagline: 'Your AI crew',
      blurb: 'Captain Jack and his crew of agents run the busywork of your business.',
      price: '100',
      per: '/ workspace a month',
      main: true,
      soon: true,
      features: [
        ['bot', 'Up to 10 agents besides Captain Jack'],
        ['users', 'Shared workspace for your team'],
        ['shield-check', 'Choose which AIs may see company data'],
        ['list-checks', 'Every step and cost on record'],
        ['receipt', 'Central billing and usage controls'],
      ],
    },
    {
      key: 'enterprise',
      name: 'Captain Jack Enterprise',
      tagline: 'For organisations at scale',
      blurb: 'Custom crews, pricing and controls for larger companies.',
      price: 'Custom',
      per: 'by agreement',
      soon: true,
      features: [
        ['check', 'Everything in Team'],
        ['scale', 'Custom pricing and usage pools'],
        ['lock', 'Governance, security and compliance'],
        ['users-round', 'Dedicated support and SLA'],
      ],
    },
  ],
};

const RANK: Record<string, number> = { free: 0, pro: 1 };

/** "Upgrade your plan": Personal and Business plans side by side (from the Compare plans popup). */
export function PlansView({
  current,
  paidUntil,
  initialTab,
  cancelled = false,
}: {
  current: PlanKey;
  paidUntil: string | null;
  initialTab: Tab;
  /** Came back from Stripe without paying. */
  cancelled?: boolean;
}) {
  const pathname = usePathname();
  useShellCrumbs({
    path: pathname,
    items: [
      { label: 'Settings', href: '/settings' },
      { label: 'Billing and usage', href: '/settings/billing' },
      { label: 'Plans' },
    ],
    back: '/settings/billing',
  });
  const [tab, setTab] = useState<Tab>(initialTab);
  const [paying, setPaying] = useState(false);
  const [message, setMessage] = useState<{ tone: 'neutral' | 'warning'; text: string } | null>(
    cancelled ? { tone: 'neutral', text: 'Payment cancelled. Nothing was charged.' } : null,
  );

  // Back from Stripe without paying: drop ?checkout from the address.
  useEffect(() => {
    if (cancelled)
      window.history.replaceState(null, '', initialTab === 'business' ? '?tab=business' : pathname);
  }, [cancelled, initialTab, pathname]);

  const pay = async () => {
    setPaying(true);
    setMessage(null);
    const err = await startCheckout({ kind: 'plan', plan: 'pro' });
    if (err) {
      setMessage({ tone: 'warning', text: err });
      setPaying(false);
    }
  };

  const pick = (t: string) => {
    const next = t === 'business' ? 'business' : 'personal';
    setTab(next);
    // Keep the tab in the address so a link or refresh lands on it, without reloading the page.
    window.history.replaceState(null, '', next === 'business' ? '?tab=business' : pathname);
  };

  const plans = PLANS[tab];
  return (
    <div className="pl">
      <h1 className="pl-title">Upgrade your plan</h1>
      {message && (
        <Banner tone={message.tone} className="pl-banner" onDismiss={() => setMessage(null)}>
          {message.text}
        </Banner>
      )}
      <Tabs
        variant="segmented"
        className="pl-tabs"
        label="Plan type"
        value={tab}
        onChange={pick}
        items={[
          { value: 'personal', label: 'Personal' },
          { value: 'business', label: 'Business' },
        ]}
      />

      <div
        key={tab}
        role="tabpanel"
        aria-label={tab === 'business' ? 'Business plans' : 'Personal plans'}
        className="pl-cards"
        style={{ ['--n' as string]: plans.length }}
      >
        {plans.map((p, i) => {
          const isCurrent = p.planKey === current;
          const below = p.planKey !== undefined && RANK[p.planKey]! < RANK[current]!;
          return (
            <section
              key={p.key}
              className={cx('pl-card', p.main && 'main', isCurrent && 'current')}
              style={{ ['--i' as string]: i }}
              aria-labelledby={`pl-${p.key}`}
            >
              <div className="pl-name">
                <h2 id={`pl-${p.key}`}>{p.name}</h2>
                {isCurrent ? (
                  <Badge tone="success" icon="check">
                    Current
                  </Badge>
                ) : p.soon ? (
                  <Badge icon={false}>Coming soon</Badge>
                ) : null}
              </div>
              <div className="pl-tagline">{p.tagline}</div>
              <p className="pl-blurb">{p.blurb}</p>

              {isCurrent && p.planKey === 'pro' && paidUntil ? (
                <Button className="pl-cta" loading={paying} onClick={() => void pay()}>
                  Add another month
                </Button>
              ) : isCurrent ? (
                <Button className="pl-cta" disabled>
                  Your current plan
                </Button>
              ) : p.soon ? (
                <Button className="pl-cta" disabled>
                  Coming soon
                </Button>
              ) : below ? (
                <Button className="pl-cta" variant="ghost" disabled>
                  Included in every plan
                </Button>
              ) : (
                <Button
                  className="pl-cta"
                  variant="primary"
                  icon="sparkles"
                  loading={paying}
                  onClick={() => void pay()}
                >
                  Upgrade
                </Button>
              )}

              <div className="pl-price">
                {p.price === 'Custom' ? (
                  <b>Custom</b>
                ) : (
                  <>
                    <sup>$</sup>
                    <b>{p.price}</b>
                  </>
                )}
                {p.per && <span>{p.per}</span>}
              </div>
              {isCurrent && p.planKey === 'pro' && paidUntil && (
                <div className="pl-paid">Paid until {formatDay(paidUntil)}</div>
              )}

              <ul className="pl-feats">
                {p.features.map(([icon, t]) => (
                  <li key={t}>
                    <Icon name={icon} size={18} />
                    {t}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <p className="pl-foot">
        <Icon name="lock" size={14} /> One-time payments through Stripe. Plans don’t renew automatically: add
        another month whenever you like. <Link href="/settings/billing">See billing and usage</Link>
      </p>
    </div>
  );
}
