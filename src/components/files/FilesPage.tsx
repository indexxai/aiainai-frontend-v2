'use client';
import { useJack } from '@/lib/assistant';
import Link from 'next/link';
import { useEffect, useRef, useState, type DragEvent } from 'react';
import { Banner, Button, Dialog, Icon, IconButton, cx } from '@/ui';
import { api } from '@/lib/api/client';
import { toApiError } from '@/lib/api/errors';
import {
  ACCEPT,
  KIND_ICON,
  KIND_LABEL,
  MAX_FILES,
  fileSize,
  fileUrl,
  uploadFile,
  type FileInfo,
} from '@/lib/files/files';
import './files.css';

const when = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * Files (v2): everything given to Jack in this space, from chats or added here. Open or save a
 * file, see whether Jack could read it, start a chat about it, or delete it for good.
 */
export function FilesPage({ initial }: { initial: { items: FileInfo[]; nextCursor: string | null } }) {
  const jack = useJack();
  const [items, setItems] = useState(initial.items);
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<FileInfo[] | null>(null);
  const [uploading, setUploading] = useState<string[]>([]);
  const [toast, setToast] = useState<{ tone: 'neutral' | 'danger'; text: string } | null>(null);
  const [deleting, setDeleting] = useState<FileInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const picker = useRef<HTMLInputElement>(null);

  // Search on the server as you type (a short pause first).
  useEffect(() => {
    const q = query.trim();
    if (!q) return;
    let live = true;
    const t = setTimeout(() => {
      void api.GET('/api/files', { params: { query: { q } } }).then(({ data }) => {
        if (live && data) setFound(data.items);
      });
    }, 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [query]);

  const add = async (list: FileList | File[]) => {
    const files = Array.from(list).slice(0, 10);
    if (!files.length) return;
    setToast(null);
    setUploading((u) => [...u, ...files.map((f) => f.name)]);
    const results = await Promise.all(files.map((f) => uploadFile(f)));
    setUploading((u) => u.filter((n) => !files.some((f) => f.name === n)));
    const ok = results.flatMap((r) => ('file' in r ? [r.file] : []));
    const bad = results.flatMap((r) => ('error' in r ? [r.error] : []));
    if (ok.length) setItems((cur) => [...ok.reverse(), ...cur]);
    if (bad.length) setToast({ tone: 'danger', text: bad.join(' ') });
    else if (ok.length)
      setToast({
        tone: 'neutral',
        text:
          ok.length === 1
            ? `${ok[0]!.name} is ready for ${jack.name}.`
            : `${ok.length} files are ready for ${jack.name}.`,
      });
  };

  const loadMore = async () => {
    if (!cursor) return;
    const { data } = await api.GET('/api/files', { params: { query: { cursor } } });
    if (data) {
      setItems((cur) => [...cur, ...data.items]);
      setCursor(data.nextCursor);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    const { error } = await api.DELETE('/api/files/{id}', { params: { path: { id: deleting.id } } });
    setBusy(false);
    if (error) return setToast({ tone: 'danger', text: toApiError(error).message });
    setItems((cur) => cur.filter((f) => f.id !== deleting.id));
    setFound((cur) => cur && cur.filter((f) => f.id !== deleting.id));
    setToast({ tone: 'neutral', text: `${deleting.name} was deleted.` });
    setDeleting(null);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) void add(e.dataTransfer.files);
  };

  const rows = query.trim() ? (found ?? []) : items;

  return (
    <div
      className={cx('fl', dragging && 'fl-drag')}
      onDragOver={(e) => {
        if (!Array.from(e.dataTransfer.types).includes('Files')) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
      }}
      onDrop={onDrop}
    >
      <div className="fl-head">
        <div className="fl-titles">
          <h1 className="title-lg">Files</h1>
          <p className="fl-sub">
            PDF, Word, Excel, CSV, text and images. Attach them in a chat, or add them here, and ask{' '}
            {jack.name}
            about them.
          </p>
        </div>
        <div className="fl-search">
          <Icon name="search" size={16} />
          <input
            type="search"
            aria-label="Search files"
            placeholder="Search files"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!e.target.value.trim()) setFound(null);
            }}
          />
        </div>
        <Button
          variant="primary"
          icon="upload"
          loading={uploading.length > 0}
          onClick={() => picker.current?.click()}
        >
          Upload
        </Button>
        <input
          ref={picker}
          type="file"
          multiple
          accept={ACCEPT}
          hidden
          onChange={(e) => {
            if (e.target.files) void add(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {toast && (
        <Banner tone={toast.tone} onDismiss={() => setToast(null)}>
          {toast.text}
        </Banner>
      )}
      {uploading.length > 0 && (
        <p className="fl-reading" role="status">
          <Icon name="loader-circle" size={16} className="fl-spin" />
          Reading {uploading.length === 1 ? uploading[0] : `${uploading.length} files`}…
        </p>
      )}

      {rows.length === 0 ? (
        <div className="fl-empty">
          <Icon name="folder" size={28} />
          <b>{query.trim() ? 'No files match' : 'No files yet'}</b>
          <span>
            {query.trim()
              ? `Nothing found for “${query.trim()}”.`
              : `Drop files here, or use Upload. In a chat, use + to attach up to ${MAX_FILES} files to a message.`}
          </span>
        </div>
      ) : (
        <ul className="fl-list">
          {rows.map((f) => (
            <li key={f.id} className="fl-row">
              <span className="fl-ic" aria-hidden>
                <Icon name={KIND_ICON[f.kind]} size={18} />
              </span>
              <span className="fl-main">
                <a className="fl-name" href={fileUrl(f.id)} target="_blank" rel="noreferrer">
                  {f.name}
                </a>
                <span className="fl-meta">
                  {KIND_LABEL[f.kind]} · {fileSize(f.bytes)}
                  {f.pages ? ` · ${f.pages} ${f.pages === 1 ? 'page' : 'pages'}` : ''} · {when(f.createdAt)}
                  {f.chatId && (
                    <>
                      {' · '}
                      <Link href={`/chat/${f.chatId}`}>In a chat</Link>
                    </>
                  )}
                </span>
                {(f.note || f.truncated) && (
                  <span className="fl-note">
                    <Icon name="info" size={14} />
                    {f.note ??
                      `This file is very long; ${jack.name} reads its first part (about 40,000 words).`}
                  </span>
                )}
              </span>
              <span className="fl-acts">
                <a
                  className="as-iconbtn"
                  href={fileUrl(f.id, true)}
                  aria-label={`Download ${f.name}`}
                  title="Download"
                >
                  <Icon name="download" size={18} />
                </a>
                <IconButton
                  icon="trash-2"
                  label={`Delete ${f.name}`}
                  title="Delete"
                  onClick={() => setDeleting(f)}
                />
              </span>
            </li>
          ))}
        </ul>
      )}
      {!query.trim() && cursor && (
        <div className="fl-more">
          <Button variant="ghost" onClick={() => void loadMore()}>
            Show more
          </Button>
        </div>
      )}

      <Dialog
        open={!!deleting}
        title={`Delete ${deleting?.name ?? 'this file'}?`}
        description={`It’s removed for good. Chats it was attached to keep its name, but ${jack.name} can’t read it any more.`}
        width={440}
        onClose={() => setDeleting(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button variant="primary" icon="trash-2" loading={busy} onClick={() => void remove()}>
              Delete
            </Button>
          </>
        }
      />
    </div>
  );
}
