'use client';
import { useState } from 'react';
import { Button, Dialog, Icon, cx } from '@/ui';

export type ExportFormat = 'docx' | 'pdf' | 'md';

const FORMATS: { value: ExportFormat; label: string; desc: string; name: string }[] = [
  {
    value: 'docx',
    label: 'Word document (.docx)',
    desc: 'Keeps headings, lists and tables',
    name: 'Word file',
  },
  { value: 'pdf', label: 'PDF', desc: 'For sending or printing — can’t be edited', name: 'PDF' },
  { value: 'md', label: 'Markdown (.md)', desc: 'Plain text with formatting marks', name: 'Markdown file' },
];

type Phase =
  | { kind: 'idle' }
  | { kind: 'busy' }
  | { kind: 'done'; file: string; detail: string; blob: Blob }
  | { kind: 'error'; message: string };

/**
 * Export (owner) or Download (shared): Word, PDF or Markdown (design: DocsFlow export).
 * The file is made on the server; exports don't use credits.
 */
export function ExportDialog({
  open,
  onClose,
  title,
  url,
  download = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  /** `/api/docs/{id}/export` or `/api/public/docs/{token}/export`. */
  url: string;
  /** People it was shared with see "Download". */
  download?: boolean;
}) {
  const [format, setFormat] = useState<ExportFormat>('docx');
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const fmt = FORMATS.find((f) => f.value === format)!;

  const close = () => {
    onClose();
    setPhase({ kind: 'idle' });
  };

  const run = async () => {
    setPhase({ kind: 'busy' });
    try {
      const res = await fetch(`${url}?format=${format}`, { credentials: 'include' });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
        throw new Error(body?.error?.message ?? 'The export didn’t work. Try again.');
      }
      const blob = await res.blob();
      const file = fileName(res.headers.get('content-disposition')) ?? `${title}.${format}`;
      const pages = res.headers.get('x-export-pages');
      save(blob, file);
      setPhase({
        kind: 'done',
        file,
        blob,
        detail: [pages && `${pages} page${pages === '1' ? '' : 's'}`, size(blob.size), 'downloaded']
          .filter(Boolean)
          .join(' · '),
      });
    } catch (e) {
      setPhase({ kind: 'error', message: e instanceof Error ? e.message : 'The export didn’t work.' });
    }
  };

  return (
    <Dialog
      open={open}
      title={download ? 'Download' : 'Export'}
      description={`“${title}”`}
      width={520}
      onClose={close}
      footer={
        phase.kind === 'done' ? (
          <>
            <Button variant="ghost" onClick={close}>
              Close
            </Button>
            <Button variant="primary" icon="download" onClick={() => save(phase.blob, phase.file)}>
              Download again
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button
              variant="primary"
              icon="download"
              loading={phase.kind === 'busy'}
              onClick={() => void run()}
            >
              {download ? 'Download' : 'Export'}
            </Button>
          </>
        )
      }
    >
      {phase.kind === 'busy' ? (
        <div className="dx-job" role="status">
          <span className="dx-job-ic">
            <Icon name="loader-circle" size={18} className="as-spin" />
          </span>
          <span className="dx-job-txt">
            <b>Making your {fmt.name}</b>
            <span>Usually a few seconds · exports don’t use credits</span>
          </span>
          <span className="dx-bar" aria-hidden>
            <i />
          </span>
        </div>
      ) : phase.kind === 'done' ? (
        <div className="dx-job done" role="status">
          <span className="dx-job-ic">
            <Icon name="circle-check" size={18} />
          </span>
          <span className="dx-job-txt">
            <b>{phase.file}</b>
            <span>{phase.detail}</span>
          </span>
        </div>
      ) : (
        <>
          <div className="ds-radios" role="radiogroup" aria-label="Format">
            {FORMATS.map((f) => (
              <button
                key={f.value}
                type="button"
                role="radio"
                aria-checked={format === f.value}
                className="ds-radio"
                onClick={() => setFormat(f.value)}
              >
                <span className={cx('ds-dot', format === f.value && 'on')} aria-hidden />
                <span>
                  <b>{f.label}</b>
                  <span>{f.desc}</span>
                </span>
              </button>
            ))}
          </div>
          {phase.kind === 'error' && (
            <p className="dx-err" role="alert">
              {phase.message}
            </p>
          )}
        </>
      )}
    </Dialog>
  );
}

function save(blob: Blob, name: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
}

/** The UTF-8 file name from Content-Disposition (falls back to the plain one). */
function fileName(cd: string | null): string | null {
  if (!cd) return null;
  const star = /filename\*=UTF-8''([^;]+)/i.exec(cd);
  if (star) return decodeURIComponent(star[1]!);
  return /filename="([^"]+)"/i.exec(cd)?.[1] ?? null;
}

function size(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
