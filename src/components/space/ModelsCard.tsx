'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Switch } from '@/ui';
import { api, type Schemas } from '@/lib/api/client';
import { toApiError } from '@/lib/api/errors';
import './models-card.css';

/**
 * "Models behind Jack" (v2 Connections design). Jack picks a model for each step; a Business
 * space can switch model makers off so company data never goes to them.
 */
type ProviderId = Schemas['SpaceBusinessDto']['excludedProviders'][number];

export function ModelsCard({ spaces }: { spaces: Schemas['SpacesDto'] }) {
  const business = spaces.business;
  const [excluded, setExcluded] = useState<ProviderId[]>(business?.excludedProviders ?? []);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const toggle = async (id: ProviderId, on: boolean) => {
    const next = on ? excluded.filter((p) => p !== id) : [...excluded, id];
    if (next.length === spaces.providers.length) {
      setMessage('Keep at least one provider on, so Jack can answer.');
      return;
    }
    setMessage('');
    setSaving(id);
    const previous = excluded;
    setExcluded(next);
    const { data, error } = await api.PATCH('/api/spaces/business/models', {
      body: { excludedProviders: next },
    });
    setSaving(null);
    if (data) setExcluded(data.excludedProviders);
    else {
      setExcluded(previous);
      setMessage(toApiError(error).message);
    }
  };

  return (
    <section id="models" className="models-card" aria-labelledby="models-h">
      <h2 id="models-h" className="models-ov">
        Models behind Jack
      </h2>
      <p className="models-text">
        Jack picks the best model for each step with Auto: {spaces.providers.map((p) => p.name).join(', ')}.
        You can still choose one yourself in the message box.
      </p>
      <div className="models-rule" />
      <h3 className="models-ov">Business space</h3>
      {business ? (
        <>
          <p className="models-text">Keep {business.name}’s data with the providers you trust.</p>
          <div className="models-list">
            {spaces.providers.map((p) => (
              <Switch
                key={p.id}
                label={p.name}
                checked={!excluded.includes(p.id)}
                disabled={saving !== null}
                onChange={(on) => void toggle(p.id as ProviderId, on)}
              />
            ))}
          </div>
          <p className="models-foot">Switched-off providers are never sent Business data.</p>
        </>
      ) : (
        <p className="models-text">
          <Link href="/business/setup">Set up a Business space</Link> to choose which providers may see
          company data.
        </p>
      )}
      {message && (
        <p className="models-msg" role="alert">
          {message}
        </p>
      )}
    </section>
  );
}
