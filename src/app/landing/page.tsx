import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { GodRing } from '@/components/jack/GodRing';
import { JackImg } from '@/components/jack/JackImg';
import { Icon, type IconName } from '@/ui';
import { JACKS } from '@/lib/jack';
import '@/components/jack/jack.css';
import './landing.css';

export const metadata: Metadata = {
  title: { absolute: 'Jack’s AI — God’s Perspective AI Gateway. One Jack. Every AI.' },
  description:
    'Every AI works for Jack: ChatGPT, Claude, Gemini and hundreds more. He picks the best quality for the price, gets it done, and asks before anything important.',
};

const MODELS = ['ChatGPT', 'Claude', 'Gemini', 'Kimi', 'Qwen', 'Llama', 'Mistral', 'Grok'];

const STATS = [
  ['500+', 'AI models', 'from more than 80 companies, each with its own app, sign-up and bill.'],
  ['~600×', 'price gap', 'between the cheapest and the most expensive model for the same amount of text.'],
  ['3%', 'of US households', 'pay for AI today. Most people simply don’t know what to buy.'],
];

const STEPS = [
  ['You ask', 'In plain words. No model names, no settings.'],
  ['Jack plans', 'Works out what you really need and splits it into steps.'],
  ['Jack picks', 'The right AI, agent or tool, with the best quality for the price.'],
  ['Jack delivers', 'Checks the work and asks you before anything important.'],
];

const PICKS = [
  ['A quick question', 'Small, fast model', 'Simple job: no need to pay more'],
  ['Compare 3 airline websites', 'Low-cost reading model', 'Lots of reading, simple choices'],
  ['Write a business report', 'Strong reasoning model', 'Quality matters, so it’s worth it'],
  ['Check the final result', 'A second, different model', 'Catches mistakes before you see them'],
];

const FEATURES: [IconName, string, string][] = [
  ['sparkles', 'God’s Perspective', 'One AI gateway that directs every other AI for you.'],
  [
    'zap',
    'Best quality for the price',
    'Jack compares quality and cost, then picks the right AI for each job.',
  ],
  ['message-circle', 'Plain words', 'Ask like you would ask a person. No settings to learn.'],
  ['user-round', 'Two Jacks', 'Personal and Business spaces, kept completely apart.'],
  ['users', 'AI Crews', 'Captain Jack runs agents for leads, posts and your CRM.'],
  ['globe', 'Jack’s browser', 'Compares prices, fills in forms and books things for you.'],
  ['lock', 'Safe wallet', 'One-time cards with spending limits you set.'],
  ['hand', 'Asks first', 'Your OK before paying, sending or posting anything.'],
  ['brain', 'Memory', 'Remembers what you like. You can see and edit it.'],
  ['workflow', 'Connections', 'Gmail, Google Calendar, HubSpot, YaysApp and more.'],
  ['file-text', 'Create', 'Documents, images and research with sources.'],
  ['list-checks', 'Activity log', 'Every step, the AI that did it, and what it cost.'],
];

const PLANS = [
  [
    'Jack Free',
    'Get started',
    '$0',
    '',
    ['Limited trial or bring your own API key', 'Explore AI models, agents and tools'],
    'Start free',
  ],
  [
    'Jack Personal',
    'Individual productivity',
    '$20',
    '/ month',
    [
      'Platform plan with included credit',
      'Access to leading AI models and tools',
      'Transparent top-ups, no surprises',
    ],
    'Get Jack Personal',
  ],
  [
    'Jack Plus',
    'Power users',
    '$50',
    '/ month',
    [
      'Higher usage limits and more credit',
      'Priority workflows and advanced tools',
      'Early access to new models and features',
    ],
    'Get Jack Plus',
  ],
  [
    'Captain Jack Team',
    'Teams and small businesses',
    '$100',
    '/ workspace / month',
    [
      'Shared workspace for your team',
      'Central billing and usage controls',
      'Team collaboration and admin features',
    ],
    'Start a team',
  ],
  [
    'Captain Jack Enterprise',
    'Organisations at scale',
    'Custom',
    '/ agreement',
    ['Custom pricing and usage pools', 'Governance, security and compliance', 'Dedicated support and SLA'],
    'Talk to us',
  ],
] as const;

