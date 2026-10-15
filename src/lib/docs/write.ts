import { toApiError, type ApiError } from '@/lib/api/errors';
import { readSse } from '@/lib/chat/sse';
import type { Doc } from './types';

export interface WriteHandlers {
  onReady?: (doc: Doc) => void;
  onModel?: (e: { model: string; modelName: string; auto: boolean; credits: number }) => void;
  onDelta?: (text: string) => void;
}

export type WriteOutcome =
  { kind: 'done' | 'error'; doc: Doc } | { kind: 'aborted' } | { kind: 'request-failed'; error: ApiError };

/** Starts (or continues) writing a document and streams it. Aborting stops writing. */
export async function writeDoc(id: string, signal: AbortSignal, h: WriteHandlers): Promise<WriteOutcome> {
  let res: Response;
  try {
    res = await fetch(`/api/docs/${id}/write`, {
      method: 'POST',
      headers: { accept: 'text/event-stream' },
      credentials: 'include',
      signal,
    });
  } catch {
    return signal.aborted ? { kind: 'aborted' } : { kind: 'request-failed', error: dropped() };
  }
  if (!res.ok || !res.body)
    return { kind: 'request-failed', error: toApiError(await res.json().catch(() => null)) };
  try {
    for await (const m of readSse(res.body)) {
      const data = JSON.parse(m.data);
      if (m.event === 'ready') h.onReady?.(data.doc);
      else if (m.event === 'model') h.onModel?.(data);
      else if (m.event === 'delta') h.onDelta?.(data.text);
      else if (m.event === 'done' || m.event === 'error') return { kind: m.event, doc: data.doc };
    }
  } catch {
    if (signal.aborted) return { kind: 'aborted' };
    return { kind: 'request-failed', error: dropped() };
  }
  return signal.aborted ? { kind: 'aborted' } : { kind: 'request-failed', error: dropped() };
}

const dropped = (): ApiError => ({
  code: 'service_unavailable',
  message: 'The connection dropped. The finished sections are saved; open the document again to continue.',
  requestId: 'client',
});
