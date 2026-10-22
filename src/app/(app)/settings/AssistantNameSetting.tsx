'use client';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button } from '@/ui';
import { api } from '@/lib/api/client';
import { toApiError } from '@/lib/api/errors';
import type { AssistantName } from '@/lib/assistant';

const MAX = 20;

/** Rename the Personal assistant. The whole app follows on the next render (router.refresh). */
export function AssistantNameSetting({ initial }: { initial: AssistantName }) {
  const router = useRouter();
  const [current, setCurrent] = useState(initial);
  const [value, setValue] = useState(initial.custom ? initial.name : '');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const save = async (name: string) => {
    setBusy(true);
    setStatus(null);
    const { data, error } = await api.PATCH('/api/me/assistant', { body: { name } });
    setBusy(false);
    if (!data) return setStatus({ tone: 'error', text: toApiError(error).message });
    setCurrent(data);
    setValue(data.custom ? data.name : '');
    setStatus({
      tone: 'ok',
      text: data.custom ? `Saved. Say hello to ${data.name}.` : 'Saved. He’s Jack again.',
    });
    router.refresh();
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void save(value);
  };

  const unchanged = value.trim() === (current.custom ? current.name : '');

  return (
    <form className="st-name" onSubmit={submit}>
      <label htmlFor="st-name-input" className="sr-only">
        Assistant name
      </label>
      <input
        id="st-name-input"
        className="st-name-input"
        value={value}
        maxLength={MAX}
        placeholder="Jack"
        autoComplete="off"
        spellCheck={false}
        aria-describedby="st-name-status"
        aria-invalid={status?.tone === 'error' || undefined}
        onChange={(e) => {
          setValue(e.target.value);
          setStatus(null);
        }}
      />
      <Button type="submit" variant="primary" size="sm" loading={busy} disabled={unchanged}>
        Save
      </Button>
      {current.custom && (
        <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => void save('')}>
          Use Jack
        </Button>
      )}
      <p
        id="st-name-status"
        className={status?.tone === 'error' ? 'st-status error' : 'st-status'}
        role="status"
        aria-live="polite"
      >
        {status?.text}
      </p>
    </form>
  );
}
