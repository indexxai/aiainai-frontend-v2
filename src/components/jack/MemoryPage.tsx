'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Banner, Button, Chip, Dialog, Icon, IconButton, Switch, type IconName } from '@/ui';
import { api, type Schemas } from '@/lib/api/client';
import { toApiError } from '@/lib/api/errors';
import './memory.css';

type List = Schemas['MemoryListDto'];
type Item = Schemas['MemoryDto'];
type Group = Item['group'];

const GROUPS: { id: Group; label: string; business: string; icon: IconName }[] = [
  { id: 'about', label: 'About you', business: 'About the business', icon: 'user' },
  { id: 'people', label: 'People', business: 'People and customers', icon: 'users' },
  { id: 'habits', label: 'Habits and routines', business: 'Routines', icon: 'refresh-cw' },
  { id: 'preferences', label: 'How you like things done', business: 'How things are done', icon: 'sparkles' },
];

const date = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

/** Memory (v2 design): grouped, editable, with "Let Jack remember new things". One space at a time. */
export function MemoryPage({
  initial,
  space,
  business,
}: {
  initial: List;
  space: 'personal' | 'business';
  business: string | null;
}) {
  const [list, setList] = useState(initial);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [toast, setToast] = useState<{ text: string; undo?: Item } | null>(null);
  const [error, setError] = useState('');
  const isBiz = space === 'business';

  const reload = async () => {
    const { data } = await api.GET('/api/memory');
    if (data) setList(data);
  };

  const toggle = async (enabled: boolean) => {
    setList((l) => ({ ...l, enabled }));
    const { error: err } = await api.PATCH('/api/memory/settings', { body: { enabled } });
    if (err) {
      setList((l) => ({ ...l, enabled: !enabled }));
      setError(toApiError(err).message);
    }
  };

  const save = async (m: Item) => {
    const text = draft.trim();
    if (!text || text === m.text) return setEditing(null);
    const { data, error: err } = await api.PATCH('/api/memory/{id}', {
      params: { path: { id: m.id } },
      body: { text },
    });
    if (!data) return setError(toApiError(err).message);
    setList((l) => ({ ...l, items: l.items.map((x) => (x.id === m.id ? data : x)) }));
    setEditing(null);
  };

  const forget = async (m: Item) => {
    const { error: err } = await api.DELETE('/api/memory/{id}', { params: { path: { id: m.id } } });
    if (err) return setError(toApiError(err).message);
    setList((l) => ({ ...l, items: l.items.filter((x) => x.id !== m.id) }));
    setToast({ text: `Forgotten: “${m.text}”`, undo: m });
  };

  const undo = async (m: Item) => {
    setToast(null);
    await api.POST('/api/memory', { body: { text: m.text, group: m.group } });
    await reload();
  };

  return (
    <div className="mem">
      <div className="mem-head">
        <div>
          <h1 className="title-lg">Memory</h1>
          <p>
            What Jack knows {isBiz ? `about ${business ?? 'your business'}` : 'about you'}, so you don’t have
            to repeat yourself. {isBiz ? 'Business' : 'Personal'} memories are kept apart from{' '}
            {isBiz ? 'Personal' : 'Business'}.
          </p>
        </div>
        <div className="mem-actions">
          <Switch
            checked={list.enabled}
            onChange={(v) => void toggle(v)}
            label="Let Jack remember new things"
          />
          <Button variant="primary" size="sm" icon="plus" onClick={() => setAdding(true)}>
            Add a memory
          </Button>
        </div>
      </div>

      <div className="mem-safe">
        <Icon name="shield-check" size={16} />
        <span>
          Jack only uses these to help you. Edit or forget anything, and it’s gone from every answer.
          {list.enabled
            ? ' He may remember lasting things you tell him in conversations, and shows what he remembered.'
            : ' He won’t remember anything new until you switch this back on.'}
        </span>
      </div>

      {error && (
        <Banner tone="danger" onDismiss={() => setError('')}>
          {error}
        </Banner>
      )}
      {toast && (
        <div className="mem-toast" role="status">
          <span>{toast.text}</span>
          {toast.undo && (
            <Button size="sm" variant="ghost" onClick={() => void undo(toast.undo!)}>
              Undo
            </Button>
          )}
          <IconButton icon="x" size="sm" label="Dismiss" onClick={() => setToast(null)} />
        </div>
      )}

      <div className="mem-grid">
        {GROUPS.map((g) => {
          const items = list.items.filter((m) => m.group === g.id);
          return (
            <section key={g.id} className="mem-card" aria-labelledby={`mem-${g.id}`}>
              <h2 id={`mem-${g.id}`} className="mem-ov">
                <Icon name={g.icon} size={16} />
                {isBiz ? g.business : g.label}
              </h2>
              {items.length ? (
                <ul className="mem-list">
                  {items.map((m) => (
                    <li key={m.id} className="mem-row">
                      {editing === m.id ? (
                        <form
                          className="mem-edit"
                          onSubmit={(e) => {
                            e.preventDefault();
                            void save(m);
                          }}
                        >
                          <input
                            aria-label="Memory"
                            className="mem-input"
                            value={draft}
                            maxLength={300}
                            autoFocus
                            onChange={(e) => setDraft(e.target.value)}
                            onKeyDown={(e) => e.key === 'Escape' && setEditing(null)}
                          />
                          <Button size="sm" type="submit" variant="secondary">
                            Save
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                            Cancel
                          </Button>
                        </form>
                      ) : (
                        <>
                          <div className="mem-text">
                            <div>{m.text}</div>
                            <div className="mem-meta">
                              {m.source === 'jack' ? (
                                m.chatId ? (
                                  <Link href={`/chat/${m.chatId}`}>Learned in a conversation</Link>
                                ) : (
                                  'Learned in a conversation'
                                )
                              ) : (
                                'You told Jack'
                              )}{' '}
                              · {date(m.createdAt)}
                            </div>
                          </div>
                          <IconButton
                            icon="pencil"
                            size="sm"
                            label={`Edit “${m.text}”`}
                            onClick={() => {
                              setDraft(m.text);
                              setEditing(m.id);
                            }}
                          />
                          <IconButton
                            icon="trash-2"
                            size="sm"
                            label={`Forget “${m.text}”`}
                            onClick={() => void forget(m)}
                          />
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mem-none">Nothing yet.</p>
              )}
            </section>
          );
        })}
      </div>

      <AddDialog
        open={adding}
        business={isBiz}
        onClose={() => setAdding(false)}
        onAdded={(m) => {
          setAdding(false);
          setList((l) => ({ ...l, items: [m, ...l.items.filter((x) => x.id !== m.id)] }));
        }}
      />
    </div>
  );
}

function AddDialog({
  open,
  business,
  onClose,
  onAdded,
}: {
  open: boolean;
  business: boolean;
  onClose: () => void;
  onAdded: (m: Item) => void;
}) {
  const [text, setText] = useState('');
  const [group, setGroup] = useState<Group>('about');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const add = async () => {
    if (!text.trim()) return setError('Write what Jack should remember.');
    setSaving(true);
    const { data, error: err } = await api.POST('/api/memory', { body: { text: text.trim(), group } });
    setSaving(false);
    if (!data) return setError(toApiError(err).message);
    setText('');
    setError('');
    onAdded(data);
  };
  return (
    <Dialog
      open={open}
      title="Add a memory"
      description="Something Jack should know next time, in a short sentence."
      width={520}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" loading={saving} onClick={() => void add()}>
            Remember this
          </Button>
        </>
      }
    >
      <div className="mem-add">
        <label htmlFor="mem-new" className="as-field-label">
          What should Jack remember?
        </label>
        <textarea
          id="mem-new"
          className="mem-textarea"
          rows={3}
          maxLength={300}
          value={text}
          placeholder={
            business ? 'We quote within 24 hours and never on Sundays' : 'I prefer aisle seats on flights'
          }
          onChange={(e) => {
            setText(e.target.value);
            if (error) setError('');
          }}
        />
        <div className="mem-groups" role="group" aria-label="Kind">
          {GROUPS.map((g) => (
            <Chip key={g.id} icon={g.icon} selected={group === g.id} onClick={() => setGroup(g.id)}>
              {business ? g.business : g.label}
            </Chip>
          ))}
        </div>
        {error && (
          <p className="mem-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </Dialog>
  );
}
