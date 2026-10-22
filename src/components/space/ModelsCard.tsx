'use client';
import { useJack } from '@/lib/assistant';
import type { Schemas } from '@/lib/api/client';
import './models-card.css';

/** "Models behind Jack" (v2 Connections design): Jack picks a model for each step. */
export function ModelsCard({ spaces }: { spaces: Schemas['SpacesDto'] }) {
  const jack = useJack();
  return (
    <section id="models" className="models-card" aria-labelledby="models-h">
      <h2 id="models-h" className="models-ov">
        Models behind {jack.name}
      </h2>
      <p className="models-text">
        {jack.name} picks the best model for each step with Auto:{' '}
        {spaces.providers.map((p) => p.name).join(', ')}. You can still choose one yourself in the message
        box.
      </p>
    </section>
  );
}
