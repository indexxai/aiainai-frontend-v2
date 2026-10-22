'use client';
import type { Editor } from '@tiptap/react';
import { marked } from 'marked';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Badge, Button, Chip, Icon, IconButton } from '@/ui';
import { Markdown } from '@/components/chat/Markdown';
import { ModelPicker } from '@/components/models/ModelPicker';
import { api, type Schemas } from '@/lib/api/client';
import { toApiError, type ApiError } from '@/lib/api/errors';
import { toMarkdown, type PmNode } from '@/lib/docs/markdown';
import type { ModelMenu } from '@/lib/models';
import { afterBlock, aiMarks, sectionRange, setAiMarks } from './ai-decorations';
import { VoiceButton } from '@/components/voice/Voice';

type Action = NonNullable<Schemas['EditRequestDto']['action']>;
type Insert = Schemas['InsertSuggestionDto'];

const QUICK: { action: Action; label: string; done: string }[] = [
  { action: 'shorter', label: 'Make shorter', done: 'Made shorter' },
  { action: 'formal', label: 'More formal', done: 'More formal' },
  { action: 'simpler', label: 'Simpler words', done: 'Simpler words' },
  { action: 'translate', label: 'Translate', done: 'Translated' },
  { action: 'grammar', label: 'Fix grammar', done: 'Checked grammar' },
];
const RUNNING: Record<Action, string> = {
  shorter: 'Making it shorter…',
  formal: 'Making it more formal…',
  simpler: 'Using simpler words…',
  grammar: 'Checking grammar…',
  translate: 'Translating…',
};
const LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Arabic', 'Urdu', 'Chinese'];

interface Request {
  action?: Action;
  instruction?: string;
  language?: string;
}

export type AiState =
  | {
      kind: 'ask';
      inline: boolean;
      original: string;
      context: string;
      phase: 'ask' | 'running' | 'result';
      request?: Request;
      label?: string;
      result?: { text: string; credits: number; modelName: string };
      error?: ApiError;
    }
  | {
      kind: 'insert';
      insert: Insert;
      phase: 'result' | 'running';
      credits: number;
      modelName: string;
      retry: () => void;
    };

const labelFor = (r: Request) =>
  r.action === 'translate'
    ? `Translated to ${r.language}`
    : r.action
      ? QUICK.find((q) => q.action === r.action)!.done
      : `Changed: “${r.instruction}”`;

const credits = (n: number) => `${n} credit${n === 1 ? '' : 's'}`;

/**
 * AI editing in the document (designs DC06 inline AI, DC07 suggestion, DC08 assistant insert):
 * Ask AI on selected text → a suggested rewrite to accept, retry or reject; and sections the
 * assistant proposes, shown in place until added or discarded. Nothing changes until accepted.
 */
