import type { Metadata } from 'next';
import Link from 'next/link';
import {
  AI_LOGOS,
  End,
  Face,
  Faq,
  H2,
  Plans,
  Points,
  Ring,
  SiteFooter,
  SiteHeader,
  Stand,
} from '@/components/landing/parts';
import { ArtBackdrop } from '@/components/landing/ArtBackdrop';
import { LANDING_ART } from '@/components/landing/art';
import { Badge, Icon, type IconName } from '@/ui';

export const metadata: Metadata = {
  title: { absolute: 'Jack’s AI — God’s Perspective AI Gateway. One Jack. Every AI.' },
  description:
    'Every AI works for Jack: ChatGPT, Claude, Gemini and hundreds more. He picks the best quality for the price, gets it done, and asks before anything important.',
};

/** Ring positions: Jack and the seven logos, evenly spaced (same layout as the Jack of all trades page). */
const RING_LOGOS = [
  { x: 270, y: 230 },
  { x: 455, y: 197 },
  { x: 602, y: 304 },
  { x: 572, y: 486 },
  { x: 430, y: 610 },
  { x: 245, y: 643 },
  { x: 98, y: 536 },
];

/** 72 app tiles in uneven greys: "a lot of separate AI apps". */
const TILES = Array.from({ length: 72 }, (_, i) => {
  const o = 0.18 + (((i * 37) % 11) / 11) * 0.5 - (i % 12) * 0.012;
  return Math.max(0.12, Math.min(0.75, o)).toFixed(2);
});

const STEPS: [IconName, string, string][] = [
  ['message-circle', 'You ask', 'In plain words'],
  ['list-checks', 'Jack plans', 'Splits it into steps'],
  ['sparkles', 'Jack picks', 'The best AI for each'],
  ['check', 'You approve', 'Then it’s done'],
];

const TRIP: [IconName, string, string, string][] = [
  ['globe', 'Compare flights on 3 sites', 'DeepSeek', '1 credit'],
  ['file-text', 'Write the day-by-day plan', 'Claude', '2 credits'],
  ['list-checks', 'Double-check prices', 'GPT', '1 credit'],
];

const JOBS: [IconName, string, string, number, string][] = [
  ['message-circle', 'A quick question', 'Fast model', 30, '$'],
  ['globe', 'Compare 3 websites', 'Reading model', 60, '$$'],
  ['file-text', 'A business report', 'Strongest model', 95, '$$$'],
];

const FEATURES: [IconName, string][] = [
  ['globe', 'Browser'],
  ['credit-card', 'Wallet'],
  ['brain', 'Memory'],
  ['file-text', 'Docs'],
  ['image', 'Images'],
  ['search', 'Research'],
  ['link', 'Your apps'],
  ['mic', 'Voice'],
];

const FAQ: [string, string][] = [
  [
    'Do I need to know which AI to use?',
    'No. Jack compares quality and cost and picks for you, every time, and tells you which one did the work.',
  ],
  [
    'Will Jack spend money without asking?',
    'Never. Payments, emails and posts always need your OK, within limits you set.',
  ],
  [
    'Is my business data kept apart?',
    'Yes. Business and Personal spaces are kept apart, and you choose which AI companies may see company data.',
  ],
  ['What if I run out of credit?', 'Jack pauses and shows a one-tap top-up. Nothing is charged without you.'],
];

