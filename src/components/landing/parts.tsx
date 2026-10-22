import Image from 'next/image';
import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { JackImg } from '@/components/jack/JackImg';
import type { Space } from '@/lib/space';
import { Icon, cx, type IconName } from '@/ui';
import { Reveal } from './Reveal';
import { ThemeToggle } from './ThemeToggle';
import './landing.css';

/* Building blocks for the three public landing pages (designs: "Landing pages — minimal redesign"). */

export type LandingPage = 'home' | 'personal' | 'business';

/** Top bar: brand, page links, light/dark switch, sign-in and the page's main action. */
export function SiteHeader({
  current,
  links,
  cta,
}: {
  current: LandingPage;
  links: { href: string; label: string; current?: boolean }[];
  cta: { href: string; label: string };
}) {
  return (
    <header className="ml-top">
      <Reveal />
      <Link href="/" className="ml-brand">
        <Image src="/brand/jacks-ai-mark.png" alt="" width={27} height={32} priority />
        <span>Jack&rsquo;s AI</span>
      </Link>
      <nav className="ml-nav" aria-label="Site">
        {links.map((l) => (
          <Link key={l.href + l.label} href={l.href} aria-current={l.current ? 'page' : undefined}>
            {l.label}
          </Link>
        ))}
      </nav>
      <div className="ml-actions" data-page={current}>
        <ThemeToggle />
        <Link href="/signin" className="as-btn ghost">
          Sign in
        </Link>
        <Link href={cta.href} className="as-btn primary">
          {cta.label}
        </Link>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="ml-foot">
      <Link href="/" className="ml-brand">
        <Image src="/brand/jacks-ai-mark.png" alt="" width={20} height={24} />
        <span>Jack&rsquo;s AI</span>
      </Link>
      <Link href="/for/personal">Jack of all trades</Link>
      <Link href="/for/business">Captain Jack</Link>
      <Link href="/landing#pricing">Pricing</Link>
      <span>© 2026 Jack&rsquo;s AI</span>
    </footer>
  );
}

/** Heading with the second part muted: "One Jack. <muted>Every AI.</muted>" */
export function H2({
  children,
  muted,
  id,
  style,
}: {
  children: ReactNode;
  muted?: ReactNode;
  id?: string;
  style?: CSSProperties;
}) {
  return (
    <h2 className="ml-h2" id={id} style={style}>
      {children}
      {muted && (
        <>
          {' '}
          <span>{muted}</span>
        </>
      )}
    </h2>
  );
}

/** A full mascot standing, with its shadow, gently floating (late: out of step with the other). */
export function Stand({ space, height, late }: { space: Space; height: number; late?: boolean }) {
  const shadow = Math.round(height * 0.4);
  return (
    <div className="ml-stand" aria-hidden>
      <JackImg space={space} part="full" className={cx('ml-float', late && 'ml-late')} style={{ height }} />
      <div
        className={cx('ml-shadow', late && 'ml-late')}
        style={{ width: shadow, height: Math.round(shadow * 0.11) }}
      />
    </div>
  );
}

/** A mascot's face, moving (bob, nod or peek). */
export function Face({
  space,
  size,
  motion = 'bob',
  late,
  className,
}: {
  space: Space;
  size: number;
  motion?: 'bob' | 'nod' | 'peek';
  late?: boolean;
  className?: string;
}) {
  return (
    <JackImg
      space={space}
      part="head"
      className={cx('ml-head', `ml-${motion}`, late && 'ml-late', className)}
      style={{ width: size, height: size }}
    />
  );
}

/* ── The ring ── */

/** The box the ring is drawn in (design px). */
const BOX = { w: 680, h: 720 };
const pct = (v: number, of: number) => `${((v / of) * 100).toFixed(2)}%`;
const cqw = (px: number) => `${((px / BOX.w) * 100).toFixed(3)}cqw`;

/** The AI companies, as on the design (logos are the files the team supplied). */
export const AI_LOGOS = [
  { src: '/models/chatgpt.png', alt: 'ChatGPT', w: 44 },
  { src: '/models/claude.png', alt: 'Claude', w: 48 },
  { src: '/models/gemini.png', alt: 'Gemini', w: 48 },
  { src: '/models/model-red.png', alt: '', w: 54 },
  { src: '/models/qwen.png', alt: 'Qwen', w: 48 },
  { src: '/models/kimi.png', alt: 'Kimi', w: 46 },
  { src: '/models/model-blue.png', alt: '', w: 54 },
] as const;

type RingMascot = { space: Space; x: number; y: number; height: number; late?: boolean };
type RingNode = { icon: IconName; label: string; x: number; y: number };

/**
 * A tilted oval with things evenly spaced on it (positions worked out along the line): AI logos,
 * crew members, and the mascots standing on it. Scales with its width.
 */
