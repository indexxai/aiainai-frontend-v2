import type { Metadata } from 'next';
import Link from 'next/link';
import {
  AI_LOGOS,
  CrossLink,
  End,
  Face,
  Faq,
  H2,
  Plans,
  Points,
  Ring,
  SiteFooter,
  SiteHeader,
} from '@/components/landing/parts';
import { Badge, Icon, type IconName } from '@/ui';

export const metadata: Metadata = {
  title: { absolute: 'Jack of all trades, with God’s Perspective — Jack’s AI' },
  description:
    'Your AI for everyday life. Trips, bills, shopping, email and plans: Jack picks the best AI for each part, gets it done, and asks before he pays or sends anything.',
};

/** Ring positions on the design: Jack and the seven logos, evenly spaced. */
const RING_LOGOS = [
  { x: 270, y: 230 },
  { x: 455, y: 197 },
  { x: 602, y: 304 },
  { x: 572, y: 486 },
  { x: 430, y: 610 },
  { x: 245, y: 643 },
  { x: 98, y: 536 },
];

const AREAS: [IconName, string, string][] = [
  ['map-pin', 'Travel', '“A beach hotel under $150”'],
  ['receipt', 'Bills', '“A cheaper phone plan?”'],
  ['credit-card', 'Shopping', '“Same shoes, one size up”'],
  ['mail', 'Email & calendar', '“What’s on this week?”'],
  ['file-text', 'Documents', '“A packing list for the trip”'],
  ['image', 'Pictures', '“A birthday card with a cat”'],
  ['search', 'Research', '“Best family electric car?”'],
  ['folder', 'Your files', '“What does my lease say?”'],
];

const DAY: [string, IconName, string][] = [
  ['8:00', 'calendar', 'Your day at a glance'],
  ['11:30', 'mail', '3 replies drafted'],
  ['14:00', 'star', 'Concert tickets found'],
  ['18:00', 'list-checks', 'Weekend planned'],
  ['21:00', 'check', 'Dentist booked'],
];

/** Things Jack remembers, placed around him (left %, top %). */
const MEMORIES: [IconName, string, number, number][] = [
  ['map-pin', 'Aisle seats', 20, 18],
  ['star', 'No spicy food', 80, 16],
  ['clock', 'Morning flights', 10, 52],
  ['users', 'Family of four', 90, 50],
  ['receipt', 'Budget $2,000', 24, 86],
  ['mail', 'Replies short', 76, 84],
];

const FAQ: [string, string][] = [
  [
    'Do I need to know which AI to use?',
    'No. Jack picks the best AI for each part of the job and shows you which one did the work.',
  ],
  [
    'Will Jack spend my money without asking?',
    'No. Every payment waits for your OK, within limits you set in your Wallet.',
  ],
  [
    'Can Jack send email as me?',
    'Only if you allow it. For Gmail you choose: read only, drafts, ask first, or on his own.',
  ],
  ['Is it on my phone?', 'Yes. Use Jack in the browser on any phone, or message him on YaysApp.'],
];

