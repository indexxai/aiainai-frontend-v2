'use client';
import type { Editor } from '@tiptap/react';
import { marked } from 'marked';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Badge, Button, Chip, Dialog, Icon, IconButton } from '@/ui';
import { Markdown } from '@/components/chat/Markdown';
import { api } from '@/lib/api/client';
import { toApiError, type ApiError } from '@/lib/api/errors';
import { toMarkdown, type PmNode } from '@/lib/docs/markdown';
import { readMinutes, TYPE_INFO, type Doc } from '@/lib/docs/types';
import { writeDoc } from '@/lib/docs/write';
import type { ModelMenu } from '@/lib/models';
import { useAbortOnLeave } from '@/lib/useAbortOnLeave';
import { useMediaQuery } from '@/lib/useMediaQuery';
import { useShellCrumbs } from '@/components/shell/crumbs';
import { createAiMarks } from './ai-decorations';
import { AiWidget, useAiEditing } from './AiEdit';
import { AssistantPanel } from './AssistantPanel';
import { EditorToolbar, RichEditor, type EditorChange } from './RichEditor';
import { ExportDialog } from './ExportDialog';
import { ShareDialog } from './ShareDialog';
import { VersionsPanel, type VersionDetail } from './VersionsPanel';
import './docs.css';

type Save = 'idle' | 'saving' | 'saved' | 'error';
const SAVE_DELAY_MS = 800;