export function useAiEditing({
  editor,
  docId,
  model,
  onCharged,
  onAccepted,
}: {
  editor: Editor | null;
  docId: string;
  model: string;
  onCharged: () => void;
  /** `change` names the AI change, so a version is kept for it. */
  onAccepted: (message: string, change: string) => void;
}) {
  const [state, setState] = useState<AiState | null>(null);
  const abort = useRef<AbortController | null>(null);

  const close = useCallback(() => {
    abort.current?.abort();
    abort.current = null;
    setState(null);
    if (editor && !editor.isDestroyed) setAiMarks(editor, null);
  }, [editor]);

  /** Start Ask AI on the selection (or, with none, the block the cursor is in). */
  const openAsk = useCallback(() => {
    if (!editor) return false;
    const { state: s } = editor;
    let { from, to } = s.selection;
    if (from === to) {
      const $p = s.doc.resolve(from);
      if ($p.depth < 1 || !$p.parent.textContent.trim()) return false;
      from = $p.before(1);
      to = $p.after(1);
    }
    const $from = s.doc.resolve(from);
    const $to = s.doc.resolve(to);
    const inline = $from.sameParent($to) && $from.parent.isTextblock;
    if (!inline) {
      // Rewrites of several blocks replace whole blocks.
      from = $from.depth >= 1 ? $from.before(1) : from;
      to = $to.depth >= 1 ? $to.after(1) : to;
    }
    const original = toMarkdown({
      type: 'doc',
      content: s.doc.slice(from, to).content.toJSON() as PmNode[],
    });
    if (!original.trim()) return false;
    abort.current?.abort();
    setAiMarks(editor, { range: { from, to }, mode: 'sel', widget: afterBlock(s, to - 1) });
    setState({
      kind: 'ask',
      inline,
      original,
      context: s.doc.textBetween(Math.max(0, from - 700), Math.min(s.doc.content.size, to + 700), '\n'),
      phase: 'ask',
    });
    return true;
  }, [editor]);

  const run = useCallback(
    async (req: Request) => {
      if (!editor || state?.kind !== 'ask') return;
      const ac = new AbortController();
      abort.current?.abort();
      abort.current = ac;
      setState({ ...state, phase: 'running', request: req, error: undefined });
      const { data, error } = await api
        .POST('/api/docs/{id}/ai/edit', {
          params: { path: { id: docId } },
          body: { text: state.original.slice(0, 8000), context: state.context, model, ...req },
          signal: ac.signal,
        })
        .catch(() => ({ data: undefined, error: null }));
      if (ac.signal.aborted) return;
      abort.current = null;
      if (!data) {
        setState({ ...state, phase: 'ask', request: req, error: toApiError(error) });
        return;
      }
      onCharged();
      setAiMarks(editor, { mode: 'old' });
      setState({
        ...state,
        phase: 'result',
        request: req,
        label: labelFor(req),
        result: { text: data.text, credits: data.credits, modelName: data.modelName },
      });
    },
    [editor, state, docId, model, onCharged],
  );

  const accept = useCallback(() => {
    if (!editor || !state) return;
    const marks = aiMarks(editor.state);
    if (state.kind === 'ask' && state.result && marks.range) {
      let { from, to } = marks.range;
      const text = state.result.text;
      const blocky = !state.inline || /\n\s*\n/.test(text.trim());
      if (blocky && state.inline) {
        // A one-paragraph selection came back as several paragraphs: replace the whole block.
        const $f = editor.state.doc.resolve(from);
        from = $f.before($f.depth);
        to = editor.state.doc.resolve(to).after($f.depth);
      }
      const html = blocky
        ? (marked.parse(text, { async: false }) as string)
        : (marked.parseInline(text, { async: false }) as string);
      setAiMarks(editor, null);
      editor.chain().focus().insertContentAt({ from, to }, html).run();
      onAccepted('Change accepted', state.label ?? 'Edited with AI');
    } else if (state.kind === 'insert') {
      const html = marked.parse(state.insert.markdown, { async: false }) as string;
      const range = state.insert.replaces ? marks.range : null;
      const at = marks.widget ?? editor.state.doc.content.size;
      setAiMarks(editor, null);
      if (range) editor.chain().focus().insertContentAt(range, html).run();
      else editor.chain().focus().insertContentAt(at, html).run();
      onAccepted(
        state.insert.replaces ? 'Section updated' : 'Section added',
        state.insert.replaces ? 'Section rewritten' : 'Section added',
      );
    }
    setState(null);
  }, [editor, state, onAccepted]);

  /** A section the assistant drafted: show it in place, to add or discard. */
  const propose = useCallback(
    (insert: Insert, meta: { credits: number; modelName: string }, retry: () => void) => {
      if (!editor) return;
      abort.current?.abort();
      const s = editor.state;
      const target = insert.replaces ? sectionRange(s, insert.replaces) : null;
      const after = !target && insert.after ? sectionRange(s, insert.after) : null;
      const widget = target ? target.to : after ? after.to : s.doc.content.size;
      setAiMarks(editor, { range: target, mode: 'old', widget });
      setState({
        kind: 'insert',
        // A rewrite of a section that isn't there any more is added as a new one.
        insert: target ? insert : { ...insert, replaces: null },
        phase: 'result',
        ...meta,
        retry,
      });
    },
    [editor],
  );

  const setRunning = useCallback(() => {
    setState((s) => (s?.kind === 'insert' ? { ...s, phase: 'running' } : s));
  }, []);

  // Escape closes Ask AI.
  useEffect(() => {
    if (state?.kind !== 'ask') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state?.kind, close]);

  return { state, openAsk, run, accept, close, propose, setRunning };
}

