'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, type Schemas } from '@/lib/api/client';
import { toApiError } from '@/lib/api/errors';
import { Button, Dialog, Field, Icon } from '@/ui';
import './apps.css';

type AppSummary = Schemas['AppSummaryDto'];

const STATUS: Record<string, string> = {
  idle: 'Empty',
  building: 'Building…',
  ready: 'Ready',
  stopped: 'Stopped',
  failed: 'Failed',
};

/** Mini apps Jack has built in this space. */
export function AppsList({ apps }: { apps: AppSummary[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const close = () => {
    setOpen(false);
    setName('');
    setError('');
  };
  const create = async () => {
    if (!name.trim()) return setError('Give the app a name.');
    setBusy(true);
    const { data, error: err } = await api.POST('/api/apps', { body: { name: name.trim() } });
    setBusy(false);
    if (!data) return setError(toApiError(err).message);
    close();
    router.push(`/apps/${data.id}`);
    router.refresh();
  };

  return (
    <div className="apl">
      <div className="apl-head">
        <div>
          <h1 className="title-lg">Apps</h1>
          <p className="apl-sub">
            Describe a small app and watch Jack build it file by file, with the code on one side and the
            result on the other. Download the whole project as a zip when you’re happy.
          </p>
        </div>
        <Button variant="primary" icon="plus" onClick={() => setOpen(true)}>
          New app
        </Button>
      </div>
      {apps.length === 0 ? (
        <div className="apl-empty">
          <Icon name="code" size={28} />
          <b>No apps yet</b>
          <span>Try “a to-do list that remembers my tasks” or “a tip calculator”.</span>
          <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
            Build your first app
          </Button>
        </div>
      ) : (
        <ul className="apl-grid">
          {apps.map((a) => (
            <li key={a.id}>
              <Link href={`/apps/${a.id}`} className="apl-card">
                <span className="apl-name">
                  <Icon name="code" size={18} />
                  {a.name}
                </span>
                <span className="apl-meta">
                  {STATUS[a.status] ?? a.status} · {a.fileCount} {a.fileCount === 1 ? 'file' : 'files'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Dialog
        open={open}
        title="New app"
        description="Give it a name, then tell Jack what to build."
        width={480}
        onClose={close}
        footer={
          <>
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button variant="primary" icon="code" loading={busy} onClick={() => void create()}>
              Create app
            </Button>
          </>
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void create();
          }}
        >
          <Field
            label="Name"
            placeholder="e.g. Tip calculator"
            value={name}
            maxLength={120}
            error={error || undefined}
            autoFocus
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
          />
        </form>
      </Dialog>
    </div>
  );
}