/** The Jack’s AI landing page for signed-out visitors (design "40 · Main landing page — minimal"). */
export default function LandingPage() {
  return (
    <div className="ml">
      <ArtBackdrop pieces={LANDING_ART} />
      <SiteHeader
        current="home"
        links={[
          { href: '#how', label: 'How it works' },
          { href: '/for/personal', label: 'Jack of all trades' },
          { href: '/for/business', label: 'Captain Jack' },
          { href: '#pricing', label: 'Pricing' },
        ]}
        cta={{ href: '/signup', label: 'Get started free' }}
      />

      <main>
        <section className="ml-hero" aria-labelledby="ml-title">
          <div className="ml-hero-text">
            <h1 id="ml-title" className="ml-h1">
              God’s Perspective AI&nbsp;Gateway
            </h1>
            <p className="ml-slogan">
              One Jack. <span>Every AI.</span>
            </p>
            <p className="ml-lead">
              Every AI works for Jack: ChatGPT, Claude, Gemini and hundreds more. Tell him what you need. He
              picks the best quality for the price, gets it done, and asks before anything important.
            </p>
            <div className="ml-ctas">
              <Link href="/signup" className="as-btn primary">
                Get started free
                <Icon name="arrow-right" size={16} />
              </Link>
              <a href="#how" className="as-btn ghost">
                See how it works
              </a>
            </div>
          </div>
          <Ring
            label={`Jack of all trades on a ring of AI companies: ${AI_LOGOS.flatMap((l) => (l.alt ? [l.alt] : [])).join(', ')} and more`}
            logos={RING_LOGOS}
            mascots={[{ space: 'personal', x: 128, y: 406, height: 250 }]}
          />
        </section>

        <section className="ml-sec" aria-labelledby="ml-many">
          <H2 id="ml-many" muted="One Jack.">
            500+ AI apps.
          </H2>
          <div className="ml-many">
            <div className="ml-many-side">
              <div className="ml-tiles" role="img" aria-label="Dozens of separate AI apps">
                {TILES.map((o, i) => (
                  <i key={i} style={{ opacity: Number(o) }} />
                ))}
              </div>
              <div className="ml-facts">
                <span>
                  <b>80+</b> companies
                </span>
                <span>
                  <b>80+</b> sign-ups
                </span>
                <span>
                  <b>80+</b> bills
                </span>
              </div>
            </div>
            <span className="ml-arrow" aria-hidden>
              <Icon name="arrow-right" size={28} />
            </span>
            <div className="ml-many-side">
              <span className="ml-one">
                <Face space="personal" size={132} />
              </span>
              <div className="ml-facts">
                <span>
                  <b>1</b> app
                </span>
                <span>
                  <b>1</b> bill
                </span>
              </div>
            </div>
          </div>
        </section>

        <section id="how" className="ml-sec" aria-labelledby="ml-how">
          <H2 id="ml-how" muted="Jack does the rest.">
            Ask once.
          </H2>
          <ol className="ml-flow">
            {STEPS.map(([icon, t, d], i) => (
              <li key={t}>
                <span className={i === STEPS.length - 1 ? 'ml-node done' : 'ml-node'}>
                  <Icon name={icon} size={28} />
                </span>
                <b>{t}</b>
                <span>{d}</span>
              </li>
            ))}
          </ol>
          <figure className="ml-example" style={{ margin: 0 }} aria-label="Example: a trip planned in steps">
            <div className="ml-bubble">Plan a 4-day Dubai trip for two, under $2,000.</div>
            <div className="ml-answer">
              <span className="ml-avatar">
                <Face space="personal" size={36} motion="nod" />
              </span>
              <div className="ml-card">
                {TRIP.map(([icon, t, model, cost]) => (
                  <div key={t} className="ml-row">
                    <Icon name={icon} size={20} />
                    <span>{t}</span>
                    <span className="ml-chip">{model}</span>
                    <span className="ml-cost">{cost}</span>
                  </div>
                ))}
                <div className="ml-row">
                  <Icon name="credit-card" size={20} />
                  <span>Book the flight · $412</span>
                  <Badge tone="warning" icon="hand">
                    Needs your OK
                  </Badge>
                </div>
              </div>
            </div>
          </figure>
        </section>

        <section className="ml-sec" aria-labelledby="ml-jobs">
          <H2 id="ml-jobs" muted="for each job.">
            The right AI
          </H2>
          <div className="ml-meters">
            {JOBS.map(([icon, t, model, power, cost]) => (
              <div key={t} className="ml-meter">
                <Icon name={icon} size={24} />
                <b>{t}</b>
                <div className="ml-meter-row">
                  <span>Power</span>
                  <span>{model}</span>
                </div>
                <div className="ml-bar" role="img" aria-label={`${model}: ${power}% of the strongest`}>
                  <i style={{ width: `${power}%` }} />
                </div>
                <div className="ml-meter-row">
                  <span>Cost</span>
                  <strong>{cost}</strong>
                </div>
              </div>
            ))}
          </div>
          <p className="ml-sub">
            Up to <b>600×</b> price gap between AIs. Jack never overpays.
          </p>
        </section>

        <section id="jacks" className="ml-sec" aria-labelledby="ml-jacks">
          <H2 id="ml-jacks" muted="One for business.">
            One for life.
          </H2>
          <div className="ml-jacks">
            <div className="ml-jack">
              <div className="ml-jack-art">
                <Stand space="personal" height={230} />
              </div>
              <div className="ml-jack-name">Jack of all trades</div>
              <div className="ml-jack-line">Your everyday helper.</div>
              <div className="ml-tags">
                <span className="ml-tag">
                  <Icon name="map-pin" size={16} />
                  Trips
                </span>
                <span className="ml-tag">
                  <Icon name="receipt" size={16} />
                  Bills
                </span>
                <span className="ml-tag">
                  <Icon name="credit-card" size={16} />
                  Shopping
                </span>
                <span className="ml-tag">
                  <Icon name="mail" size={16} />
                  Email
                </span>
              </div>
              <Link href="/for/personal" className="ml-link">
                Meet Jack of all trades <Icon name="arrow-right" size={16} />
              </Link>
            </div>
            <div className="ml-jack">
              <div className="ml-jack-art">
                <span className="ml-pill">
                  <i />
                  Coming soon
                </span>
                <Stand space="business" height={230} late />
              </div>
              <div className="ml-jack-name">Captain Jack</div>
              <div className="ml-jack-line">An AI crew for your business.</div>
              <div className="ml-tags">
                <span className="ml-tag">
                  <Icon name="users" size={16} />
                  Leads
                </span>
                <span className="ml-tag">
                  <Icon name="message-circle" size={16} />
                  Social posts
                </span>
                <span className="ml-tag">
                  <Icon name="layers" size={16} />
                  CRM
                </span>
                <span className="ml-tag">
                  <Icon name="file-text" size={16} />
                  Reports
                </span>
              </div>
              <Link href="/for/business" className="ml-link">
                Meet Captain Jack <Icon name="arrow-right" size={16} />
              </Link>
            </div>
          </div>
        </section>

        <section className="ml-sec ml-pair" aria-labelledby="ml-ok">
          <figure
            className="ml-approve"
            style={{ margin: 0 }}
            aria-label="Example payment waiting for approval"
          >
            <span className="ml-peeker" aria-hidden>
              <Face space="personal" size={76} motion="peek" />
            </span>
            <div className="ml-approve-head">
              <Icon name="credit-card" size={20} />
              <b>Pay $412 to Skyline Air</b>
              <Badge tone="warning" icon="hand">
                Waiting
              </Badge>
            </div>
            <dl className="ml-kv">
              <dt>What</dt>
              <dd>2 seats · Dubai · 14 Nov</dd>
              <dt>Card</dt>
              <dd>One-time card · limit $500</dd>
              <dt>Today</dt>
              <dd>$412 of your $1,000 limit</dd>
            </dl>
            <div className="ml-bar" style={{ height: 6 }}>
              <i style={{ width: '41%' }} />
            </div>
            <div className="ml-ctas">
              <span className="as-btn primary" aria-hidden>
                <Icon name="check" size={16} />
                Approve and pay
              </span>
              <span className="as-btn ghost" aria-hidden>
                Not now
              </span>
            </div>
          </figure>
          <div className="ml-pair-text">
            <H2 id="ml-ok" muted="without your OK.">
              Nothing happens
            </H2>
            <Points
              items={[
                ['hand', 'Asks before paying or sending'],
                ['sliders-horizontal', 'Spending limits you set'],
                ['list-checks', 'Every step on record'],
              ]}
            />
          </div>
        </section>

        <section className="ml-sec" aria-labelledby="ml-all">
          <div className="ml-heads">
            <Stand space="personal" height={130} />
            <H2 id="ml-all" muted="in one place.">
              Everything
            </H2>
            <Stand space="business" height={130} late />
          </div>
          <ul className="ml-feats" style={{ ['--n' as string]: 8 }}>
            {FEATURES.map(([icon, t]) => (
              <li key={t} className="ml-feat">
                <span>
                  <Icon name={icon} size={28} />
                </span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </section>

        <section id="pricing" className="ml-sec" aria-labelledby="ml-pricing">
          <H2 id="ml-pricing" muted="Every AI.">
            One plan.
          </H2>
          <Plans
            plans={[
              {
                name: 'Free',
                price: '$0',
                lines: ['Starter credit', 'Try every feature'],
                cta: { href: '/signup', label: 'Start free' },
              },
              {
                name: 'Personal',
                price: '$20',
                per: '/ month',
                lines: ['Monthly credit included', 'Browser, Wallet and apps'],
                cta: { href: '/signup', label: 'Get Personal' },
                main: true,
                face: 'personal',
              },
              {
                name: 'Plus',
                price: '$50',
                per: '/ month',
                lines: ['More credit, higher limits', 'The strongest AIs'],
                cta: { href: '/signup', label: 'Get Plus' },
              },
            ]}
          />
          <Link href="/for/business" className="ml-cross">
            <Face space="business" size={36} late />
            <span>
              <b>Captain Jack for teams</b> · coming soon
            </span>
          </Link>
        </section>

        <Faq items={FAQ} />

        <End
          spaces={['personal', 'business']}
          title="Got a to-do list?"
          muted="Just ask Jack."
          cta={{ href: '/signup', label: 'Get started free' }}
        />
      </main>
      <SiteFooter />
    </div>
  );
}