const WALLET = [
  ['$20 collected', 'Your Jack Personal plan this month', '$20', true],
  ['OpenAI / GPT usage', 'Model usage and tools', '$5', false],
  ['Claude / Anthropic usage', 'Model usage and tools', '$6', false],
  ['Other AI and tools', 'For example Google, Perplexity, specialist tools', '$4', false],
  ['Remaining for platform', 'Platform operations and your balance', '$5', true],
] as const;

const TRUST: [IconName, string, string][] = [
  ['hand', 'Asks before anything important', 'Paying, sending emails or posting always needs your OK.'],
  ['sliders-horizontal', 'Limits you set', 'Spending caps per purchase and per day, and one-time cards.'],
  ['list-checks', 'Every step on record', 'What was done, by which AI, and what it cost.'],
  ['lock', 'Business data stays put', 'Choose which AI companies may see company data.'],
];

const WHY = [
  ['AIs from every company', 'One company’s models', 'Hundreds, in one place'],
  ['Best quality for the price', 'You choose, or one default', 'Picked automatically'],
  ['Gets real tasks done', 'Some, inside their app', 'Plans, acts, asks first'],
  ['Personal and business', 'Separate plans', 'Two Jacks, one account'],
  ['Paying for AI', 'One bill per app', 'One subscription'],
];

const FAQ = [
  [
    'Do I need to know which AI to use?',
    'No. Jack compares quality and cost and picks for you, every time, and tells you which one did the work.',
  ],
  [
    'Will Jack spend my money without asking?',
    'Never. Payments, emails and posts always need your OK, within limits you set.',
  ],
  [
    'Is my business data safe?',
    'Business and Personal spaces are kept apart, and you choose which AI companies may see company data.',
  ],
  [
    'What if I run out of credit mid-task?',
    'Jack pauses and shows a one-tap top-up. Nothing is charged without you.',
  ],
  ['Can I switch between Personal and Business?', 'Yes, any time, from the top bar or the sidebar.'],
];

function Head({ eyebrow, title, lead, id }: { eyebrow: string; title: string; lead?: string; id: string }) {
  return (
    <div className="lp-head">
      <div className="lp-eyebrow">{eyebrow}</div>
      <h2 id={id} className="lp-h2">
        {title}
      </h2>
      {lead && <p className="lp-lead">{lead}</p>}
    </div>
  );
}

/**
 * The Jack’s AI landing page for signed-out visitors (designs "ainsi.si landing page", desktop and
 * phone): a flat, open layout with thin dividers — no boxes inside boxes.
 */