const started = (md: string) => (md.match(/^##\s+\S/gm) ?? []).length;
const words = (t: string) => (t.trim() ? t.trim().split(/\s+/).length : 0);

/**
 * A document: written live from its outline, then edited with autosave, with AI help (Ask AI on
 * a selection, the assistant panel) and sharing. Documents shared with you open read-only.
 * Designs: DocsFlow generating / editor / gen-failed / inline-ai / suggestion / assistant-insert /
 * share / viewer / no-credits.
 */
export function DocEditor({
  initial,
  author,
  menu,
  me,
  credits,
}: {
  initial: Doc;
  author: string;
  menu: ModelMenu;
  me: { name: string; email: string };
  credits: number;
}) {
  const router = useRouter();
  const viewer = initial.access === 'view';
  const [doc, setDoc] = useState(initial);
  const [live, setLive] = useState<{ text: string; modelName: string | null } | null>(null);
  const [notice, setNotice] = useState<ApiError | null>(null);
  const [title, setTitle] = useState(initial.title);
  const [save, setSave] = useState<Save>('idle');
  const [editor, setEditor] = useState<Editor | null>(null);
  const [editorKey, setEditorKey] = useState(0);
  const [headings, setHeadings] = useState<string[]>([]);
  const [wordTotal, setWordTotal] = useState(initial.wordCount);
  const abort = useRef<AbortController | null>(null);
  const mounted = useAbortOnLeave(abort);
  const pending = useRef<{ content?: EditorChange; title?: string; aiChange?: string }>({});
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  /** Retries a failed save (points at the latest `flush`). */
  const retry = useRef<(() => Promise<void>) | null>(null);

  /* ── AI and sharing ──────────────────────────────────── */
  const [model, setModel] = useState(menu.selected);
  const wide = useMediaQuery('(min-width: 1280px)', true);
  const phone = useMediaQuery('(max-width: 767px)', false);
  const [panelPref, setPanelPref] = useState<boolean | null>(null);
  const panelOpen = panelPref ?? wide;
  const [sharing, setSharing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [versionsKey, setVersionsKey] = useState(0);
  const [preview, setPreview] = useState<VersionDetail | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [shared, setShared] = useState({
    link: initial.linkAccess ?? 'off',
    people: initial.sharedWith ?? 0,
  });
  const [toast, setToast] = useState('');
  const [bubble, setBubble] = useState<{ top: number; left: number } | null>(null);
  const paper = useRef<HTMLElement>(null);
  // The slot the Ask AI popover / suggestion cards render into, inside the document.
  const [widgetEl] = useState(() => {
    if (typeof document === 'undefined') return null;
    const el = document.createElement('div');
    el.className = 'de-ai-widget';
    return el;
  });
  const aiExtensions = useMemo(() => (widgetEl ? [createAiMarks(widgetEl)] : []), [widgetEl]);
  const say = useCallback((m: string) => setToast(m), []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3200);
    return () => clearTimeout(t);
  }, [toast]);
  const ai = useAiEditing({
    editor,
    docId: initial.id,
    model,
    onCharged: () => router.refresh(),
    onAccepted: (message, change) => {
      say(message);
      // The save that carries this change also keeps a version of it.
      pending.current.aiChange = change;
    },
  });

  const pathname = usePathname();
  useShellCrumbs({
    path: pathname,
    items: [{ label: 'Docs', href: '/docs/all' }, { label: title || 'Untitled document' }],
    back: '/docs/all',
  });

  const writing = live !== null || doc.status === 'writing';
  const total = doc.sections.length;

  /* ── Writing ─────────────────────────────────────────── */
  const startWriting = useCallback(async () => {
    if (abort.current) return;
    const ac = new AbortController();
    abort.current = ac;
    setNotice(null);
    setLive({ text: '', modelName: null });
    const outcome = await writeDoc(initial.id, ac.signal, {
      onReady: (d) => {
        setDoc(d);
        setLive({ text: d.markdown ? `${d.markdown}\n\n` : '', modelName: null });
      },
      onModel: (e) => setLive((l) => (l ? { ...l, modelName: e.modelName } : l)),
      onDelta: (t) => setLive((l) => (l ? { ...l, text: l.text + t } : l)),
    });
    abort.current = null;
    // This page closed: writing carries on and is saved. If the page is still open (Stop couldn't
    // reach the server, so the stream was cut here), load what's saved like a dropped connection.
    if (outcome.kind === 'aborted' && !mounted.current) return;
    if (outcome.kind === 'done' || outcome.kind === 'error') {
      setDoc(outcome.doc);
      setWordTotal(outcome.doc.wordCount);
    } else {
      if (outcome.kind === 'request-failed') setNotice(outcome.error);
      // Dropped: the server keeps writing and saves it; load what's there.
      await new Promise((r) => setTimeout(r, 400));
      const { data } = await api.GET('/api/docs/{id}', { params: { path: { id: initial.id } } });
      if (data) {
        setDoc(data);
        setWordTotal(data.wordCount);
      }
    }
    setLive(null);
    setEditorKey((k) => k + 1);
    router.refresh(); // credits in the sidebar
  }, [initial.id, router, mounted]);

  // A new document starts writing as soon as it opens.
  const auto = useRef(false);
  useEffect(() => {
    if (auto.current || initial.status !== 'draft') return;
    auto.current = true;
    void startWriting();
  }, [initial.status, startWriting]);

  // Being written but not streamed to this page (you left and came back, or another tab):
  // show the saved progress and check back until it's done.
  useEffect(() => {
    if (doc.status !== 'writing' || live) return;
    const t = setInterval(async () => {
      const { data } = await api.GET('/api/docs/{id}', { params: { path: { id: initial.id } } });
      if (!data) return;
      setDoc(data);
      if (data.status !== 'writing') {
        setWordTotal(data.wordCount);
        setEditorKey((k) => k + 1);
        router.refresh(); // credits in the sidebar
      }
    }, 1500);
    return () => clearInterval(t);
  }, [doc.status, live, initial.id, router]);

  const stopWriting = async () => {
    const { error } = await api
      .POST('/api/docs/{id}/stop', { params: { path: { id: initial.id } } })
      .catch(() => ({ error: true }));
    if (error) abort.current?.abort();
  };

  /* ── Saving ──────────────────────────────────────────── */
  const flush = useCallback(async () => {
    const body: { title?: string; content?: Record<string, unknown>; text?: string; aiChange?: string } = {};
    if (pending.current.title !== undefined) body.title = pending.current.title;
    if (pending.current.content) {
      body.content = pending.current.content.json;
      body.text = pending.current.content.text;
      if (pending.current.aiChange) body.aiChange = pending.current.aiChange;
    }
    pending.current = {};
    if (!Object.keys(body).length) return;
    setSave('saving');
    const { data, error } = await api.PATCH('/api/docs/{id}', { params: { path: { id: initial.id } }, body });
    if (data) {
      setSave('saved');
      setDoc((d) => ({
        ...d,
        content: data.content,
        wordCount: data.wordCount,
        updatedAt: data.updatedAt,
        title: data.title,
      }));
    } else {
      setSave('error');
      setNotice(toApiError(error));
      // Keep the change so the next edit (or the retry below) sends it again.
      pending.current = { ...(body.title !== undefined && { title: body.title }), ...pending.current };
      if (body.content) pending.current.content = { json: body.content, text: body.text ?? '' };
      if (body.aiChange) pending.current.aiChange = body.aiChange;
      clearTimeout(timer.current);
      timer.current = setTimeout(() => void retry.current?.(), 5000);
    }
  }, [initial.id]);

  useEffect(() => {
    retry.current = flush;
  }, [flush]);

  const queue = useCallback(
    (p: { content?: EditorChange; title?: string }) => {
      pending.current = { ...pending.current, ...p };
      setSave('saving');
      clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), SAVE_DELAY_MS);
    },
    [flush],
  );

  // Save before leaving the page.
  useEffect(() => {
    const before = (e: BeforeUnloadEvent) => {
      if (Object.keys(pending.current).length) {
        void flush();
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', before);
    return () => {
      window.removeEventListener('beforeunload', before);
      clearTimeout(timer.current);
      void flush();
    };
  }, [flush]);

  /* ── Editor content and outline ─────────────────────── */
  const initialContent = useMemo(
    () => doc.content ?? (marked.parse(doc.markdown || '', { async: false }) as string),
    // re-read only when the editor is re-created (after writing)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editorKey],
  );

  const readHeadings = (e: Editor) => {
    const hs: string[] = [];
    e.state.doc.descendants((n) => {
      if (n.type.name === 'heading' && n.attrs.level <= 2 && n.textContent.trim())
        hs.push(n.textContent.trim());
    });
    setHeadings(hs);
  };

  const onEditorChange = (c: EditorChange) => {
    queue({ content: c });
    setWordTotal(words(c.text));
    if (editor) readHeadings(editor);
  };

  // "Ask AI" bubble above a selection.
  const aiOpen = !!ai.state;
  useEffect(() => {
    if (!editor || viewer) return;
    const update = () => {
      const { from, to, empty } = editor.state.selection;
      const box = paper.current?.getBoundingClientRect();
      if (empty || aiOpen || !editor.isEditable || !box || !editor.isFocused) return setBubble(null);
      if (!editor.state.doc.textBetween(from, to, ' ').trim()) return setBubble(null);
      const a = editor.view.coordsAtPos(from);
      setBubble({ top: a.top - box.top - 42, left: Math.max(8, a.left - box.left - 8) });
    };
    const hide = () => setBubble(null);
    editor.on('selectionUpdate', update);
    editor.on('focus', update);
    editor.on('blur', hide);
    update();
    return () => {
      editor.off('selectionUpdate', update);
      editor.off('focus', update);
      editor.off('blur', hide);
    };
  }, [editor, aiOpen, viewer]);

  const askAi = () => {
    setBubble(null);
    if (!ai.openAsk()) say('Select the text you want to change first');
  };
  const getMarkdown = () => (editor ? toMarkdown(editor.getJSON() as PmNode) : doc.markdown);

  const jumpTo = (i: number) => {
    const el = document.querySelectorAll('.de-paper h1, .de-paper h2')[i] as HTMLElement | undefined;
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  /* ── Versions ────────────────────────────────────────── */
  const restore = async () => {
    if (!preview) return;
    await flush();
    const { data, error } = await api.POST('/api/docs/{id}/versions/{versionId}/restore', {
      params: { path: { id: initial.id, versionId: preview.id } },
    });
    setRestoring(false);
    if (!data) return setNotice(toApiError(error));
    setDoc(data);
    setWordTotal(data.wordCount);
    setPreview(null);
    setEditorKey((k) => k + 1);
    setVersionsKey((k) => k + 1);
    say('Restored — the version before is saved in Versions');
  };

  /* ── View ────────────────────────────────────────────── */
  const liveText = live?.text ?? (doc.status === 'writing' ? (doc.markdown ?? '') : '');
  const startedCount = Math.min(total, started(liveText));
  const doneCount = writing ? Math.max(0, startedCount - 1) : doc.sectionsDone;
  const typeLabel = TYPE_INFO[doc.type].label;
  const outline = writing ? doc.sections.map((s) => s.heading) : headings;
  const canContinue = (doc.status === 'stopped' || doc.status === 'failed') && !doc.content && total > 0;
  const editable = !writing && !viewer;
  const outOfCredits = credits <= 0;

  return (
    <div className="de">
      <header className="de-header">
        <nav aria-label="Breadcrumb" className="de-crumb">
          <Link href="/docs/all">Docs</Link>
          <span className="sep" aria-hidden>
            /
          </span>
          <span aria-current="page">{title || 'Untitled document'}</span>
        </nav>
        {viewer && <Badge icon="eye">View only</Badge>}
        <span className="de-save" role="status" aria-live="polite">
          {viewer ? (
            <>
              <Icon name="eye" size={14} /> Shared with you{initial.sharedBy ? ` by ${initial.sharedBy}` : ''}
            </>
          ) : writing ? null : save === 'saving' ? (
            <>
              <Icon name="loader-circle" size={14} className="as-spin" /> Saving…
            </>
          ) : save === 'error' ? (
            <>
              <Icon name="cloud-off" size={14} /> Not saved — retrying
            </>
          ) : save === 'saved' ? (
            <>
              <Icon name="check" size={14} /> Saved
            </>
          ) : null}
        </span>
        {!viewer && !writing && (
          <div className="de-actions">
            {!panelOpen && !versionsOpen && (
              <Button size="sm" variant="ghost" icon="sparkles" onClick={() => setPanelPref(true)}>
                Assistant
              </Button>
            )}
            <Button size="sm" variant="ghost" icon="history" onClick={() => setVersionsOpen(true)}>
              Versions
            </Button>
            <Button size="sm" variant="secondary" icon="download" onClick={() => setExporting(true)}>
              Export
            </Button>
            <Button
              size="sm"
              variant="primary"
              icon={shared.people || shared.link === 'view' ? 'users' : 'share-2'}
              title={
                shared.people || shared.link === 'view'
                  ? [
                      shared.people
                        ? `Shared with ${shared.people} ${shared.people === 1 ? 'person' : 'people'}`
                        : '',
                      shared.link === 'view' ? 'anyone with the link can view' : '',
                    ]
                      .filter(Boolean)
                      .join(' · ')
                  : undefined
              }
              onClick={() => setSharing(true)}
            >
              Share
            </Button>
          </div>
        )}
        {viewer && (
          <div className="de-actions">
            <Button size="sm" variant="secondary" icon="download" onClick={() => setExporting(true)}>
              Download
            </Button>
          </div>
        )}
        <Link href="/inbox" className="as-iconbtn" aria-label="Notifications" title="Notifications">
          <Icon name="bell" size={20} />
        </Link>
      </header>

      <div className="de-body">
        <aside className="de-outline" aria-label="Outline">
          <h2 className="de-ov">Outline</h2>
          <ol>
            {outline.map((h, i) => (
              <li key={`${i}-${h}`}>
                <button
                  type="button"
                  className={writing && i >= doneCount ? 'pending' : undefined}
                  onClick={() => jumpTo(i)}
                  disabled={writing && i >= startedCount}
                >
                  {i + 1}. {h}
                </button>
              </li>
            ))}
          </ol>
          <div className="de-count">
            {writing
              ? `${words(liveText).toLocaleString('en-US')} words so far`
              : `${wordTotal.toLocaleString('en-US')} words · ${readMinutes(wordTotal)} min read`}
          </div>
        </aside>

        <div className="de-main">
          {preview && (
            <div className="de-preview" role="status">
              <Icon name="history" size={16} />
              <span className="grow">
                You’re looking at <strong>{preview.name}</strong>. Changes since then are hidden.
              </span>
              <Button size="sm" variant="ghost" onClick={() => setPreview(null)}>
                Back to current
              </Button>
              <Button size="sm" variant="primary" icon="rotate-ccw" onClick={() => setRestoring(true)}>
                Restore this version
              </Button>
            </div>
          )}
          {viewer && (
            <div className="de-phone-only de-viewer-bar">
              <Button size="sm" variant="secondary" icon="download" onClick={() => setExporting(true)}>
                Download
              </Button>
            </div>
          )}
          {!viewer && !preview && (
            <EditorToolbar editor={editor} disabled={!editable}>
              <span className="de-sep" aria-hidden />
              <Chip
                icon="sparkles"
                disabled={!editable || !editor}
                onMouseDown={(e) => e.preventDefault()}
                onClick={askAi}
              >
                Ask AI
              </Chip>
              <span className="de-phone-only">
                <IconButton
                  icon="message-square"
                  size="sm"
                  label="Assistant"
                  disabled={!editable}
                  onClick={() => setPanelPref(true)}
                />
                <IconButton
                  icon="history"
                  size="sm"
                  label="Versions"
                  disabled={!editable}
                  onClick={() => setVersionsOpen(true)}
                />
                <IconButton
                  icon="download"
                  size="sm"
                  label="Export"
                  disabled={writing}
                  onClick={() => setExporting(true)}
                />
                <IconButton
                  icon="share-2"
                  size="sm"
                  label="Share"
                  disabled={!editable}
                  onClick={() => setSharing(true)}
                />
              </span>
            </EditorToolbar>
          )}
          <div className="de-scroll">
            <div className="de-col">
              {writing && (
                <div className="de-card">
                  <span className="de-spin" aria-hidden>
                    <Icon name="loader-circle" size={18} className="as-spin" />
                  </span>
                  <div className="de-card-body">
                    <div className="de-card-title">
                      Writing your {typeLabel.toLowerCase()} <Badge tone="info">Running</Badge>
                    </div>
                    <p className="de-card-txt">
                      Section {Math.min(total, Math.max(1, startedCount))} of {total}
                      {live?.modelName ? ` · ${live.modelName}` : ''}
                    </p>
                    <div
                      className="de-progress"
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={total}
                      aria-valuenow={doneCount}
                      aria-label="Sections written"
                    >
                      <i style={{ width: `${(doneCount / Math.max(1, total)) * 100}%` }} />
                    </div>
                  </div>
                  {!viewer && (
                    <Button size="sm" variant="ghost" onClick={() => void stopWriting()}>
                      Stop
                    </Button>
                  )}
                </div>
              )}

              {!writing && doc.status === 'failed' && doc.error?.code === 'insufficient_credits' && (
                <div className="de-card">
                  <span className="de-card-ic">
                    <Icon name="zap" size={16} />
                  </span>
                  <div className="de-card-body">
                    <div className="de-card-title">
                      Not enough credits <Badge icon={false}>Usage limit reached</Badge>
                    </div>
                    <p className="de-card-txt">
                      Writing this document needs more credits than you have. You can still write and format
                      by hand.
                    </p>
                  </div>
                  <Link href="/settings/billing" className="as-btn primary sm">
                    Top up
                  </Link>
                </div>
              )}
              {!writing && canContinue && doc.error?.code !== 'insufficient_credits' && (
                <div className="de-card">
                  <span className={doc.status === 'failed' || doc.error ? 'de-card-ic danger' : 'de-card-ic'}>
                    <Icon name={doc.error ? 'circle-alert' : 'circle-pause'} size={16} />
                  </span>
                  <div className="de-card-body">
                    <div className="de-card-title">
                      Stopped at section {Math.min(total, doc.sectionsDone + 1)} of {total}
                      {doc.error && (
                        <Badge tone="danger" icon={false}>
                          Failed
                        </Badge>
                      )}
                    </div>
                    <p className="de-card-txt">
                      {doc.error ? `${doc.error.message} ` : ''}
                      {doc.sectionsDone
                        ? `The first ${doc.sectionsDone === 1 ? 'section is' : `${doc.sectionsDone} sections are`} saved; you were charged only for ${doc.sectionsDone === 1 ? 'it' : 'them'}.`
                        : 'Nothing was written and no credits were used.'}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    icon={doc.error ? 'rotate-ccw' : 'play'}
                    onClick={() => void startWriting()}
                  >
                    {doc.error ? 'Retry' : 'Continue writing'}
                  </Button>
                </div>
              )}
              {notice && !writing && (
                <div className="de-card" role="alert">
                  <span className="de-card-ic danger">
                    <Icon name="circle-alert" size={16} />
                  </span>
                  <p className="de-card-txt">{notice.message}</p>
                  <Button size="sm" variant="ghost" onClick={() => setNotice(null)}>
                    Dismiss
                  </Button>
                </div>
              )}

              <article className="de-paper" ref={paper}>
                {bubble && (
                  <button
                    type="button"
                    className="de-bubble"
                    style={{ top: bubble.top, left: bubble.left }}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={askAi}
                  >
                    <Icon name="sparkles" size={14} /> Ask AI
                  </button>
                )}
                <div className="de-eyebrow">
                  {typeLabel} · {viewer ? 'Shared' : writing ? 'Writing' : 'Draft'}
                </div>
                <textarea
                  className="de-title"
                  aria-label="Document title"
                  value={title}
                  maxLength={200}
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.preventDefault();
                  }}
                  placeholder="Untitled document"
                  readOnly={writing || viewer}
                  onChange={(e) => {
                    setTitle(e.target.value.replace(/\n/g, ' '));
                    if (e.target.value.trim()) queue({ title: e.target.value });
                  }}
                />
                <div className="de-byline">
                  {viewer
                    ? initial.sharedBy
                      ? `Shared by ${initial.sharedBy}`
                      : 'Shared with you'
                    : `Prepared by ${author}`}{' '}
                  · Updated{' '}
                  {new Date(doc.updatedAt).toDateString() === new Date().toDateString()
                    ? 'today'
                    : new Date(doc.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </div>

                {writing ? (
                  <div className="de-live" aria-busy="true">
                    <div className="de-prose">
                      <Markdown text={liveText} />
                    </div>
                    {doc.sections.slice(Math.max(startedCount, 0)).map((s, i) => (
                      <div key={s.heading + i} className="de-pending">
                        <h2>{s.heading}</h2>
                        <p>{i === 0 && startedCount === 0 ? 'Writing…' : 'Waiting'}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    {preview && (
                      <RichEditor
                        key={`v-${preview.id}`}
                        initial={
                          preview.content ??
                          (marked.parse(preview.markdown || '', { async: false }) as string)
                        }
                        editable={false}
                        onChange={() => {}}
                      />
                    )}
                    {/* Kept mounted while previewing, so nothing typed is lost. */}
                    <div hidden={!!preview} className="de-live-editor">
                      <RichEditor
                        key={editorKey}
                        initial={initialContent}
                        editable={editable}
                        onChange={onEditorChange}
                        extensions={aiExtensions}
                        onReady={(e) => {
                          setEditor(e);
                          readHeadings(e);
                        }}
                      />
                    </div>
                  </>
                )}
              </article>
            </div>
          </div>
        </div>
        {!viewer && !writing && versionsOpen && (
          <VersionsPanel
            docId={initial.id}
            updatedAt={doc.updatedAt}
            previewId={preview?.id ?? null}
            refreshKey={versionsKey}
            onPreview={(v) => {
              if (v) void flush(); // keep anything typed before looking back
              setPreview(v);
              if (v && phone) setVersionsOpen(false); // the panel covers the page on phones
            }}
            onClose={() => {
              setVersionsOpen(false);
              setPreview(null);
            }}
            onToast={say}
          />
        )}
        {!viewer && !writing && panelOpen && !versionsOpen && (
          <AssistantPanel
            docId={initial.id}
            getMarkdown={getMarkdown}
            menu={menu}
            model={model}
            onModelChange={setModel}
            ai={ai}
            onCharged={() => router.refresh()}
            outOfCredits={outOfCredits}
            onClose={() => setPanelPref(false)}
          />
        )}
      </div>

      {widgetEl && editor && !writing && !preview && (
        <AiWidget
          el={widgetEl}
          ai={ai}
          menu={menu}
          model={model}
          onModelChange={setModel}
          outOfCredits={outOfCredits}
        />
      )}
      {!viewer && (
        <ShareDialog
          open={sharing}
          docId={initial.id}
          title={title}
          me={me}
          onClose={() => setSharing(false)}
          onChange={(s) => setShared({ link: s.linkAccess, people: s.invites.length })}
          onToast={say}
        />
      )}
      <ExportDialog
        open={exporting}
        onClose={() => setExporting(false)}
        title={title || 'Untitled document'}
        url={`/api/docs/${initial.id}/export`}
        download={viewer}
      />
      <Dialog
        open={restoring && !!preview}
        title={`Restore ${preview?.name ?? 'this version'}?`}
        description="The document goes back to this version. Your current version is saved in Versions, so you can switch back any time."
        width={480}
        onClose={() => setRestoring(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setRestoring(false)}>
              Cancel
            </Button>
            <Button variant="primary" icon="rotate-ccw" onClick={() => void restore()}>
              Restore
            </Button>
          </>
        }
      />
      {toast && (
        <div className="de-toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
