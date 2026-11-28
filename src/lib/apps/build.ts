import { toApiError, type ApiError } from '@/lib/api/errors';
import type { Schemas } from '@/lib/api/client';
import { readSse } from '@/lib/chat/sse';

export type AppData = Schemas['AppDto'];

export interface BuildHandlers {
  onModel?: (e: { model: string; modelName: string; auto: boolean; credits: number }) => void;
  onNote?: (text: string) => void;
  onFileStart?: (path: string) => void;
  onFileDelta?: (path: string, text: string) => void;
  /** The file is complete and saved on the server. */
  onFileEnd?: (path: string, content: string) => void;
  onFileRemoved?: (path: string) => void;
  onFileSkipped?: (path: string, reason: string) => void;
}

export type BuildOutcome =
  | { kind: 'done' | 'error'; app: AppData }
  | { kind: 'aborted' }
  | { kind: 'request-failed'; error: ApiError };

const dropped = (): ApiError => ({
  code: 'service_unavailable',
  message: 'The connection dropped. Finished files are saved; open the app again to see them.',
  requestId: 'client',
});

/** Asks Jack to build or change an app and streams the changes. Aborting stops the build. */
export async function buildApp(
  id: string,
  request: string,
  signal: AbortSignal,
  h: BuildHandlers,
): Promise<BuildOutcome> {
  let res: Response;
  try {
    res = await fetch(`/api/apps/${id}/build`, {
      method: 'POST',
      headers: { accept: 'text/event-stream', 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ request }),
      signal,
    });
  } catch {
    return signal.aborted ? { kind: 'aborted' } : { kind: 'request-failed', error: dropped() };
  }
  if (!res.ok || !res.body)
    return { kind: 'request-failed', error: toApiError(await res.json().catch(() => null)) };
  try {
    for await (const m of readSse(res.body)) {
      const d = JSON.parse(m.data);
      if (m.event === 'model') h.onModel?.(d);
      else if (m.event === 'note') h.onNote?.(d.text);
      else if (m.event === 'file-start') h.onFileStart?.(d.path);
      else if (m.event === 'file-delta') h.onFileDelta?.(d.path, d.text);
      else if (m.event === 'file-end') h.onFileEnd?.(d.path, d.content);
      else if (m.event === 'file-removed') h.onFileRemoved?.(d.path);
      else if (m.event === 'file-skipped') h.onFileSkipped?.(d.path, d.reason);
      else if (m.event === 'done' || m.event === 'error') return { kind: m.event, app: d.app };
    }
  } catch {
    if (signal.aborted) return { kind: 'aborted' };
    return { kind: 'request-failed', error: dropped() };
  }
  return signal.aborted ? { kind: 'aborted' } : { kind: 'request-failed', error: dropped() };
}