export default function LandingPage() {
  return (
    <div className="lp" data-theme="dark">
      <header className="lp-top">
        <Link href="/" className="lp-brand">
          <Image src="/brand/jacks-ai-mark.png" alt="" width={27} height={32} priority />
          <span>Jack&rsquo;s AI</span>
        </Link>
        <nav className="lp-nav" aria-label="Page">
          <a href="#how">How it works</a>
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <a href="#two-jacks">For business</a>
          <a href="#faq">FAQ</a>
        </nav>
      </header>

      <main>
        <section className="lp-hero" aria-labelledby="lp-title">
          <div className="lp-hero-text">
            <h1 id="lp-title" className="lp-h1">
              God’s Perspective AI&nbsp;Gateway
            </h1>
            <p className="lp-tag">
              One Jack. <em>Every AI.</em>
            </p>
            <p className="lp-lead">
              Every AI works for Jack: ChatGPT, Claude, Gemini and hundreds more. Tell him what you need. He
              picks the best quality for the price, gets it done, and asks before anything important.
            </p>
          </div>
          <GodRing space="personal" />
        </section>

        <section className="lp-models" aria-label="Every AI works for Jack">
          <div className="lp-eyebrow">Every AI works for Jack</div>
          <div className="lp-model-row">
            {MODELS.map((m) => (
              <span key={m}>{m}</span>
            ))}
            <span className="lp-muted">+ hundreds more</span>
          </div>
        </section>

        <section className="lp-sec" aria-labelledby="lp-problem">
          <Head
            id="lp-problem"
            eyebrow="The problem"
            title="Too many AIs. Too many prices. Nobody knows which one to use."
          />
          <div className="lp-cols lp-cols-3">
            {STATS.map(([n, t, d]) => (
              <div key={t} className="lp-col">
                <span className="lp-num">{n}</span>
                <span className="lp-t">{t}</span>
                <span className="lp-d">{d}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="lp-sec" id="how" aria-labelledby="lp-how">
          <Head
            id="lp-how"
            eyebrow="How it works"
            title="You ask once. Jack does the rest."
            lead="Jack works like a family doctor. He listens, finds what you really need, and hands each part to the right specialist. You never have to know which AI does what."
          />
          <div className="lp-cols lp-cols-4">
            {STEPS.map(([t, d], i) => (
              <div key={t} className="lp-col">
                <span className="lp-step">0{i + 1}</span>
                <span className="lp-t">{t}</span>
                <span className="lp-d">{d}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="lp-sec" aria-labelledby="lp-price">
          <Head
            id="lp-price"
            eyebrow="Feature highlight"
            title="Best quality for the price, automatically."
            lead="~600× price gap between models. Jack only pays for top models when the quality is worth it. Every answer shows which model did the work."
          />
          <table className="lp-tbl">
            <thead>
              <tr>
                <th scope="col">The task</th>
                <th scope="col">What Jack picks</th>
                <th scope="col">Why</th>
              </tr>
            </thead>
            <tbody>
              {PICKS.map(([a, b, c]) => (
                <tr key={a}>
                  <td>{a}</td>
                  <td className="lp-strong">{b}</td>
                  <td className="lp-muted">{c}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="lp-sec" id="two-jacks" aria-labelledby="lp-two">
          <Head
            id="lp-two"
            eyebrow="Two Jacks"
            title="One for your life. One for your business."
            lead="At sign-up we ask one question: personal or business? One click, and the right Jack shows up. Switch any time from the top bar or the sidebar."
          />
          <div className="lp-cols lp-cols-2">
            {(
              [
                [
                  'personal',
                  'Personal',
                  'Your personal assistant for everyday life.',
                  [
                    'Plans trips and compares flights',
                    'Pays bills and finds better plans',
                    'Shops and books, with your OK',
                  ],
                ],
                [
                  'business',
                  'Business and groups',
                  'Runs a team of AI agents for your business.',
                  [
                    'Replies to leads and keeps your CRM tidy',
                    'Writes and schedules social posts',
                    'Invoices, reports and meetings',
                  ],
                ],
              ] as const
            ).map(([space, eyebrow, line, items]) => (
              <div key={space} className="lp-col lp-jack">
                <JackImg space={space} part="full" className="lp-jack-img" />
                <div>
                  <div className="lp-eyebrow">{eyebrow}</div>
                  <div className="lp-jack-name">{JACKS[space].name}</div>
                  <p className="lp-d">{line}</p>
                  <ul className="lp-checks">
                    {items.map((t) => (
                      <li key={t}>
                        <Icon name="check" size={16} />
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="lp-sec" id="features" aria-labelledby="lp-features">
          <Head id="lp-features" eyebrow="Features" title="Everything Jack does for you" />
          <div className="lp-grid">
            {FEATURES.map(([icon, t, d]) => (
              <div key={t} className="lp-feature">
                <Icon name={icon} size={20} />
                <span className="lp-t">{t}</span>
                <span className="lp-d">{d}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="lp-sec" id="pricing" aria-labelledby="lp-pricing">
          <Head
            id="lp-pricing"
            eyebrow="Pricing"
            title="Pricing and the Jack Wallet"
            lead="Pay Jack to save time, cut the confusion and route your work to the right AI. One plan instead of many AI subscriptions."
          />
          <div className="lp-plans">
            {PLANS.map(([name, who, price, per, rows]) => (
              <div key={name} className="lp-plan">
                <div className="lp-t">{name}</div>
                <div className="lp-d">{who}</div>
                <div className="lp-plan-price">
                  {price} <span>{per}</span>
                </div>
                <ul className="lp-checks">
                  {rows.map((r) => (
                    <li key={r}>
                      <Icon name="check" size={16} />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="lp-wallet">
            <div>
              <div className="lp-t lp-big-t">The Jack Wallet</div>
              <p className="lp-d">
                See where every dollar goes. An illustrative month on Jack Personal. Actual provider costs,
                markups and top-ups are always shown to you and need your OK. Run low mid-task? One tap tops
                up, and Jack carries on.
              </p>
            </div>
            <dl className="lp-wallet-rows">
              {WALLET.map(([k, d, v, strong]) => (
                <div key={k} className={strong ? 'lp-wallet-row strong' : 'lp-wallet-row'}>
                  <dt>
                    <span>{k}</span>
                    <span className="lp-d">{d}</span>
                  </dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="lp-sec" aria-labelledby="lp-trust">
          <Head id="lp-trust" eyebrow="Trust" title="Jack is powerful. You stay in charge." />
          <div className="lp-cols lp-cols-4">
            {TRUST.map(([icon, t, d]) => (
              <div key={t} className="lp-col">
                <Icon name={icon} size={20} />
                <span className="lp-t">{t}</span>
                <span className="lp-d">{d}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="lp-sec" aria-labelledby="lp-why">
          <Head id="lp-why" eyebrow="Why Jack’s AI" title="We don’t compete with the AIs. We run them." />
          <table className="lp-tbl">
            <thead>
              <tr>
                <th scope="col">
                  <span className="sr-only">Compared</span>
                </th>
                <th scope="col">Single-AI apps</th>
                <th scope="col">Jack&rsquo;s AI</th>
              </tr>
            </thead>
            <tbody>
              {WHY.map(([a, b, c]) => (
                <tr key={a}>
                  <td>{a}</td>
                  <td className="lp-muted">{b}</td>
                  <td className="lp-strong">{c}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="lp-sec" id="faq" aria-labelledby="lp-faq">
          <Head id="lp-faq" eyebrow="Questions" title="Good to know" />
          <div className="lp-faq">
            {FAQ.map(([q, a]) => (
              <div key={q} className="lp-faq-row">
                <span className="lp-t">{q}</span>
                <span className="lp-d">{a}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="lp-end" aria-labelledby="lp-end">
          <div className="lp-end-jacks">
            <JackImg space="personal" part="full" className="lp-end-jack" />
            <JackImg space="business" part="full" className="lp-end-jack lp-end-captain" />
          </div>
          <h2 id="lp-end" className="lp-h2">
            Stop choosing AIs. Just ask Jack.
          </h2>
          <p className="lp-small">Free to start · No card needed</p>
        </section>
      </main>

      <footer className="lp-foot">
        <span className="lp-brand">
          <Image src="/brand/jacks-ai-mark.png" alt="" width={20} height={24} />
          <span>Jack&rsquo;s AI</span>
        </span>
        <a href="#how">How it works</a>
        <a href="#pricing">Pricing</a>
        <a href="#two-jacks">For business</a>
        <span className="lp-muted">© 2026 Jack&rsquo;s AI</span>
      </footer>
    </div>
  );
}
