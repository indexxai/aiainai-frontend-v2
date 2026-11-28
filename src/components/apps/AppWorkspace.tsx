'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api/client';
import { toApiError } from '@/lib/api/errors';
import { buildApp, type AppData } from '@/lib/apps/build';
import { buildPreview, languageOf, sortPaths } from '@/lib/apps/preview';
import { Banner, Button, Icon } from '@/ui';
import './apps.css';

type LiveStep = { request: string; note: string; changed: string[]; removed: string[]; running: boolean };

/**
 * One app: files and code on the left, the running result on the right, the change history
 * underneath, and a box to tell Jack what to build next. Files appear as Jack finishes them.
 */
export function AppWorkspace({ initial }: { initial: AppData }) {
  const [app, setApp] = useState(initial);
  const [files, setFiles] = useState<Record<string, string>>(() => toMap(initial.files));
  const [done, setDone] = useState<Record<string, string>>(() => toMap(initial.files));
  const [selected, setSelected] = useState(initial.files[0]?.path ?? '');
  const [writing, setWriting] = useState<string | null>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const [request, setRequest] = useState('');
  const [live, setLive] = useState<LiveStep | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'code' | 'preview'>('code');
  const [reload, setReload] = useState(0);
  const abort = useRef<AbortController | null>(null);
  const building = live?.running ?? false;

  useEffect(() => () => abort.current?.abort(), []);

  const paths = useMemo(() => sortPaths(Object.keys(files)), [files]);
  const html = useMemo(
    () => buildPreview(Object.entries(done).map(([path, content]) => ({ path, content }))),
    [done],
  );
  const shown = draft ?? files[selected] ?? '';
  const dirty = draft !== null && draft !== (done[selected] ?? '');

  const select = (p: string) => {
    setSelected(p);
    setDraft(null);
    setTab('code');
  };

  const start = async () => {
    const text = request.trim();
    if (!text || building) return;
    setError('');
    setDraft(null);
    setRequest('');
    setLive({ request: text, note: '', changed: [], removed: [], running: true });
    const ctrl = new AbortController();
    abort.current = ctrl;
    const outcome = await buildApp(app.id, text, ctrl.signal, {
      onNote: (t) => setLive((s) => s && { ...s, note: s.note + t }),
      onFileStart: (p) => {
        setWriting(p);
        setSelected(p);
        setTab('code');
        setFiles((f) => ({ ...f, [p]: '' }));
      },
      onFileDelta: (p, t) => setFiles((f) => ({ ...f, [p]: (f[p] ?? '') + t })),
      onFileEnd: (p, content) => {
        setWriting(null);
        setFiles((f) => ({ ...f, [p]: content }));
        setDone((d) => ({ ...d, [p]: content }));
        setLive((s) => s && { ...s, changed: s.changed.includes(p) ? s.changed : [...s.changed, p] });
      },
      onFileRemoved: (p) => {
        const drop = (m: Record<string, string>) =>
          Object.fromEntries(Object.entries(m).filter(([k]) => k !== p));
        setFiles(drop);
        setDone(drop);
        setLive((s) => s && { ...s, removed: [...s.removed, p] });
      },
      onFileSkipped: (p, reason) => setError(`${p} was skipped: ${reason}`),
    });
    abort.current = null;
    setWriting(null);
    setLive(null);
    if (outcome.kind === 'done' || outcome.kind === 'error') {
      setApp(outcome.app);
      setFiles(toMap(outcome.app.files));
      setDone(toMap(outcome.app.files));
      setSelected((s) =>
        outcome.app.files.some((f) => f.path === s) ? s : (outcome.app.files[0]?.path ?? ''),
      );
      if (outcome.kind === 'error') setError(outcome.app.error ?? 'Building stopped.');
      else setTab('preview');
    } else if (outcome.kind === 'request-failed') {
      setError(outcome.error.message);
    } else {
      void refresh();
    }
  };

  const refresh = async () => {
    const { data } = await api.GET('/api/apps/{id}', { params: { path: { id: app.id } } });
    if (!data) return;
    setApp(data);
    setFiles(toMap(data.files));
    setDone(toMap(data.files));
  };

  const stop = async () => {
    abort.current?.abort();
    await api.POST('/api/apps/{id}/stop', { params: { path: { id: app.id } } });
  };

  const save = async () => {
    if (draft === null) return;
    const { data, error: err } = await api.PUT('/api/apps/{id}/files', {
      params: { path: { id: app.id } },
      body: { path: selected, content: draft },
    });
    if (!data) return setError(toApiError(err).message);
    setApp(data);
    setFiles(toMap(data.files));
    setDone(toMap(data.files));
    setDraft(null);
    setError('');
  };

  const remove = async () => {
    if (!selected || !window.confirm(`Delete ${selected}?`)) return;
    const res = await fetch(`/api/apps/${app.id}/files?path=${encodeURIComponent(selected)}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) return setError(toApiError(await res.json().catch(() => null)).message);
    const data = (await res.json()) as AppData;
    setApp(data);
    setFiles(toMap(data.files));
    setDone(toMap(data.files));
    setSelected(data.files[0]?.path ?? '');
    setDraft(null);
  };

  const steps: LiveStep[] = [...app.steps.map((s) => ({ ...s, running: false })), ...(live ? [live] : [])];

  return (
    <div className="apw">
      <div className="apw-head">
        <div className="apw-title">
          <h1 className="title-md">{app.name}</h1>
          <span className="apw-meta">
            {paths.length} {paths.length === 1 ? 'file' : 'files'} · {app.credits} credits used
          </span>
        </div>
        <div className="apw-actions">
          {paths.length === 0 || building ? (
            <Button variant="secondary" icon="download" disabled>
              Download .zip
            </Button>
          ) : (
            // A plain link: the browser downloads the file, no navigation inside the app.
            <a className="apw-dl" href={`/api/apps/${app.id}/zip`} download>
              <Icon name="download" size={16} />
              Download .zip
            </a>
          )}
        </div>
      </div>

      {error && <Banner tone="danger">{error}</Banner>}

      <div className="apw-tabs" role="tablist">
        {(['code', 'preview'] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className="apw-tab" onClick={() => setTab(t)}>
            {t === 'code' ? 'Code' : 'Preview'}
          </button>
        ))}
      </div>

      <div className="apw-split" data-tab={tab}>
        <section className="apw-code" aria-label="Code">
          <ul className="apw-tree">
            {paths.length === 0 && <li className="apw-none">No files yet. Tell Jack what to build below.</li>}
            {paths.map((p) => (
              <li key={p}>
                <button className="apw-file" aria-current={p === selected} onClick={() => select(p)}>
                  <Icon name={writing === p ? 'loader-circle' : 'file-text'} size={14} />
                  <span>{p}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="apw-editor">
            <div className="apw-editor-bar">
              <span>{selected ? `${selected} · ${languageOf(selected)}` : 'No file open'}</span>
              <span className="apw-editor-actions">
                {dirty && (
                  <Button size="sm" variant="primary" onClick={() => void save()}>
                    Save
                  </Button>
                )}
                {selected && !building && (
                  <Button size="sm" variant="ghost" icon="trash-2" onClick={() => void remove()}>
                    Delete
                  </Button>
                )}
              </span>
            </div>
            <textarea
              className="apw-text"
              spellCheck={false}
              aria-label={selected ? `Code of ${selected}` : 'Code'}
              value={shown}
              readOnly={building || !selected}
              onChange={(e) => setDraft(e.target.value)}
            />
          </div>
        </section>

        <section className="apw-preview" aria-label="Preview">
          <div className="apw-editor-bar">
            <span>Preview</span>
            <Button
              size="sm"
              variant="ghost"
              icon="refresh-cw"
              disabled={!html}
              onClick={() => setReload((n) => n + 1)}
            >
              Reload
            </Button>
          </div>
          {html ? (
            <iframe
              key={reload}
              className="apw-frame"
              title={`${app.name} preview`}
              sandbox="allow-scripts allow-forms allow-modals"
              srcDoc={html}
            />
          ) : (
            <div className="apw-blank">
              <Icon name="eye" size={24} />
              <span>The app appears here as soon as Jack has written its page.</span>
            </div>
          )}
        </section>
      </div>

      <section className="apw-steps" aria-label="Step by step">
        <h2 className="apw-steps-title">Step by step</h2>
        {steps.length === 0 ? (
          <p className="apw-none">Every change Jack makes is listed here, with the files it touched.</p>
        ) : (
          <ol className="apw-steplist">
            {steps.map((s, i) => (
              <li key={i} className="apw-step" data-running={s.running}>
                <b>{s.request}</b>
                {s.note && <p>{s.note}</p>}
                <span className="apw-chips">
                  {s.changed.map((p) => (
                    <button key={p} className="apw-chip" onClick={() => files[p] !== undefined && select(p)}>
                      {p}
                    </button>
                  ))}
                  {s.removed.map((p) => (
                    <span key={p} className="apw-chip apw-chip-removed">
                      {p} removed
                    </span>
                  ))}
                  {s.running && <span className="apw-chip">writing…</span>}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <form
        className="apw-composer"
        onSubmit={(e) => {
          e.preventDefault();
          void start();
        }}
      >
        <textarea
          className="apw-prompt"
          rows={2}
          maxLength={4000}
          placeholder={
            paths.length
              ? 'What should Jack change?'
              : 'What should Jack build? e.g. a tip calculator with a dark theme'
          }
          value={request}
          disabled={building}
          onChange={(e) => setRequest(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void start();
            }
          }}
        />
        {building ? (
          <Button variant="secondary" icon="square" onClick={() => void stop()}>
            Stop
          </Button>
        ) : (
          <Button variant="primary" icon="send" type="submit" disabled={!request.trim()}>
            {paths.length ? 'Change' : 'Build'}
          </Button>
        )}
      </form>
    </div>
  );
}

const toMap = (files: { path: string; content: string }[]) =>
  Object.fromEntries(files.map((f) => [f.path, f.content]));
