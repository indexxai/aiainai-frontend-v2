'use client';
import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, IconButton, cx } from '@/ui';
import { api, type Schemas } from '@/lib/api/client';

export type Version = Schemas['VersionDto'];
export type VersionDetail = Schemas['VersionDetailDto'];

const BY = { you: 'You', assistant: 'Assistant', teammate: 'A teammate' } as const;

/**
 * Versions (design: DocsFlow versions): the current version, then saved ones, newest first.
 * Picking one previews it in the document; "Name the current version" keeps a named copy.
 */
export function VersionsPanel({
  docId,
  updatedAt,
  previewId,
  onPreview,
  onClose,
  onToast,
  refreshKey,
}: {
  docId: string;
  updatedAt: string;
  previewId: string | null;
  onPreview: (v: VersionDetail | null) => void;
  onClose: () => void;
  onToast: (m: string) => void;
  /** Bump to reload (after a restore). */
  refreshKey: number;
}) {
  const [list, setList] = useState<{ versions: Version[]; historyDays: number } | null>(null);
  const [naming, setNaming] = useState(false);
  const [opening, setOpening] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await api.GET('/api/docs/{id}/versions', { params: { path: { id: docId } } });
    if (data) setList(data);
  }, [docId]);

  useEffect(() => {
    let alive = true;
    void api.GET('/api/docs/{id}/versions', { params: { path: { id: docId } } }).then(({ data }) => {
      if (alive && data) setList(data);
    });
    return () => {
      alive = false;
    };
  }, [docId, refreshKey]);

  const open = async (v: Version) => {
    setOpening(v.id);
    const { data } = await api.GET('/api/docs/{id}/versions/{versionId}', {
      params: { path: { id: docId, versionId: v.id } },
    });
    setOpening(null);
    if (data) onPreview(data);
  };

  const name = async () => {
    setNaming(true);
    const { data } = await api.POST('/api/docs/{id}/versions', { params: { path: { id: docId } }, body: {} });
    setNaming(false);
    if (data) {
      onToast(`Named “${data.name}”`);
      await load();
    }
  };

  return (
    <aside className="da dv" aria-label="Versions">
      <div className="da-head">
        <span className="da-title">Versions</span>
        <IconButton icon="x" size="sm" label="Close versions" onClick={onClose} />
      </div>
      <div className="da-body dv-list">
        <button
          type="button"
          className={cx('dv-ver', !previewId && 'on')}
          aria-current={!previewId || undefined}
          onClick={() => onPreview(null)}
        >
          <span className="dv-name">Current version</span>
          <span className="dv-meta">Edited {when(updatedAt)}</span>
        </button>
        {list?.versions.map((v) => (
          <button
            key={v.id}
            type="button"
            className={cx('dv-ver', previewId === v.id && 'on')}
            aria-current={previewId === v.id || undefined}
            aria-busy={opening === v.id || undefined}
            onClick={() => void open(v)}
          >
            <span className="dv-name">
              {v.name}
              {v.named && <Badge icon="star">Named</Badge>}
            </span>
            <span className="dv-meta">
              {v.kind === 'first' ? 'Written from your brief' : BY[v.by]} · {when(v.createdAt)}
            </span>
          </button>
        ))}
        {list && !list.versions.length && (
          <p className="dv-empty">
            Versions appear here as you edit: every few minutes and before every AI change.
          </p>
        )}
      </div>
      <div className="dv-foot">
        <Button variant="secondary" size="sm" icon="star" loading={naming} onClick={() => void name()}>
          Name the current version
        </Button>
        <span className="dv-note">
          We save a version every few minutes and before every AI change.{' '}
          {list ? `Your plan keeps ${list.historyDays} days of history.` : ''}
        </span>
      </div>
    </aside>
  );
}

/** "just now", "12 min ago", "today 10:40", "yesterday 16:20", "Mon 11:05", "28 Sep". */
export function when(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const min = Math.round((now.getTime() - d.getTime()) / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((day(now) - day(d)) / 86_400_000);
  if (days === 0) return `today ${time}`;
  if (days === 1) return `yesterday ${time}`;
  if (days < 7) return `${d.toLocaleDateString('en-GB', { weekday: 'short' })} ${time}`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