/** Jack of all trades, for personal life (design "41 · Jack of all trades landing page — minimal"). */
export default function PersonalPage() {
  return (
    <div className="ml">
      <SiteHeader
        current="personal"
        links={[
          { href: '/for/personal', label: 'Personal', current: true },
          { href: '/for/business', label: 'For business' },
          { href: '#day', label: 'A day with Jack' },
          { href: '#pricing', label: 'Pricing' },
        ]}
        cta={{ href: '/signup', label: 'Get started free' }}
      />

      <main>
        <section className="ml-hero" aria-labelledby="ml-title">
          <div className="ml-hero-text">
            <span className="ml-pill">
              <i />
              Jack’s AI for personal life
            </span>
            <h1 id="ml-title" className="ml-h1">
              Jack of all trades,
              <br />
              <span>with God’s Perspective.</span>
            </h1>
            <p className="ml-slogan">
              One Jack. Every AI. <span>For everyday life.</span>
            </p>
            <div className="ml-ctas">
              <Link href="/signup" className="as-btn primary">
                Get started free
                <Icon name="arrow-right" size={16} />
              </Link>
              <a href="#day" className="as-btn ghost">
                See a day with Jack
              </a>
            </div>
          </div>
          <Ring
            label={`Jack of all trades on a ring of AI companies: ${AI_LOGOS.flatMap((l) => (l.alt ? [l.alt] : [])).join(', ')} and more`}
            logos={RING_LOGOS}
            mascots={[{ space: 'personal', x: 128, y: 406, height: 250 }]}
          />
        </section>

        <section className="ml-sec" aria-labelledby="ml-does">
          <H2 id="ml-does" muted="the stuff of everyday life.">
            Hand Jack
          </H2>
          <ul className="ml-feats" style={{ ['--n' as string]: 4 }}>
            {AREAS.map(([icon, t, ask]) => (
              <li key={t} className="ml-feat">
                <span>
                  <Icon name={icon} size={28} />
                </span>
                <span>{t}</span>
                <small>{ask}</small>
              </li>
            ))}
          </ul>
        </section>

        <section id="day" className="ml-sec" aria-labelledby="ml-day">
          <H2 id="ml-day" muted="with Jack.">
            A day
          </H2>
          <ol
            className="ml-flow day"
            style={{ ['--n' as string]: 5, ['--line-top' as string]: '66px', width: 'min(100%, 1160px)' }}
          >
            {DAY.map(([time, icon, t], i) => (
              <li key={time}>
                <span className="ml-time">{time}</span>
                <span className={i === DAY.length - 1 ? 'ml-node done' : 'ml-node'}>
                  <Icon name={icon} size={28} />
                </span>
                <b style={{ fontSize: 17, lineHeight: '24px' }}>{t}</b>
              </li>
            ))}
          </ol>
        </section>

        <section className="ml-sec" aria-labelledby="ml-how">
          <H2 id="ml-how" muted="Jack does the rest.">
            Ask once.
          </H2>
          <figure
            className="ml-example"
            style={{ margin: 0 }}
            aria-label="Example: a hotel found and waiting to be booked"
          >
            <div className="ml-bubble">Find a beach hotel in Bali for 3 nights, under $150 a night.</div>
            <div className="ml-answer">
              <span className="ml-avatar">
                <Face space="personal" size={36} motion="nod" />
              </span>
              <div className="ml-card">
                <div className="ml-row">
                  <Icon name="globe" size={20} />
                  <span>Compared 4 booking sites</span>
                  <Badge tone="success" icon="check">
                    Done
                  </Badge>
                </div>
                <div className="ml-row">
                  <Icon name="star" size={20} />
                  <span>Shortlisted 3 hotels by the beach</span>
                  <Badge tone="success" icon="check">
                    Done
                  </Badge>
                </div>
                <div className="ml-row">
                  <Icon name="credit-card" size={20} />
                  <span>Book Sea Breeze Villas · $138 a night</span>
                  <Badge tone="warning" icon="hand">
                    Needs your OK
                  </Badge>
                </div>
              </div>
            </div>
          </figure>
        </section>

        <section className="ml-sec ml-pair" aria-labelledby="ml-wallet">
          <div
            className="ml-wallet"
            role="img"
            aria-label="A one-time card from Jack’s Wallet with a $500 limit"
          >
            <div className="ml-ccard back" />
            <div className="ml-ccard front">
              <div className="ml-ccard-top">
                <b>Jack’s Wallet</b>
                <Icon name="lock" size={20} />
              </div>
              <div className="ml-ccard-num">•••• 4821</div>
              <div className="ml-ccard-foot">
                <span>One-time card</span>
                <span>Limit $500</span>
              </div>
            </div>
            <span className="ml-peeker" aria-hidden>
              <Face space="personal" size={76} motion="peek" />
            </span>
          </div>
          <div className="ml-pair-text">
            <H2 id="ml-wallet" muted="You say OK.">
              He shops and books.
            </H2>
            <Points
              items={[
                ['globe', 'Compares prices on real sites'],
                ['credit-card', 'One-time cards, your card stays private'],
                ['sliders-horizontal', 'Limits per purchase and per day'],
                ['hand', 'Never pays without you'],
              ]}
            />
          </div>
        </section>

        <section className="ml-sec" aria-labelledby="ml-mem">
          <H2 id="ml-mem" muted="so you don’t repeat.">
            He remembers,
          </H2>
          <div className="ml-mem" role="img" aria-label="Things Jack remembers about you">
            <span className="ml-mem-center">
              <span className="ml-one" style={{ width: 180, height: 180 }}>
                <Face space="personal" size={124} />
              </span>
            </span>
            {MEMORIES.map(([icon, t, x, y]) => (
              <span key={t} className="ml-tag" style={{ left: `${x}%`, top: `${y}%` }}>
                <Icon name={icon} size={16} />
                {t}
              </span>
            ))}
          </div>
          <p className="ml-sub">See it, edit it or forget it, any time.</p>
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
                lines: ['Starter credit', 'Chat, documents, images'],
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
          <CrossLink
            space="business"
            href="/for/business"
            title="Running a business?"
            rest="Meet Captain Jack · coming soon"
          />
        </section>

        <Faq items={FAQ} />

        <End
          spaces={['personal']}
          title="Got a to-do list?"
          muted="Just ask Jack."
          cta={{ href: '/signup', label: 'Get started free' }}
        />
      </main>
      <SiteFooter />
    </div>
  );
}
