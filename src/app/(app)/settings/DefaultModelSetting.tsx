'use client';
import { useState } from 'react';
import { ModelPicker } from '@/components/models/ModelPicker';
import { api } from '@/lib/api/client';
import { toApiError } from '@/lib/api/errors';
import { nameOf, type ModelMenu } from '@/lib/models';

/** Default model for new chats, research and documents. Saved as soon as it changes. */
export function DefaultModelSetting({ menu }: { menu: ModelMenu }) {
  const [value, setValue] = useState(menu.selected);
  const [status, setStatus] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const change = async (key: string) => {
    const previous = value;
    setValue(key);
    setStatus(null);
    const { data, error } = await api.PATCH('/api/me/preferences', { body: { textModel: key } });
    if (data) {
      setStatus({ tone: 'ok', text: `Saved. ${nameOf(menu, data.textModel)} is your default.` });
    } else {
      setValue(previous);
      setStatus({ tone: 'error', text: toApiError(error).message });
    }
  };

  return (
    <div className="st-model">
      <ModelPicker
        menu={menu}
        value={value}
        onChange={change}
        footNote="Used when you start something new."
      />
      <p
        className={status?.tone === 'error' ? 'st-status error' : 'st-status'}
        role="status"
        aria-live="polite"
      >
        {status?.text}
      </p>
    </div>
  );
}
