import type { Metadata } from 'next';
import Link from 'next/link';
import {
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
import { ArtBackdrop } from '@/components/landing/ArtBackdrop';
import { BUSINESS_ART } from '@/components/landing/art';
import { Badge, Icon, type IconName } from '@/ui';

export const metadata: Metadata = {
  title: { absolute: 'Captain Jack and his crew — Jack’s AI for business' },
  description:
    'AI agents that run the busywork of your business: lead replies, social posts, your CRM and reports. Captain Jack is coming soon.',
};

const STEPS: [IconName, string, string][] = [
  ['message-circle', 'Tell him', 'What your business does'],
  ['user-plus', 'He hires a crew', 'Agents for each job'],
  ['sliders-horizontal', 'You set the rules', 'What needs your OK'],
  ['zap', 'They get to work', 'Every day'],
];

const CREW: [IconName, string, 'success' | 'warning' | 'info' | 'neutral', IconName | undefined, string][] = [
  ['mail', 'Lead replies · 6 quotes answered', 'success', 'check', 'Done'],
  ['megaphone', 'Social posts · Friday’s post is ready', 'warning', 'hand', 'Needs your OK'],
  ['contact', 'CRM · adding today’s leads', 'info', undefined, 'Working'],
  ['file-text', 'Weekly report · Monday 9:00', 'neutral', 'clock', 'Scheduled'],
];

const APPS: [IconName, string, boolean][] = [
  ['mail', 'Gmail', false],
  ['calendar', 'Google Calendar', false],
  ['hard-drive', 'Google Drive', false],
  ['hash', 'Slack', false],
  ['contact', 'HubSpot · soon', true],
];

/** One month of posting days: only one post made. */
const MONTH = Array.from({ length: 28 }, (_, i) => i === 2);

const FAQ: [string, string][] = [
  [
    'When can I use Captain Jack?',
    'He’s coming soon. Sign up free today to use Jack of all trades, and tap “Tell me when it’s ready” on Captain Jack to hear first.',
  ],
  [
    'Do I need to set up the agents myself?',
    'No. Describe your business and Captain Jack proposes the crew. You just keep, change or remove agents.',
  ],
  [
    'Will the crew email customers without me?',
    'Only if you allow it. You choose what needs your OK, for one agent or the whole crew.',
  ],
  [
    'Can I control the cost?',
    'Yes. Set a daily credit limit. The crew stops there, and you see the cost of every step.',
  ],
];

/** Captain Jack for business, coming soon (design "42 · Captain Jack landing page — minimal"). */
export default function BusinessPage() {
  return (
    <div className="ml">
      <ArtBackdrop pieces={BUSINESS_ART} />
      <SiteHeader
        current="business"
        links={[
          { href: '/for/personal', label: 'Personal' },
          { href: '/for/business', label: 'For business', current: true },
          { href: '#crew', label: 'Your crew' },
          { href: '#pricing', label: 'Pricing' },
        ]}
        cta={{ href: '/signup', label: 'Get early access' }}
      />

      <main>
        <section className="ml-hero" aria-labelledby="ml-title">
          <div className="ml-hero-text">
            <span className="ml-pill">
              <i />
              Coming soon · Jack’s AI for business
            </span>
            <h1 id="ml-title" className="ml-h1">
              Captain Jack
              <br />
              <span>and his crew.</span>
            </h1>
            <p className="ml-slogan" style={{ maxWidth: 560 }}>
              AI agents that run the busywork <span>of your business.</span>
            </p>
            <div className="ml-ctas">
              <Link href="/signup" className="as-btn primary">
                Get early access
                <Icon name="arrow-right" size={16} />
              </Link>
              <Link href="/for/personal" className="as-btn ghost">
                Try Jack of all trades today
              </Link>
            </div>
          </div>
          <Ring
            label="Captain Jack with his crew of AI agents: lead replies, social posts, CRM and reports"
            nodes={[
              { icon: 'mail', label: 'Lead replies', x: 366, y: 199 },
              { icon: 'megaphone', label: 'Social posts', x: 608, y: 328 },
              { icon: 'contact', label: 'CRM', x: 474, y: 584 },
              { icon: 'file-text', label: 'Reports', x: 185, y: 626 },
            ]}
            mascots={[{ space: 'business', x: 121, y: 418, height: 240 }]}
          />
        </section>

        <section className="ml-sec" aria-labelledby="ml-pain">
          <H2 id="ml-pain" muted="not an inbox.">
            You started a business,
          </H2>
          <ul className="ml-pains">
            <li>
              <div
                className="ml-pain-art"
                role="img"
                aria-label="A quote request from 7 pm, still unanswered"
              >
                <span className="ml-lead-card">
                  <Icon name="mail" size={24} />
                  <span>
                    <b>Quote request</b>
                    <small>7:02 pm · no reply</small>
                  </span>
                  <Icon name="clock" size={20} />
                </span>
              </div>
              <b>Leads wait</b>
              <span>By morning, they’ve called someone else.</span>
            </li>
            <li>
              <div className="ml-pain-art" role="img" aria-label="A month with one post">
                <div className="ml-cal">
                  {MONTH.map((on, i) => (
                    <i key={i} className={on ? 'on' : undefined} />
                  ))}
                </div>
              </div>
              <b>Posts slip</b>
              <span>One post a week becomes one a month.</span>
            </li>
            <li>
              <div className="ml-pain-art" role="img" aria-label="A pile of admin">
                <div className="ml-pile">
                  <span />
                  <span />
                  <span>
                    <Icon name="receipt" size={28} />
                  </span>
                </div>
              </div>
              <b>Admin piles up</b>
              <span>The CRM is stale. Reports are late.</span>
            </li>
          </ul>
        </section>

        <section id="crew" className="ml-sec" aria-labelledby="ml-crew">
          <H2 id="ml-crew" muted="ready in four steps.">
            Your crew,
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
          <figure className="ml-example" style={{ margin: 0 }} aria-label="Example: a crew at work">
            <div className="ml-answer">
              <span className="ml-avatar">
                <Face space="business" size={40} motion="nod" />
              </span>
              <div className="ml-card">
                <div className="ml-card-head">
                  <b>Skyline Roofing · your crew</b>
                  <span>Today · 38 credits</span>
                </div>
                {CREW.map(([icon, t, tone, badgeIcon, state]) => (
                  <div key={t} className="ml-row">
                    <Icon name={icon} size={20} />
                    <span>{t}</span>
                    <Badge tone={tone} icon={badgeIcon}>
                      {state}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </figure>
        </section>

        <section className="ml-sec" aria-labelledby="ml-rules">
          <H2 id="ml-rules" muted="the rules.">
            You set
          </H2>
          <div className="ml-modes" role="img" aria-label="Approval modes: Ask first is selected">
            <div className="ml-mode on">
              <b>Ask first</b>Nothing goes out without your OK
            </div>
            <div className="ml-mode">
              <b>Drafts only</b>The crew prepares, you send
            </div>
            <div className="ml-mode">
              <b>On its own</b>For jobs you trust it with
            </div>
          </div>
          <figure
            className="ml-approve"
            style={{ margin: '24px 0 0' }}
            aria-label="Example: replies waiting for approval"
          >
            <span className="ml-peeker" aria-hidden>
              <Face space="business" size={76} motion="peek" />
            </span>
            <div className="ml-approve-head">
              <Icon name="send" size={20} />
              <b>Send replies to 3 new leads</b>
              <Badge tone="warning" icon="hand">
                Waiting
              </Badge>
            </div>
            <div className="ml-quote">
              “Hi Sara, thanks for getting in touch. We’d be happy to inspect your roof for free this week.”
            </div>
            <div className="ml-ctas">
              <span className="as-btn primary" aria-hidden>
                <Icon name="check" size={16} />
                Approve and send
              </span>
              <span className="as-btn ghost" aria-hidden>
                <Icon name="pencil" size={16} />
                Edit first
              </span>
            </div>
          </figure>
        </section>

        <section className="ml-sec" aria-labelledby="ml-apps">
          <H2 id="ml-apps" muted="your apps.">
            Works in
          </H2>
          <ul className="ml-feats apps" style={{ ['--n' as string]: 5, width: 'min(100%, 760px)' }}>
            {APPS.map(([icon, t, soon]) => (
              <li key={t} className={soon ? 'ml-feat soon' : 'ml-feat'}>
                <span>
                  <Icon name={icon} size={28} />
                </span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
          <p className="ml-sub">Your own sign-in. The crew never sees your passwords.</p>
        </section>

        <section className="ml-sec ml-pair" aria-labelledby="ml-data">
          <ul className="ml-switches" aria-label="Which AI companies may see company data">
            <li>
              <span>OpenAI</span>
              <span className="ml-sw on" role="img" aria-label="On" />
            </li>
            <li>
              <span>Anthropic</span>
              <span className="ml-sw on" role="img" aria-label="On" />
            </li>
            <li>
              <span>Google</span>
              <span className="ml-sw on" role="img" aria-label="On" />
            </li>
            <li className="off">
              <span>DeepSeek</span>
              <span className="ml-sw" role="img" aria-label="Off" />
            </li>
          </ul>
          <div className="ml-pair-text">
            <H2 id="ml-data" muted="stays where you say.">
              Company data
            </H2>
            <Points
              items={[
                ['shield-check', 'Choose which AIs may see it'],
                ['lock', 'Kept apart from Personal'],
                ['list-checks', 'Every step and cost on record'],
              ]}
            />
          </div>
        </section>

        <section id="pricing" className="ml-sec" aria-labelledby="ml-pricing">
          <H2 id="ml-pricing" muted="for the whole crew.">
            One plan
          </H2>
          <Plans
            plans={[
              {
                name: 'Try Captain Jack',
                price: '$0',
                lines: ['He proposes your crew', 'Starter credit for a first run'],
                cta: { href: '/signup', label: 'Get early access' },
              },
              {
                name: 'Team',
                price: '$100',
                per: '/ month',
                lines: ['Your AI crew, monthly credit', 'Shared workspace for your team'],
                cta: { href: '/signup', label: 'Get early access' },
                main: true,
                face: 'business',
              },
              {
                name: 'Enterprise',
                price: 'Custom',
                lines: ['Custom pricing and usage pools', 'Security and compliance'],
                cta: { href: '/signup', label: 'Talk to us' },
              },
            ]}
          />
          <p className="ml-sub" style={{ fontSize: 15 }}>
            Prices are confirmed at launch.
          </p>
          <CrossLink
            space="personal"
            href="/for/personal"
            title="Just need help for yourself?"
            rest="Jack of all trades is ready today"
          />
        </section>

        <Faq items={FAQ} />

        <End
          spaces={['business']}
          title="Your crew is"
          muted="almost ready."
          cta={{ href: '/signup', label: 'Get early access' }}
        />
      </main>
      <SiteFooter />
    </div>
  );
}
