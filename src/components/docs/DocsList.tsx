'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Badge, Button, Dialog, Icon, IconButton, Tabs, type IconName } from '@/ui';
import { useShellCrumbs } from '@/components/shell/crumbs';
import { api } from '@/lib/api/client';
import { TYPE_INFO, type DocSummary } from '@/lib/docs/types';
import './docs.css';

const when = (iso: string) => {
  const d = new Date(iso);
  const mins = (Date.now() - d.getTime()) / 60_000;
  if (mins < 2) return 'Just now';
  if (d.toDateString() === new Date().toDateString())
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const y = new Date();
  y.setDate(y.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

const STATUS_BADGE: Partial<Record<DocSummary['status'], string>> = {
  draft: 'Not written',
  writing: 'Writing',
  stopped: 'Stopped',
  failed: 'Not written',
};

type Scope = 'all' | 'mine' | 'shared';
const TABS = [
  { value: 'all', label: 'All' },
  { value: 'mine', label: 'Mine' },
  { value: 'shared', label: 'Shared with me' },
];

function sharing(d: DocSummary): { icon: IconName; label: string } {
  if (d.sharedBy !== undefined && d.sharedBy !== null) return { icon: 'users', label: 'Shared with you' };
  if (d.linkAccess === 'view') return { icon: 'link', label: 'Anyone with link' };
  if (d.sharedWith) return { icon: 'users', label: `Shared with ${d.sharedWith}` };
  return { icon: 'lock', label: 'Only you' };
}

/** Documents (design: DocsFlow list): mine and shared with me. Projects arrive later. */
export function DocsList({
  items: first,
  nextCursor,
  email,
}: {
  items: DocSummary[];
  nextCursor: string | null;
  email: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  useShellCrumbs({
    path: pathname,
    items: [{ label: 'Docs', href: '/docs' }, { label: 'All documents' }],
    back: '/docs',
  });
  const [scope, setScope] = useState<Scope>('all');
  const [items, setItems] = useState(first);
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<DocSummary[] | null>(null);
  const [more, setMore] = useState<{ items: DocSummary[]; cursor: string | null }>({
    items: [],
    cursor: nextCursor,
  });
  const [deleting, setDeleting] = useState<DocSummary | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (!q) return;
    const t = setTimeout(async () => {
      const { data } = await api.GET('/api/docs', { params: { query: { q, scope } } });
      setFound(data?.items ?? []);
    }, 250);
    return () => clearTimeout(t);
  }, [query, scope]);

  const switchTo = async (next: Scope) => {
    setScope(next);
    const { data } = await api.GET('/api/docs', { params: { query: { scope: next } } });
    if (data) {
      setItems(data.items);
      setMore({ items: [], cursor: data.nextCursor });
    }
  };

  const rows = query.trim() ? (found ?? []) : [...items, ...more.items];

  return (
    <div className="dl">
      <div className="dl-head">
        <h1 className="title-lg">Documents</h1>
        <div className="dl-search">
          <Icon name="search" size={16} />
          <input
            type="search"
            aria-label="Search documents"
            placeholder="Search documents"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!e.target.value.trim()) setFound(null);
            }}
          />
        </div>
        <Link href="/docs" className="as-btn primary">
          <Icon name="plus" size={16} />
          New document
        </Link>
      </div>

      <Tabs items={TABS} value={scope} onChange={(v) => void switchTo(v as Scope)} label="Show" />

      {rows.length === 0 ? (
        <div className="dl-empty">
          <Icon name="file-text" size={28} />
          <b>
            {query.trim()
              ? 'No documents match'
              : scope === 'shared'
                ? 'Nothing shared with you yet'
                : 'No documents yet'}
          </b>
          <span>
            {query.trim()
              ? `Nothing found for “${query.trim()}”.`
              : scope === 'shared'
                ? `When someone shares a document with ${email}, it shows up here.`
                : 'Describe what you need and get a full draft to edit.'}
          </span>
          {!query.trim() && scope !== 'shared' && (
            <Link href="/docs" className="as-btn secondary sm">
              Write a document
            </Link>
          )}
        </div>
      ) : (
        <div className="dl-table-wrap">
          <table className="dl-table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Updated</th>
                <th scope="col" className="dl-share-col">
                  Sharing
                </th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.id}>
                  <td>
                    <Link href={`/docs/${d.id}`} className="dl-name">
                      <span className="dl-ic">
                        <Icon name={TYPE_INFO[d.type].icon} size={16} />
                      </span>
                      <span className="dl-txt">
                        <b>{d.title}</b>
                        <span>
                          {TYPE_INFO[d.type].label} · {d.wordCount.toLocaleString('en-US')} words
                          <span className="dl-when-sm"> · {when(d.updatedAt)}</span>
                          {STATUS_BADGE[d.status] && (
                            <>
                              {' '}
                              <Badge icon={false}>{STATUS_BADGE[d.status]}</Badge>
                            </>
                          )}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className="muted dl-when-col">{when(d.updatedAt)}</td>
                  <td className="muted dl-share-col">
                    <span className="dl-share" title={d.sharedBy ? `Shared by ${d.sharedBy}` : undefined}>
                      <Icon name={sharing(d).icon} size={14} />
                      {sharing(d).label}
                    </span>
                  </td>
                  <td className="act">
                    {d.sharedBy == null && (
                      <IconButton
                        icon="trash-2"
                        size="sm"
                        label={`Delete ${d.title}`}
                        onClick={() => setDeleting(d)}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!query.trim() && more.cursor && (
        <Button
          size="sm"
          variant="ghost"
          className="dl-more"
          onClick={async () => {
            const { data } = await api.GET('/api/docs', {
              params: { query: { cursor: more.cursor!, scope } },
            });
            if (data) setMore((m) => ({ items: [...m.items, ...data.items], cursor: data.nextCursor }));
          }}
        >
          Show more
        </Button>
      )}

      <Dialog
        open={!!deleting}
        title="Delete this document?"
        description={
          deleting
            ? `“${deleting.title}” will be deleted.${deleting.sharedWith || deleting.linkAccess === 'view' ? ' People you shared it with lose access.' : ''}`
            : undefined
        }
        width={440}
        onClose={() => setDeleting(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={busy}
              onClick={async () => {
                if (!deleting) return;
                setBusy(true);
                await api.DELETE('/api/docs/{id}', { params: { path: { id: deleting.id } } });
                setBusy(false);
                setFound((f) => f?.filter((x) => x.id !== deleting.id) ?? null);
                setItems((xs) => xs.filter((x) => x.id !== deleting.id));
                setMore((m) => ({ ...m, items: m.items.filter((x) => x.id !== deleting.id) }));
                setDeleting(null);
                router.refresh();
              }}
            >
              Delete
            </Button>
          </>
        }
      />
    </div>
  );
}
