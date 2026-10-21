'use client';
import { useJack } from '@/lib/assistant';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, Dialog, Field } from '@/ui';
import { api } from '@/lib/api/client';
import { toApiError } from '@/lib/api/errors';
import './projects.css';
import { VoiceField } from '@/components/voice/Voice';

/** "New project": a name, and optionally what Jack should know in every chat of it. */
export function NewProjectDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const jack = useJack();
  const router = useRouter();
  const [name, setName] = useState('');
  const [instructions, setInstructions] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const close = () => {
    setName('');
    setInstructions('');
    setError('');
    onClose();
  };
  const create = async () => {
    if (!name.trim()) return setError('Give the project a name.');
    setBusy(true);
    const { data, error: err } = await api.POST('/api/projects', {
      body: { name: name.trim(), instructions: instructions.trim() || undefined },
    });
    setBusy(false);
    if (!data) return setError(toApiError(err).message);
    close();
    router.push(`/projects/${data.id}`);
    router.refresh();
  };

  return (
    <Dialog
      open={open}
      title="New project"
      description={`Keep chats, documents and files about one thing together. ${jack.name} reads the project’s instructions and files in every chat in it.`}
      width={520}
      onClose={close}
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button variant="primary" icon="folder" loading={busy} onClick={() => void create()}>
            Create project
          </Button>
        </>
      }
    >
      <form
        className="pj-form"
        onSubmit={(e) => {
          e.preventDefault();
          void create();
        }}
      >
        <Field
          label="Name"
          placeholder="e.g. Dubai trip, Q4 launch, House move"
          value={name}
          maxLength={120}
          error={error || undefined}
          autoFocus
          onChange={(e) => {
            setName(e.target.value);
            setError('');
          }}
        />
        <label className="pj-field">
          <span className="pj-label">
            Instructions for {jack.name} <span className="pj-muted">(optional)</span>
          </span>
          <VoiceField value={instructions} onChange={setInstructions} maxLength={4000}>
            <textarea
              className="pj-textarea"
              rows={4}
              maxLength={4000}
              placeholder="Background, goals or how you want answers, e.g. “Budget is 2,000 dollars. Keep answers short.”"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
            />
          </VoiceField>
        </label>
      </form>
    </Dialog>
  );
}