export function Ring({
  label,
  logos = [],
  nodes = [],
  mascots,
}: {
  label: string;
  logos?: { x: number; y: number }[];
  nodes?: RingNode[];
  mascots: RingMascot[];
}) {
  return (
    <div className="lr" role="img" aria-label={label}>
      <div className="lr-line" />
      {logos.map((p, i) => {
        const l = AI_LOGOS[i]!;
        return (
          <span
            key={l.src}
            className="lr-logo"
            style={{ left: pct(p.x, BOX.w), top: pct(p.y, BOX.h), ['--i' as string]: i }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- small static logos */}
            <img src={l.src} alt="" style={{ width: cqw(l.w) }} />
          </span>
        );
      })}
      {nodes.map((n, i) => (
        <div
          key={n.label}
          className="lr-node"
          style={{ left: pct(n.x, BOX.w), top: pct(n.y, BOX.h), ['--i' as string]: i }}
        >
          <span>
            <Icon name={n.icon} size={28} />
          </span>
          <span>{n.label}</span>
        </div>
      ))}
      {mascots.map((m) => {
        const sw = Math.round(m.height * 0.4);
        const sh = Math.round(sw * 0.11);
        return (
          <div
            key={m.space}
            className="lr-stand"
            style={{
              left: pct(m.x, BOX.w),
              top: pct(m.y, BOX.h),
              // The shadow's middle sits on the given point; the mascot stands above it.
              transform: `translate(-50%, -${cqw(m.height + 2 + sh / 2)})`,
            }}
          >
            <JackImg
              space={m.space}
              part="full"
              className={cx('ml-float', m.late && 'ml-late')}
              style={{ height: cqw(m.height) }}
            />
            <div
              className={cx('ml-shadow', m.late && 'ml-late')}
              style={{ width: cqw(sw), height: cqw(sh) }}
            />
          </div>
        );
      })}
    </div>
  );
}

/* ── Sections shared by the pages ── */

export function Points({ items }: { items: [IconName, string][] }) {
  return (
    <ul className="ml-points">
      {items.map(([icon, text]) => (
        <li key={text}>
          <Icon name={icon} size={24} />
          {text}
        </li>
      ))}
    </ul>
  );
}

export type Plan = {
  name: string;
  price: string;
  per?: string;
  lines: [string, string];
  cta: { href: string; label: string };
  main?: boolean;
  face?: Space;
};

export function Plans({ plans }: { plans: Plan[] }) {
  return (
    <div className="ml-plans">
      {plans.map((p) => (
        <div key={p.name} className={cx('ml-plan', p.main && 'main')}>
          <span className="ml-plan-name">
            {p.face && <Face space={p.face} size={32} />}
            {p.name}
          </span>
          <div className="ml-price">
            {p.price}
            {p.per && <span> {p.per}</span>}
          </div>
          <ul>
            {p.lines.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
          <Link href={p.cta.href} className={cx('as-btn', p.main ? 'primary' : 'secondary')}>
            {p.cta.label}
          </Link>
        </div>
      ))}
    </div>
  );
}

/** "Running a business? Meet Captain Jack →" */
export function CrossLink({
  space,
  href,
  title,
  rest,
}: {
  space: Space;
  href: string;
  title: string;
  rest: string;
}) {
  return (
    <Link href={href} className="ml-cross">
      <Face space={space} size={40} late />
      <span>
        <b>{title}</b> {rest}
      </span>
      <Icon name="arrow-right" size={16} />
    </Link>
  );
}

export function Faq({ items }: { items: [string, string][] }) {
  return (
    <section className="ml-sec" style={{ gap: 40 }} aria-labelledby="ml-faq">
      <H2 id="ml-faq">Questions</H2>
      <div className="ml-faq">
        {items.map(([q, a]) => (
          <details key={q}>
            <summary>
              {q}
              <Icon name="plus" size={20} />
            </summary>
            <p>{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

/** The closing call to action, with the mascot(s). */
export function End({
  spaces,
  title,
  muted,
  cta,
}: {
  spaces: Space[];
  title: string;
  muted: string;
  cta: { href: string; label: string };
}) {
  return (
    <section className="ml-end" aria-labelledby="ml-end">
      <div className="ml-end-art">
        {spaces.map((s, i) => (
          <Stand key={s} space={s} height={i === 0 ? 260 : 220} late={i > 0} />
        ))}
      </div>
      <div className="ml-end-text">
        <h2 className="ml-h2" id="ml-end">
          {title}
          <br />
          <span>{muted}</span>
        </h2>
        <Link href={cta.href} className="as-btn primary">
          {cta.label}
          <Icon name="arrow-right" size={16} />
        </Link>
      </div>
    </section>
  );
}
