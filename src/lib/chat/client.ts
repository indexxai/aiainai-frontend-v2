import type { Schemas } from '@/lib/api/client';
import { toApiError, type ApiError } from '@/lib/api/errors';
import { readSse } from './sse';

export type ChatSummary = Schemas['ChatSummaryDto'];
export type ChatMessage = Schemas['MessageDto'];
export type ChatDetail = Schemas['ChatDetailDto'];
export type ReadyEvent = Schemas['StreamReadyEvent'];
export type ModelEvent = Schemas['StreamModelEvent'];
export type EndEvent = Schemas['StreamEndEvent'];
export type PlanEvent = Schemas['StreamPlanEvent'];
export type PlanStep = Schemas['PlanStepDto'];

export interface StreamHandlers {
  onReady?: (e: ReadyEvent) => void;
  onModel?: (e: ModelEvent) => void;
  /** Jack started documents, images or team work before answering. */
  onPlan?: (e: PlanEvent) => void;
  onDelta?: (text: string) => void;
  /** `done` (finished or stopped) or `error` (failed or not sent), with the saved answer. */
  onEnd?: (e: EndEvent, kind: 'done' | 'error') => void;
}

export type StreamOutcome =
  | { kind: 'done' | 'error'; end: EndEvent }
  | { kind: 'aborted' }
  /** The request was refused before streaming (e.g. a conflict) or the connection dropped. */
  | { kind: 'request-failed'; error: ApiError };

/**
 * POSTs to a streaming chat endpoint and feeds the events to the handlers.
 * Aborting the signal stops the answer (the server saves it as stopped).
 */
export async function streamAnswer(
  path: string,
  body: unknown,
  signal: AbortSignal,
  h: StreamHandlers,
): Promise<StreamOutcome> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
      body: JSON.stringify(body ?? {}),
      credentials: 'include',
      signal,
    });
  } catch (err) {
    if (signal.aborted) return { kind: 'aborted' };
    return { kind: 'request-failed', error: offline(err) };
  }
  if (!res.ok || !res.body) {
    const json = await res.json().catch(() => null);
    return { kind: 'request-failed', error: toApiError(json) };
  }
  try {
    for await (const m of readSse(res.body)) {
      const data = JSON.parse(m.data);
      if (m.event === 'ready') h.onReady?.(data);
      else if (m.event === 'model') h.onModel?.(data);
      else if (m.event === 'plan') h.onPlan?.(data);
      else if (m.event === 'delta') h.onDelta?.(data.text);
      else if (m.event === 'done' || m.event === 'error') {
        h.onEnd?.(data, m.event);
        return { kind: m.event, end: data };
      }
    }
  } catch (err) {
    if (signal.aborted) return { kind: 'aborted' };
    return { kind: 'request-failed', error: offline(err) };
  }
  return signal.aborted
    ? { kind: 'aborted' }
    : { kind: 'request-failed', error: offline(new Error('stream ended early')) };
}

function offline(_err: unknown): ApiError {
  return {
    code: 'service_unavailable',
    message: 'The connection dropped. Check your internet and try again.',
    requestId: 'client',
  };
}

export const chatPaths = {
  send: (chatId: string) => `/api/chats/${chatId}/messages`,
  regenerate: (chatId: string, messageId: string) => `/api/chats/${chatId}/messages/${messageId}/regenerate`,
  continue: (chatId: string, messageId: string) => `/api/chats/${chatId}/messages/${messageId}/continue`,
};

/** "Today", "Yesterday", "Previous 7 days", "Previous 30 days", then month names. */
export function groupLabel(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((start(now) - start(d)) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return 'Previous 7 days';
  if (days < 30) return 'Previous 30 days';
  return d.toLocaleDateString('en-US', {
    month: 'long',
    ...(d.getFullYear() !== now.getFullYear() && { year: 'numeric' }),
  });
}

/** Short time for the phone list: "10:12", "Mon", "28 Sep". */
export function shortWhen(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const label = groupLabel(iso, now);
  if (label === 'Today') return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  if (label === 'Yesterday' || label === 'Previous 7 days')
    return d.toLocaleDateString('en-US', { weekday: 'short' });
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/** Tells the chat list about a new or changed chat right away (it also refreshes from the server). */
export const CHAT_EVENT = 'aiainai:chat';
export function announceChat(chat: ChatSummary) {
  window.dispatchEvent(new CustomEvent<ChatSummary>(CHAT_EVENT, { detail: chat }));
}
