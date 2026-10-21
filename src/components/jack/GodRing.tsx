'use client';
import { useJack } from '@/lib/assistant';
import type { Space } from '@/lib/space';
import { JackImg } from './JackImg';

/**
 * The AI companies on the ring, clockwise from the top (Brian's design): positions are the
 * badge centres in a 680 × 600 box, on an oval tilted 30°. Logos are the files the team supplied.
 */
const LOGOS: { src: string; name: string | null; x: number; y: number; w: number }[] = [
  { src: '/models/chatgpt.png', name: 'ChatGPT', x: 423, y: 75, w: 44 },
  { src: '/models/claude.png', name: 'Claude', x: 564, y: 127, w: 48 },
  { src: '/models/gemini.png', name: 'Gemini', x: 610, y: 268, w: 48 },
  { src: '/models/model-red.png', name: null, x: 533, y: 415, w: 54 },
  { src: '/models/qwen.png', name: 'Qwen', x: 407, y: 500, w: 48 },
  { src: '/models/kimi.png', name: 'Kimi', x: 255, y: 524, w: 46 },
  { src: '/models/model-blue.png', name: null, x: 126, y: 463, w: 54 },
];
const W = 680;
const H = 600;
const pct = (v: number, of: number) => `${((v / of) * 100).toFixed(2)}%`;
const NAMES = LOGOS.flatMap((l) => (l.name ? [l.name] : [])).join(', ');

/**
 * This space's Jack on the top-left of a tilted oval of AI company logos (design "God's
 * Perspective AI Gateway"). Decorative; the label says what it shows. Sizes follow the width.
 */
export function GodRing({ space }: { space: Space }) {
  const jack = useJack(space);
  return (
    <div
      className="god-ring"
      role="img"
      aria-label={`${jack.title} with ${NAMES} and more AI models around him`}
    >
      <div className="god-oval" />
      {LOGOS.map((l) => (
        <span key={l.src} className="god-logo" style={{ left: pct(l.x, W), top: pct(l.y, H) }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- small static logos, no resizing needed */}
          <img src={l.src} alt="" style={{ width: pct(l.w, 96) }} />
        </span>
      ))}
      <div className="god-jack">
        <JackImg space={space} part="full" className="god-jack-img" />
        <div className="god-jack-shadow" />
      </div>
    </div>
  );
}
