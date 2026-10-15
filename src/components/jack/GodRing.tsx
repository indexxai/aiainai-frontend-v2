import { JACKS } from '@/lib/jack';
import type { Space } from '@/lib/space';
import { JackImg } from './JackImg';

/** The AI families around Jack, clockwise from the left (design "God's Perspective AI Gateway" home). */
const MODELS = ['ChatGPT', 'Kimi', 'Qwen', 'Mistral', 'Claude', 'Llama', 'Gemini'];

/**
 * Jack in the middle of every AI: the mascot of this space floats inside an orbit of model
 * names. Decorative; the label says what it shows. Phones show six names on a smaller ring.
 */
export function GodRing({ space }: { space: Space }) {
  const jack = JACKS[space];
  const n = MODELS.length;
  return (
    <div
      className="god-ring"
      role="img"
      aria-label={`${jack.name} in the middle, with ${MODELS.join(', ')} and more AI models around him`}
    >
      <div className="god-glow" />
      <div className="god-orbit" />
      {MODELS.map((m, i) => {
        // Start at the left (180°) and go clockwise round the ellipse.
        const a = Math.PI - (i * 2 * Math.PI) / n;
        const x = 50 + 43.3 * Math.cos(a);
        const y = 50 - 42.4 * Math.sin(a);
        return (
          <span
            key={m}
            className={m === 'Mistral' ? 'god-chip god-chip-extra' : 'god-chip'}
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            <i />
            {m}
          </span>
        );
      })}
      <div className="god-jack">
        <JackImg space={space} part="full" className="god-jack-img" />
        <div className="god-jack-shadow" />
      </div>
    </div>
  );
}
