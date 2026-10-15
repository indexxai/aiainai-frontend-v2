'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Dialog, Field, Icon, IconButton, cx } from '@/ui';
import { api } from '@/lib/api/client';
import { CHAT_EVENT, groupLabel, shortWhen, type ChatSummary } from '@/lib/chat/client';

interface Props {
  items: ChatSummary[];
  nextCursor: string | null;
}

/**
 * The chat list beside a conversation (desktop) or as the Chats screen (phone):
 * pinned first, then grouped by day; search, rename, pin and delete.
 */
export function ChatsPanel({ items, nextCursor }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<ChatSummary[] | null>(null);
  const [more, setMore] = useState<{ items: ChatSummary[]; cursor: string | null }>({
    items: [],
    cursor: nextCursor,
  });
  const [loadingMore, setLoadingMore] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<ChatSummary | null>(null);
  const [deleting, setDeleting] = useState<ChatSummary | null>(null);
  // Chats changed on this page since the list was loaded (new title, new message).
  const [live, setLive] = useState<Record<string, ChatSummary>>({});

  useEffect(() => {
    const on = (e: Event) => {
      const chat = (e as CustomEvent<ChatSummary>).detail;
      setLive((l) => ({ ...l, [chat.id]: chat }));
    };
    window.addEventListener(CHAT_EVENT, on);
    return () => window.removeEventListener(CHAT_EVENT, on);
  }, []);

  // Search titles as the person types (short pause so we don't search on every key).
  useEffect(() => {
    const q = query.trim();
    if (!q) return;
    const t = setTimeout(async () => {
      const { data } = await api.GET('/api/chats', { params: { query: { q, limit: 50 } } });
      setFound(data?.items ?? []);
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const all = useMemo(() => {
    const byId = new Map<string, ChatSummary>();
    for (const c of [...items, ...more.items]) if (!byId.has(c.id)) byId.set(c.id, c);
    // Newer copies from this page win over the loaded list.
    for (const c of Object.values(live)) {
      const known = byId.get(c.id);
      if (!known || c.lastMessageAt > known.lastMessageAt) byId.set(c.id, { ...known, ...c });
    }
    return [...byId.values()].sort(
      (a, b) => Number(b.pinned) - Number(a.pinned) || b.lastMessageAt.localeCompare(a.lastMessageAt),
    );
  }, [items, more.items, live]);
  const searching = query.trim().length > 0;
  const shown = useMemo(() => (searching ? (found ?? []) : all), [searching, found, all]);
  const groups = useMemo(() => {
    const out: { label: string; chats: ChatSummary[] }[] = [];
    for (const c of shown) {
      const label = c.pinned ? 'Pinned' : groupLabel(c.lastMessageAt);
      const g = out.find((x) => x.label === label);
      if (g) g.chats.push(c);
      else out.push({ label, chats: [c] });
    }
    return out;
  }, [shown]);

  const loadMore = async () => {
    if (!more.cursor) return;
    setLoadingMore(true);
    const { data } = await api.GET('/api/chats', { params: { query: { cursor: more.cursor } } });
    setLoadingMore(false);
    if (data) setMore((m) => ({ items: [...m.items, ...data.items], cursor: data.nextCursor }));
  };

  const togglePin = async (c: ChatSummary) => {
    setMenuFor(null);
    await api.PATCH('/api/chats/{id}', { params: { path: { id: c.id } }, body: { pinned: !c.pinned } });
    router.refresh();
  };

  return (
    <aside className="cp-panel" aria-label="Conversations">
      <div className="cp-head">
        <h2>Conversations with Jack</h2>
        <Link href="/" className="as-iconbtn" aria-label="New conversation" title="New conversation">
          <Icon name="message-square-plus" size={20} />
        </Link>
      </div>
      <div className="cp-search">
        <Icon name="search" size={16} />
        <input
          type="search"
          placeholder="Search chats"
          aria-label="Search chats"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!e.target.value.trim()) setFound(null);
          }}
        />
      </div>

      <div className="cp-list">
        {shown.length === 0 && (
          <div className="cp-empty">
            <Icon name="message-square" size={24} />
            <b>{query.trim() ? 'No chats match' : 'No chats yet'}</b>
            <span>
              {query.trim()
                ? `Nothing found for “${query.trim()}”.`
                : 'Your conversations will show up here.'}
            </span>
          </div>
        )}
        {groups.map((g) => (
          <section key={g.label} aria-label={g.label}>
            <h3 className="cp-group">{g.label}</h3>
            {g.chats.map((c) => {
              const href = `/chat/${c.id}`;
              const on = pathname === href;
              return (
                <div key={c.id} className={cx('cp-row', on && 'on', menuFor === c.id && 'menu-open')}>
                  <Link href={href} className="cp-link" aria-current={on ? 'page' : undefined}>
                    <span className="t">
                      {c.pinned && <Icon name="pin" size={13} />}
                      {c.title}
                    </span>
                    <span className="s desktop">
                      {c.messageCount} {c.messageCount === 1 ? 'message' : 'messages'}
                    </span>
                    <span className="s phone">{c.preview}</span>
                    <span className="w phone">{shortWhen(c.lastMessageAt)}</span>
                  </Link>
                  <RowMenu
                    chat={c}
                    open={menuFor === c.id}
                    onOpen={(v) => setMenuFor(v ? c.id : null)}
                    onRename={() => {
                      setMenuFor(null);
                      setRenaming(c);
                    }}
                    onPin={() => void togglePin(c)}
                    onDelete={() => {
                      setMenuFor(null);
                      setDeleting(c);
                    }}
                  />
                </div>
              );
            })}
          </section>
        ))}
        {!query.trim() && more.cursor && (
          <Button
            size="sm"
            variant="ghost"
            className="cp-more"
            loading={loadingMore}
            onClick={() => void loadMore()}
          >
            Show older chats
          </Button>
        )}
      </div>

      <RenameDialog chat={renaming} onClose={() => setRenaming(null)} onDone={() => router.refresh()} />
      <DeleteDialog
        chat={deleting}
        onClose={() => setDeleting(null)}
        onDone={(id) => {
          setLive((l) => Object.fromEntries(Object.entries(l).filter(([k]) => k !== id)));
          if (pathname === `/chat/${id}`) router.push('/chat');
          router.refresh();
        }}
      />
    </aside>
  );
}

function RowMenu({
  chat,
  open,
  onOpen,
  onRename,
  onPin,
  onDelete,
}: {
  chat: ChatSummary;
  open: boolean;
  onOpen: (v: boolean) => void;
  onRename: () => void;
  onPin: () => void;
  onDelete: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpen(false);
    };
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key);
    ref.current?.querySelector<HTMLElement>('[role=menuitem]')?.focus();
    return () => {
      document.removeEventListener('mousedown', down);
      document.removeEventListener('keydown', key);
    };
  }, [open, onOpen]);

  return (
    <div className="cp-menu-wrap" ref={ref}>
      <IconButton
        icon="more-horizontal"
        size="sm"
        label={`More for ${chat.title}`}
        aria-haspopup="menu"
        aria-expanded={open}
        className="cp-more-btn"
        onClick={() => onOpen(!open)}
      />
      {open && (
        <div className="cp-menu" role="menu" aria-label={chat.title}>
          <button type="button" role="menuitem" onClick={onRename}>
            <Icon name="pencil" size={16} />
            Rename
          </button>
          <button type="button" role="menuitem" onClick={onPin}>
            <Icon name={chat.pinned ? 'pin-off' : 'pin'} size={16} />
            {chat.pinned ? 'Unpin' : 'Pin'}
          </button>
          <div className="sep" role="separator" />
          <button type="button" role="menuitem" className="danger" onClick={onDelete}>
            <Icon name="trash-2" size={16} />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

function RenameDialog({
  chat,
  onClose,
  onDone,
}: {
  chat: ChatSummary | null;
  onClose: () => void;
  onDone: () => void;
}) {
  return (
    <Dialog open={!!chat} title="Rename chat" width={440} onClose={onClose}>
      {chat && <RenameForm key={chat.id} chat={chat} onClose={onClose} onDone={onDone} />}
    </Dialog>
  );
}

function RenameForm({
  chat,
  onClose,
  onDone,
}: {
  chat: ChatSummary;
  onClose: () => void;
  onDone: () => void;
}) {
  const [title, setTitle] = useState(chat.title);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="cp-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!title.trim()) return;
        setBusy(true);
        await api.PATCH('/api/chats/{id}', {
          params: { path: { id: chat.id } },
          body: { title: title.trim() },
        });
        setBusy(false);
        onClose();
        onDone();
      }}
    >
      <Field
        label="Name"
        value={title}
        maxLength={200}
        autoFocus
        onChange={(e) => setTitle(e.target.value)}
      />
      <div className="cp-form-foot">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={busy} disabled={!title.trim()}>
          Save
        </Button>
      </div>
    </form>
  );
}

function DeleteDialog({
  chat,
  onClose,
  onDone,
}: {
  chat: ChatSummary | null;
  onClose: () => void;
  onDone: (id: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Dialog
      open={!!chat}
      title="Delete this chat?"
      description={chat ? `“${chat.title}” and its messages will be deleted.` : undefined}
      width={440}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={busy}
            onClick={async () => {
              if (!chat) return;
              setBusy(true);
              await api.DELETE('/api/chats/{id}', { params: { path: { id: chat.id } } });
              setBusy(false);
              onClose();
              onDone(chat.id);
            }}
          >
            Delete
          </Button>
        </>
      }
    />
  );
}
