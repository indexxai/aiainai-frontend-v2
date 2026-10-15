'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api/client';
import type { ApiError } from '@/lib/api/errors';
import { useAbortOnLeave } from '@/lib/useAbortOnLeave';
import {
  announceChat,
  chatPaths,
  streamAnswer,
  type ChatMessage,
  type ChatSummary,
  type StreamHandlers,
} from './client';

/** What the answer being written shows in its header. */
export interface Live {
  messageId: string;
  modelName: string | null;
  auto: boolean;
}

export interface ThreadState {
  chat: ChatSummary;
  messages: ChatMessage[];
  /** Set while an answer is being written. */
  live: Live | null;
  /** A request that could not start (busy chat, dropped connection); shown above the composer. */
  notice: ApiError | null;
}

/**
 * State and actions for one chat: send, Stop, Regenerate, Continue, feedback.
 * The server is the source of truth: every stream ends with the saved message.
 */
export function useChatThread(
  initial: { chat: ChatSummary; messages: ChatMessage[] },
  onSettled?: () => void,
) {
  // Opened while an answer is still being written (it carries on after you leave a page)?
  // Follow it: show it as live and check the saved copy until it's finished.
  const [state, setState] = useState<ThreadState>(() => {
    const last = initial.messages.at(-1);
    const writing = last?.role === 'assistant' && last.status === 'streaming';
    return {
      ...initial,
      live: writing ? { messageId: last.id, modelName: last.modelName, auto: last.auto } : null,
      notice: null,
    };
  });
  const [watching, setWatching] = useState(() => {
    const last = initial.messages.at(-1);
    return last?.role === 'assistant' && last.status === 'streaming' ? last.id : null;
  });
  const abort = useRef<AbortController | null>(null);
  const settled = useRef(onSettled);
  useEffect(() => {
    settled.current = onSettled;
  });
  const mounted = useAbortOnLeave(abort);

  useEffect(() => {
    if (!watching) return;
    let alive = true;
    const t = setInterval(async () => {
      const { data } = await api.GET('/api/chats/{id}', { params: { path: { id: initial.chat.id } } });
      const saved = data?.messages.find((m) => m.id === watching);
      if (!alive || !data || !saved) return;
      const finished = saved.status !== 'streaming';
      setState((s) => ({
        ...s,
        chat: data.chat,
        live: finished ? null : s.live,
        messages: s.messages.map((m) => (m.id === watching ? saved : m)),
      }));
      if (finished) {
        setWatching(null);
        announceChat(data.chat);
        settled.current?.();
      }
    }, 1000);
    return () => {
      alive = false;
      clearInterval(t);
    };
    // initial.chat.id is fixed for this thread
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watching]);

  // Documents, images and team work Jack started keep going after the answer: check on them
  // every few seconds until none is running.
  const stepsRunning = !state.live && state.messages.some((m) => m.plan.some((s) => s.status === 'running'));
  useEffect(() => {
    if (!stepsRunning) return;
    let alive = true;
    const t = setInterval(async () => {
      const { data } = await api.GET('/api/chats/{id}', { params: { path: { id: initial.chat.id } } });
      if (!alive || !data) return;
      const plans = new Map(data.messages.map((m) => [m.id, m.plan]));
      setState((s) => ({
        ...s,
        messages: s.messages.map((m) => (plans.has(m.id) ? { ...m, plan: plans.get(m.id)! } : m)),
      }));
    }, 3000);
    return () => {
      alive = false;
      clearInterval(t);
    };
    // initial.chat.id is fixed for this thread
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepsRunning]);

  const patchMessage = (id: string, fn: (m: ChatMessage) => ChatMessage) =>
    setState((s) => ({ ...s, messages: s.messages.map((m) => (m.id === id ? fn(m) : m)) }));

  const run = useCallback(async (path: string, body: unknown, optimisticUserText?: string) => {
    if (abort.current) return;
    const ac = new AbortController();
    abort.current = ac;
    const tempId = `pending-${Date.now()}`;
    let answerId: string | null = null;
    let firstDelta = true;

    // Show the person's message straight away.
    if (optimisticUserText !== undefined) {
      setState((s) => ({
        ...s,
        notice: null,
        messages: [...s.messages, placeholder(tempId, 'user', optimisticUserText)],
      }));
    } else {
      setState((s) => ({ ...s, notice: null }));
    }

    const handlers: StreamHandlers = {
      onReady: (e) => {
        answerId = e.message.id;
        setState((s) => {
          let messages = s.messages.filter((m) => m.id !== tempId);
          if (e.userMessage) messages = [...messages, e.userMessage];
          const existing = messages.some((m) => m.id === e.message.id);
          messages = existing
            ? messages.map((m) => (m.id === e.message.id ? { ...e.message, content: m.content } : m))
            : [...messages, e.message];
          // Regenerate starts from empty; Continue keeps the text.
          if (path.endsWith('/regenerate'))
            messages = messages.map((m) => (m.id === e.message.id ? { ...m, content: '' } : m));
          return {
            ...s,
            chat: e.chat,
            messages,
            live: { messageId: e.message.id, modelName: null, auto: false },
          };
        });
        announceChat(e.chat);
      },
      onPlan: (e) => patchMessage(e.messageId, (m) => ({ ...m, plan: e.steps })),
      onModel: (e) =>
        setState((s) => (s.live ? { ...s, live: { ...s.live, modelName: e.modelName, auto: e.auto } } : s)),
      onDelta: (text) => {
        if (!answerId) return;
        const id = answerId;
        // Continue: the server joins the old and new text with a space; mirror that.
        const join = firstDelta && continuing(path);
        firstDelta = false;
        patchMessage(id, (m) => ({
          ...m,
          content: join && m.content && !/\s$/.test(m.content) ? `${m.content} ${text}` : m.content + text,
        }));
      },
      onEnd: (e) => {
        announceChat(e.chat);
        setState((s) => ({
          ...s,
          chat: e.chat,
          live: null,
          messages: s.messages.map((m) => (m.id === e.message.id ? e.message : m)),
        }));
      },
    };

    const outcome = await streamAnswer(path, body, ac.signal, handlers);
    abort.current = null;

    if (outcome.kind === 'aborted') {
      // The page closed: the server carries on and saves the answer.
      if (!mounted.current) return;
      // Still open (e.g. Stop couldn't reach the server, so the stream was cut here):
      // show what the server saved, and follow the answer if it's still being written.
      await resync();
    } else if (outcome.kind === 'request-failed') {
      setState((s) => ({
        ...s,
        live: null,
        notice: outcome.error,
        messages: s.messages
          .filter((m) => m.id !== tempId)
          .map((m) =>
            m.id === answerId && m.status === 'streaming'
              ? {
                  ...m,
                  status: 'failed' as const,
                  error: { code: outcome.error.code, message: outcome.error.message },
                }
              : m,
          ),
      }));
      if (answerId) void refreshMessage(answerId);
    }
    settled.current?.();

    async function resync() {
      const { data } = await api.GET('/api/chats/{id}', { params: { path: { id: initial.chat.id } } });
      if (!data) {
        setState((s) => ({ ...s, live: null, messages: s.messages.filter((m) => m.id !== tempId) }));
        return;
      }
      const last = data.messages.at(-1);
      const writing = last?.role === 'assistant' && last.status === 'streaming' ? last : null;
      setState((s) => ({
        ...s,
        chat: data.chat,
        messages: data.messages,
        live: writing ? { messageId: writing.id, modelName: writing.modelName, auto: writing.auto } : null,
      }));
      if (writing) setWatching(writing.id);
    }

    async function refreshMessage(id: string) {
      await new Promise((r) => setTimeout(r, 500));
      const { data } = await api.GET('/api/chats/{id}', { params: { path: { id: initial.chat.id } } });
      const saved = data?.messages.find((m) => m.id === id);
      if (saved && saved.status !== 'streaming') patchMessage(id, () => saved);
      if (data) setState((s) => ({ ...s, chat: data.chat }));
      settled.current?.();
    }
    // initial.chat.id is fixed for this thread
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chatId = initial.chat.id;
  return {
    state,
    running: state.live !== null,
    send: (text: string, model: string) => run(chatPaths.send(chatId), { text, model }, text),
    regenerate: (messageId: string, model?: string) =>
      run(chatPaths.regenerate(chatId, messageId), model ? { model } : {}),
    continueAnswer: (messageId: string) => run(chatPaths.continue(chatId, messageId), {}),
    // Stop is its own call; the open stream (or the check-back loop) then gets the stopped answer.
    stop: async () => {
      const { error } = await api
        .POST('/api/chats/{id}/stop', { params: { path: { id: chatId } } })
        .catch(() => ({ error: true }));
      if (error) abort.current?.abort();
    },
    dismissNotice: () => setState((s) => ({ ...s, notice: null })),
    /** Fetch the plans again (after a purchase, email or event was approved or rejected). */
    refreshPlans: async () => {
      const { data } = await api.GET('/api/chats/{id}', { params: { path: { id: chatId } } });
      if (!data) return;
      const plans = new Map(data.messages.map((m) => [m.id, m.plan]));
      setState((s) => ({
        ...s,
        messages: s.messages.map((m) => (plans.has(m.id) ? { ...m, plan: plans.get(m.id)! } : m)),
      }));
    },
    setChat: (chat: ChatSummary) => setState((s) => ({ ...s, chat })),
    /** Forget something Jack remembered from a message (removed from Memory for good). */
    forget: async (messageId: string, memoryId: string) => {
      const { error } = await api.DELETE('/api/memory/{id}', { params: { path: { id: memoryId } } });
      if (!error)
        patchMessage(messageId, (m) => ({ ...m, learned: m.learned.filter((l) => l.id !== memoryId) }));
    },
    feedback: async (messageId: string, value: 'up' | 'down' | null) => {
      patchMessage(messageId, (m) => ({ ...m, feedback: value }));
      await api.PUT('/api/chats/{id}/messages/{messageId}/feedback', {
        params: { path: { id: chatId, messageId } },
        body: { value },
      });
    },
  };
}

const continuing = (path: string) => path.endsWith('/continue');

function placeholder(id: string, role: 'user' | 'assistant', content: string): ChatMessage {
  return {
    id,
    role,
    content,
    status: 'complete',
    model: null,
    modelName: null,
    auto: false,
    credits: 0,
    feedback: null,
    error: null,
    createdAt: new Date().toISOString(),
    plan: [],
    learned: [],
  };
}
