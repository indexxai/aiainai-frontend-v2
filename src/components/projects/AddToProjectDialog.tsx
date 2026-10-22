'use client';
import { useEffect, useState } from 'react';
import { Dialog, Icon, type IconName } from '@/ui';
import { api } from '@/lib/api/client';
import { KIND_ICON } from '@/lib/files/files';

export type ItemKind = 'chat' | 'doc' | 'file';
interface Row {
  id: string;
  label: string;
  icon: IconName;
  note: string;
}

const TITLE: Record<ItemKind, string> = { chat: 'Add chats', doc: 'Add documents', file: 'Add files' };
const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

/** Pick an existing chat, document or file to bring into a project. */
export function AddToProjectDialog({
  kind,
  projectId,
  onClose,
  onAdd,
}: {
  kind: ItemKind | null;
  projectId: string;
  onClose: () => void;
  onAdd: (kind: ItemKind, id: string) => Promise<void>;
}) {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<Row[] | null>(null);
  const [adding, setAdding] = useState<string | null>(null);

  useEffect(() => {
    if (!kind) return;
    let live = true;
    const t = setTimeout(
      async () => {
        const query = q.trim() || undefined;
        let list: Row[] = [];
        if (kind === 'chat') {
          const { data } = await api.GET('/api/chats', { params: { query: { q: query, limit: 50 } } });
          list = (data?.items ?? [])
            .filter((c) => c.projectId !== projectId)
            .map((c) => ({
              id: c.id,
              label: c.title,
              icon: 'message-square' as IconName,
              note: c.projectId ? 'In another project' : day(c.lastMessageAt),
            }));
        } else if (kind === 'doc') {
          const { data } = await api.GET('/api/docs', { params: { query: { q: query, scope: 'mine' } } });
          list = (data?.items ?? []).map((d) => ({
            id: d.id,
            label: d.title,
            icon: 'file-text' as IconName,
            note: day(d.updatedAt),
          }));
        } else {
          const { data } = await api.GET('/api/files', { params: { query: { q: query } } });
          list = (data?.items ?? [])
            .filter((f) => f.projectId !== projectId)
            .map((f) => ({
              id: f.id,
              label: f.name,
              icon: KIND_ICON[f.kind],
              note: f.projectId ? 'In another project' : day(f.createdAt),
            }));
        }
        if (live) setRows(list);
      },
      q ? 250 : 0,
    );
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [kind, q, projectId]);

  const close = () => {
    setQ('');
    setRows(null);
    onClose();
  };

  return (
    <Dialog open={!!kind} title={kind ? TITLE[kind] : ''} width={520} onClose={close}>
      <div className="pjk-search">
        <Icon name="search" size={16} />
        <input
          type="search"
          aria-label="Search"
          placeholder="Search"
          value={q}
          autoFocus
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      {rows === null ? (
        <p className="pjp-none">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="pjp-none">{q.trim() ? `Nothing found for “${q.trim()}”.` : 'Nothing to add yet.'}</p>
      ) : (
        <ul className="pjk-list">
          {rows.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                className="pjk-item"
                disabled={adding === r.id}
                onClick={async () => {
                  setAdding(r.id);
                  await onAdd(kind!, r.id);
                  setAdding(null);
                  setRows((cur) => cur && cur.filter((x) => x.id !== r.id));
                }}
              >
                <Icon name={r.icon} size={16} />
                <span>{r.label}</span>
                <small>{adding === r.id ? 'Adding…' : r.note}</small>
                <Icon name="plus" size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
}
