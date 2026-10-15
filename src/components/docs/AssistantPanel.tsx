'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Banner, Icon, IconButton, cx, type IconName } from '@/ui';
import { Markdown } from '@/components/chat/Markdown';
import { Composer } from '@/components/composer/Composer';
import { api } from '@/lib/api/client';
import { toApiError } from '@/lib/api/errors';
import type { ModelMenu } from '@/lib/models';
import { useAbortOnLeave } from '@/lib/useAbortOnLeave';
import type { useAiEditing } from './AiEdit';

interface Turn {
  role: 'user' | 'assistant';
  content: string;
  error?: boolean;
}

const STARTERS: { icon: IconName; label: string }[] = [
  { icon: 'sparkles', label: 'Write a next steps section' },
  { icon: 'pen-line', label: 'Tighten the summary' },
  { icon: 'circle-help', label: 'What’s missing from this document?' },
];

/**
 * The assistant beside the document (design: DocsFlow editor, right panel). It reads the whole
 * document as it is in the editor, answers questions, and drafts or rewrites sections — those
 * are shown in the document to add or discard.
 */
export function AssistantPanel({
  docId,
  getMarkdown,
  menu,
  model,
  onModelChange,
  ai,
  onCharged,
  outOfCredits,
  onClose,
}: {
  docId: string;
  getMarkdown: () => string;
  menu: ModelMenu;
  model: string;
  onModelChange: (m: string) => void;
  ai: ReturnType<typeof useAiEditing>;
  onCharged: () => void;
  outOfCredits: boolean;
  onClose?: () => void;
}) {
  const [thread, setThread] = useState<Turn[]>([]);
  const [text, setText] = useState('');
  const [running, setRunning] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const [noCredits, setNoCredits] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
  }, [thread.length, running]);
  useAbortOnLeave(abort);

  const ask = async (message: string, history: Turn[], retry = false) => {
    const ac = new AbortController();
    abort.current?.abort();
    abort.current = ac;
    setRunning(true);
    if (retry) ai.setRunning();
    const { data, error } = await api
      .POST('/api/docs/{id}/ai/assistant', {
        params: { path: { id: docId } },
        body: {
          message,
          markdown: getMarkdown(),
          history: history.filter((t) => !t.error).map(({ role, content }) => ({ role, content })),
          model,
        },
        signal: ac.signal,
      })
      // Network failure or Stop: no answer.
      .catch(() => ({ data: undefined, error: null }));
    if (ac.signal.aborted) return;
    abort.current = null;
    setRunning(false);
    if (!data) {
      const e = toApiError(error);
      if (e.code === 'insufficient_credits') setNoCredits(true);
      if (retry) ai.close();
      setThread((t) => [...t, { role: 'assistant', content: e.message, error: true }]);
      return;
    }
    onCharged();
    setTruncated(data.truncated);
    if (!retry) setThread((t) => [...t, { role: 'assistant', content: data.reply }]);
    if (data.insert)
      ai.propose(
        data.insert,
        { credits: data.credits, modelName: data.modelName },
        () => void ask(message, history, true),
      );
    else if (retry) ai.close();
  };

  const send = (raw: string) => {
    const message = raw.trim();
    if (!message || running) return false;
    const history = thread;
    setThread((t) => [...t, { role: 'user', content: message }]);
    void ask(message, history);
  };

  const blocked = outOfCredits || noCredits;

  return (
    <aside className="da" aria-label="Assistant">
      <div className="da-head">
        <span className="da-ic">
          <Icon name="sparkles" size={16} />
        </span>
        <span className="da-title">Assistant</span>
        {onClose && <IconButton icon="x" size="sm" label="Close assistant" onClick={onClose} />}
      </div>
      <div className="da-body" ref={scroller}>
        {truncated && (
          <Banner tone="warning" icon="info">
            This document is long, so I read the outline and the sections you mention, not the whole thing at
            once. Name a section to focus on.
          </Banner>
        )}
        <p className="da-intro">
          I can read this whole document. Ask for changes, or start with one of these.
        </p>
        {!thread.length && !blocked && (
          <div className="da-starters">
            {STARTERS.map((s) => (
              <button key={s.label} type="button" className="as-row" onClick={() => send(s.label)}>
                <Icon name={s.icon} size={18} className="lead" />
                <span className="txt">{s.label}</span>
                <Icon name="arrow-right" size={18} className="trail" />
              </button>
            ))}
          </div>
        )}
        {thread.map((t, i) => (
          <div key={i} className={cx('da-msg', t.role === 'user' && 'me', t.error && 'err')}>
            {t.role === 'user' ? t.content : <Markdown text={t.content} />}
          </div>
        ))}
        {running && (
          <div className="da-msg wait" role="status">
            <Icon name="loader-circle" size={16} className="as-spin" /> Reading your document…
          </div>
        )}
        {blocked && (
          <div className="da-limit" role="status">
            <span className="da-limit-ic">
              <Icon name="zap" size={16} />
            </span>
            <div>
              <b>Out of credits</b>
              <span>AI edits are paused. You can still write and format.</span>
            </div>
            <Link href="/settings/billing" className="as-btn primary sm">
              Top up
            </Link>
          </div>
        )}
      </div>
      <div className="da-foot">
        <Composer
          menu={menu}
          model={model}
          onModelChange={onModelChange}
          onSend={send}
          running={running}
          onStop={() => {
            abort.current?.abort();
            abort.current = null;
            setRunning(false);
          }}
          placeholder="Ask or tell the assistant what to change"
          label="Message the assistant"
          connectors={false}
          modeChip={false}
          rows={1}
          disabled={blocked}
          text={text}
          onTextChange={setText}
        />
      </div>
    </aside>
  );
}