/** Renders the current AI card into the editor's widget slot. */
export function AiWidget({
  el,
  ai,
  menu,
  model,
  onModelChange,
  outOfCredits,
}: {
  el: HTMLElement;
  ai: ReturnType<typeof useAiEditing>;
  menu: ModelMenu;
  model: string;
  onModelChange: (m: string) => void;
  outOfCredits: boolean;
}) {
  const s = ai.state;
  useEffect(() => {
    if (s?.phase === 'result') el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [s?.phase, s?.kind, el]);
  if (!s) return null;
  let body: ReactNode;
  if (s.kind === 'ask' && s.phase !== 'result') {
    body = (
      <AskPopover
        s={s}
        ai={ai}
        menu={menu}
        model={model}
        onModelChange={onModelChange}
        outOfCredits={outOfCredits}
      />
    );
  } else if (s.kind === 'ask') {
    body = (
      <div className="de-sug" role="region" aria-label="Suggested change">
        <div className="de-sug-head">
          <Badge tone="info" icon="sparkles">
            {s.label}
          </Badge>
          <span className="grow" />
          <span className="de-sug-meta">
            {credits(s.result!.credits)} · {s.result!.modelName}
          </span>
        </div>
        <div className="de-sug-new de-prose">
          <Markdown text={s.result!.text} />
        </div>
        <div className="de-sug-actions">
          <Button size="sm" variant="primary" icon="check" onClick={ai.accept}>
            Accept
          </Button>
          <Button size="sm" variant="ghost" icon="rotate-ccw" onClick={() => void ai.run(s.request!)}>
            Try again
          </Button>
          <Button size="sm" variant="ghost" icon="x" onClick={ai.close}>
            Reject
          </Button>
        </div>
      </div>
    );
  } else {
    body = (
      <div className="de-sug dashed" role="region" aria-label="Suggested section">
        <div className="de-sug-head">
          <Badge tone="info" icon="sparkles">
            Suggested by AI
          </Badge>
          <span className="de-sug-meta grow">
            {s.insert.replaces
              ? `New version of “${s.insert.replaces}” · not in your document yet`
              : 'New section from the assistant · not in your document yet'}
          </span>
        </div>
        {s.phase === 'running' ? (
          <p className="de-sug-wait">
            <Icon name="loader-circle" size={16} className="as-spin" /> Writing another version…
          </p>
        ) : (
          <div className="de-sug-new plain de-prose">
            <Markdown text={s.insert.markdown} />
          </div>
        )}
        <div className="de-sug-actions">
          <Button
            size="sm"
            variant="primary"
            icon="check"
            onClick={ai.accept}
            disabled={s.phase === 'running'}
          >
            {s.insert.replaces ? 'Replace section' : 'Add to document'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            icon="rotate-ccw"
            onClick={s.retry}
            disabled={s.phase === 'running'}
          >
            Try again
          </Button>
          <Button size="sm" variant="ghost" icon="x" onClick={ai.close}>
            Discard
          </Button>
        </div>
      </div>
    );
  }
  return createPortal(<div className="de-ai-slot">{body}</div>, el);
}

function AskPopover({
  s,
  ai,
  menu,
  model,
  onModelChange,
  outOfCredits,
}: {
  s: Extract<AiState, { kind: 'ask' }>;
  ai: ReturnType<typeof useAiEditing>;
  menu: ModelMenu;
  model: string;
  onModelChange: (m: string) => void;
  outOfCredits: boolean;
}) {
  const [text, setText] = useState('');
  const [languages, setLanguages] = useState(false);
  const running = s.phase === 'running';
  const noCredits = outOfCredits || s.error?.code === 'insufficient_credits';
  const send = () => {
    const t = text.trim();
    if (t.length >= 2 && !running) void ai.run({ instruction: t });
  };
  return (
    <div className="de-pop" role="dialog" aria-label="Ask AI">
      {running ? (
        <div className="de-pop-run" role="status">
          <Icon name="loader-circle" size={16} className="as-spin" />
          <span className="grow">{s.request?.action ? RUNNING[s.request.action] : 'Rewriting…'}</span>
          <Button size="sm" variant="ghost" onClick={ai.close}>
            Cancel
          </Button>
        </div>
      ) : (
        <>
          <div className="de-pop-in">
            <Icon name="sparkles" size={16} />
            <input
              autoFocus
              aria-label="Tell AI how to change this"
              placeholder="Tell AI how to change this…"
              value={text}
              maxLength={500}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <VoiceButton value={text} onChange={setText} maxLength={500} />
            <ModelPicker menu={menu} value={model} onChange={onModelChange} align="end" />
            <IconButton
              icon="arrow-up"
              size="sm"
              variant="brand"
              shape="pill"
              label="Apply"
              disabled={text.trim().length < 2 || noCredits}
              onClick={send}
            />
          </div>
          {noCredits ? (
            <span className="de-pop-warn">
              You’re out of credits — AI edits are paused. You can still edit by hand.{' '}
              <Link href="/settings/billing">Top up</Link>
            </span>
          ) : s.error ? (
            <span className="de-pop-err" role="alert">
              {s.error.message}
            </span>
          ) : null}
          <div className="de-pop-chips">
            {languages ? (
              <>
                <IconButton icon="arrow-left" size="sm" label="Back" onClick={() => setLanguages(false)} />
                {LANGUAGES.map((l) => (
                  <Chip
                    key={l}
                    shape="tag"
                    disabled={noCredits}
                    onClick={() => void ai.run({ action: 'translate', language: l })}
                  >
                    {l}
                  </Chip>
                ))}
              </>
            ) : (
              QUICK.map((q) => (
                <Chip
                  key={q.action}
                  shape="tag"
                  disabled={noCredits}
                  onClick={() =>
                    q.action === 'translate' ? setLanguages(true) : void ai.run({ action: q.action })
                  }
                >
                  {q.label}
                </Chip>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
