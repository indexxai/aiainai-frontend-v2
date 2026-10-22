'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api/client';
import { MAX_FILES, kindOf, problemWith, uploadFile, type Attachment, type FileInfo } from './files';

export interface Attaching {
  key: string;
  name: string;
  size: number;
  status: 'uploading' | 'ready' | 'error';
  file?: FileInfo;
  error?: string;
}

/**
 * Files added to a prompt box: each uploads at once (so the text is ready by the time you press
 * send), can be removed, and shows its own problem if it can't be used.
 */
export function useAttachments() {
  const [items, setItems] = useState<Attaching[]>([]);
  const aborts = useRef(new Map<string, AbortController>());
  const count = useRef(0);

  const patch = (key: string, p: Partial<Attaching>) =>
    setItems((list) => list.map((i) => (i.key === key ? { ...i, ...p } : i)));

  const add = useCallback(
    (files: FileList | File[]): string | null => {
      const list = Array.from(files);
      if (!list.length) return null;
      let note: string | null = null;
      const room = MAX_FILES - items.filter((i) => i.status !== 'error').length;
      if (list.length > room) note = `You can attach up to ${MAX_FILES} files to a message.`;
      const taken = list.slice(0, Math.max(room, 0));
      const next: Attaching[] = taken.map((f) => ({
        key: `f${++count.current}`,
        name: f.name,
        size: f.size,
        status: problemWith(f) ? 'error' : 'uploading',
        error: problemWith(f) ?? undefined,
      }));
      setItems((cur) => [...cur.filter((i) => i.status !== 'error'), ...next]);
      next.forEach((item, i) => {
        if (item.status === 'error') return;
        const ac = new AbortController();
        aborts.current.set(item.key, ac);
        void uploadFile(taken[i]!, ac.signal).then((r) => {
          aborts.current.delete(item.key);
          if (ac.signal.aborted) return;
          if ('file' in r) patch(item.key, { status: 'ready', file: r.file });
          else patch(item.key, { status: 'error', error: r.error });
        });
      });
      return note;
    },
    [items],
  );

  /** Take a file off the message. One that was already uploaded (and never sent) is deleted too. */
  const remove = useCallback(
    (key: string) => {
      aborts.current.get(key)?.abort();
      aborts.current.delete(key);
      const item = items.find((i) => i.key === key);
      if (item?.status === 'ready' && item.file)
        void api.DELETE('/api/files/{id}', { params: { path: { id: item.file.id } } });
      setItems((list) => list.filter((i) => i.key !== key));
    },
    [items],
  );

  const clear = useCallback(() => {
    aborts.current.forEach((a) => a.abort());
    aborts.current.clear();
    setItems([]);
  }, []);

  // Uploads still running when the box goes away are stopped.
  useEffect(() => {
    const live = aborts.current;
    return () => live.forEach((a) => a.abort());
  }, []);

  const ready: Attachment[] = items
    .filter((i) => i.status === 'ready' && i.file)
    .map((i) => ({ id: i.file!.id, name: i.file!.name, kind: i.file!.kind }));
  const uploading = items.some((i) => i.status === 'uploading');
  const error = items.find((i) => i.status === 'error')?.error ?? '';
  return { items, ready, uploading, error, add, remove, clear, kindOf };
}
