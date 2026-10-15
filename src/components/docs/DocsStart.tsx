'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Banner, Button, Chip, Icon, IconButton, Tabs, cx } from '@/ui';
import { Composer } from '@/components/composer/Composer';
import { ModelPicker } from '@/components/models/ModelPicker';
import { useShellCrumbs } from '@/components/shell/crumbs';
import { api } from '@/lib/api/client';
import { toApiError } from '@/lib/api/errors';
import type { ModelMenu } from '@/lib/models';
import {
  LENGTH_OPTIONS,
  MAIN_TYPES,
  POPULAR,
  TEMPLATES,
  TONE_OPTIONS,
  TYPE_INFO,
  type DocLength,
  type DocTone,
  type DocType,
  type Estimates,
  type Section,
  type Template,
} from '@/lib/docs/types';
import './docs.css';

interface OutlineState {
  type: DocType;
  brief: string;
  title: string;
  sections: Section[];
  /** Where the outline came from, for the eyebrow ("New proposal", "Template"). */
  from: 'ai' | 'template';
}

let keySeq = 0;
const withKeys = (s: Section[]) => s.map((x) => ({ ...x, key: ++keySeq }));

/**
 * AI Docs start: describe the document (or pick a type or template), check the outline,
 * then write it. Designs: DocsFlow landing → outline.
 */
export function DocsStart({ menu, credits }: { menu: ModelMenu; credits: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const [type, setType] = useState<DocType>('proposal');
  const [brief, setBrief] = useState('');
  const [model, setModel] = useState(menu.selected);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [outline, setOutline] = useState<OutlineState | null>(null);

  useShellCrumbs({
    path: pathname,
    items: outline
      ? [{ label: 'Docs', href: '/docs' }, { label: `New ${TYPE_INFO[outline.type].label.toLowerCase()}` }]
      : [{ label: 'Docs' }],
  });

  const askOutline = async (text: string) => {
    setError('');
    setBusy(true);
    const { data, error: err } = await api.POST('/api/docs/outline', { body: { brief: text, type, model } });
    setBusy(false);
    if (!data) {
      setError(toApiError(err).message);
      return false;
    }
    setBrief(text);
    setOutline({ type, brief: text, title: data.title, sections: data.sections, from: 'ai' });
    router.refresh(); // the outline used a credit
  };

  const useTemplate = (t: Template) => {
    setError('');
    setType(t.type);
    setOutline({
      type: t.type,
      brief: brief,
      title: t.docTitle,
      sections: t.sections.map((h) => ({ heading: h, note: 'From the template' })),
      from: 'template',
    });
  };

  const blank = async () => {
    setBusy(true);
    const { data, error: err } = await api.POST('/api/docs', {
      body: { title: 'Untitled document', type: 'other', sections: [] },
    });
    setBusy(false);
    if (!data) return setError(toApiError(err).message);
    router.push(`/docs/${data.id}`);
  };

  if (outline)
    return (
      <OutlineStep
        initial={outline}
        menu={menu}
        model={model}
        onModelChange={setModel}
        credits={credits}
        onBack={() => setOutline(null)}
      />
    );

  return (
    <div className="dk">
      <div className="dk-main">
        <h1 className="title-lg dk-title">What would you like to write?</h1>
        <p className="dk-sub">
          Describe it, add any files to use, and we’ll draft an outline for you to check first.
        </p>
        {error && (
          <Banner tone="danger" onDismiss={() => setError('')}>
            {error}
          </Banner>
        )}
        <Composer
          menu={menu}
          model={model}
          onModelChange={setModel}
          connectors={false}
          modeChip={false}
          placeholder="e.g. A proposal for a six-week website relaunch for a roofing company"
          label="Describe your document"
          text={brief}
          onTextChange={setBrief}
          disabled={busy}
          onSend={askOutline}
          className="dk-composer"
        />

        {busy && (
          <p className="dk-busy" role="status">
            <Icon name="loader-circle" size={16} className="as-spin" />
            Drafting an outline to check…
          </p>
        )}

        <section aria-labelledby="dk-types">
          <h2 id="dk-types" className="dk-label">
            Type of document
          </h2>
          <div className="dk-types" role="radiogroup" aria-labelledby="dk-types">
            {MAIN_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={type === t}
                className={cx('dk-type', type === t && 'on')}
                onClick={() => setType(t)}
              >
                <Icon name={TYPE_INFO[t].icon} size={18} />
                <b>{TYPE_INFO[t].label}</b>
                <span>{TYPE_INFO[t].hint}</span>
              </button>
            ))}
          </div>
        </section>

        <section aria-labelledby="dk-popular">
          <h2 id="dk-popular" className="dk-ov">
            Popular
          </h2>
          <div className="dk-popular">
            {POPULAR.map((p) => (
              <button
                key={p.label}
                type="button"
                className="as-row"
                onClick={() => {
                  setType(p.type);
                  setBrief(p.brief);
                  requestAnimationFrame(() => {
                    const el = document.querySelector<HTMLTextAreaElement>('.dk-composer textarea');
                    el?.focus();
                    el?.setSelectionRange(el.value.length, el.value.length);
                  });
                }}
              >
                <Icon name={p.icon} size={18} className="lead" />
                <span className="txt">{p.label}</span>
                <Icon name="arrow-right" size={18} className="trail" />
              </button>
            ))}
          </div>
        </section>
      </div>

      <Templates onPick={useTemplate} onBlank={() => void blank()} />
    </div>
  );
}

function Templates({ onPick, onBlank }: { onPick: (t: Template) => void; onBlank: () => void }) {
  const [group, setGroup] = useState('All');
  const shown = group === 'All' ? TEMPLATES : TEMPLATES.filter((t) => t.group === group);
  return (
    <aside className="dk-side" aria-labelledby="dk-tpl">
      <div className="dk-side-head">
        <h2 id="dk-tpl">Start from a template</h2>
        <Link href="/docs/all" className="dk-link">
          Your documents
        </Link>
      </div>
      <Tabs
        label="Template group"
        value={group}
        onChange={setGroup}
        items={['All', 'Business', 'Marketing', 'Personal'].map((g) => ({ value: g, label: g }))}
      />
      <div className="dk-tpls">
        {group === 'All' && (
          <button type="button" className="dk-tpl blank" onClick={onBlank}>
            <Icon name="plus" size={20} />
            <b>Blank document</b>
          </button>
        )}
        {shown.map((t) => (
          <button key={t.id} type="button" className="dk-tpl" onClick={() => onPick(t)}>
            <span className="thumb">
              <Icon name={t.icon} size={28} strokeWidth={1.5} />
            </span>
            <span className="txt">
              <b>{t.title}</b>
              <span>{t.hint}</span>
            </span>
          </button>
        ))}
      </div>
    </aside>
  );
}

function OutlineStep({
  initial,
  menu,
  model,
  onModelChange,
  credits,
  onBack,
}: {
  initial: OutlineState;
  menu: ModelMenu;
  model: string;
  onModelChange: (m: string) => void;
  credits: number;
  onBack: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initial.title);
  const [sections, setSections] = useState(() => withKeys(initial.sections));
  const [length, setLength] = useState<DocLength>('medium');
  const [tone, setTone] = useState<DocTone>('professional');
  const [estimates, setEstimates] = useState<Estimates | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const added = useRef<number | null>(null);

  useEffect(() => {
    let live = true;
    void api.GET('/api/docs/estimates', { params: { query: { model } } }).then(({ data }) => {
      if (live && data) setEstimates(data);
    });
    return () => {
      live = false;
    };
  }, [model]);

  // Focus a heading that was just added.
  useEffect(() => {
    if (added.current === null) return;
    document.querySelector<HTMLInputElement>(`[data-key="${added.current}"]`)?.focus();
    added.current = null;
  }, [sections]);

  const est = estimates?.[length];
  const enough = est ? credits >= est.credits : true;
  const valid = title.trim() && sections.length > 0 && sections.every((s) => s.heading.trim());
  const typeLabel = TYPE_INFO[initial.type].label;

  const move = (i: number, d: -1 | 1) =>
    setSections((s) => {
      const j = i + d;
      if (j < 0 || j >= s.length) return s;
      const next = [...s];
      [next[i], next[j]] = [next[j]!, next[i]!];
      return next;
    });

  const write = async () => {
    setBusy(true);
    setError('');
    const { data, error: err } = await api.POST('/api/docs', {
      body: {
        title: title.trim(),
        type: initial.type,
        brief: initial.brief,
        sections: sections.map((s) => ({ heading: s.heading.trim(), note: s.note })),
        length,
        tone,
        model,
      },
    });
    if (!data) {
      setBusy(false);
      setError(toApiError(err).message);
      return;
    }
    router.push(`/docs/${data.id}`);
  };

  const minutes = useMemo(
    () =>
      length === 'short' ? 'under a minute' : length === 'medium' ? 'about 1 minute' : 'about 2 minutes',
    [length],
  );

  return (
    <div className="do">
      <div className="do-col">
        <div className="do-eyebrow">New {typeLabel.toLowerCase()} · Step 1 of 2</div>
        <h1 className="do-title">Check the outline</h1>
        <p className="do-sub">
          We’ll write one section for each heading. Rename, remove, reorder or add headings before we start.
        </p>

        <div className="do-card">
          <label className="do-field-label" htmlFor="do-title">
            Title
          </label>
          <input
            id="do-title"
            className="do-title-input"
            value={title}
            maxLength={200}
            onChange={(e) => setTitle(e.target.value)}
          />
          <ol className="do-sections" aria-label="Headings">
            {sections.map((s, i) => (
              <li key={s.key} className="do-row">
                <span className="n" aria-hidden>
                  {i + 1}
                </span>
                <input
                  data-key={s.key}
                  aria-label={`Heading ${i + 1}`}
                  value={s.heading}
                  maxLength={120}
                  placeholder="Heading"
                  onChange={(e) =>
                    setSections((all) =>
                      all.map((x) => (x.key === s.key ? { ...x, heading: e.target.value } : x)),
                    )
                  }
                />
                {s.note && <span className="note">{s.note}</span>}
                <IconButton
                  icon="chevron-up"
                  size="sm"
                  label={`Move ${s.heading || 'heading'} up`}
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                />
                <IconButton
                  icon="chevron-down"
                  size="sm"
                  label={`Move ${s.heading || 'heading'} down`}
                  disabled={i === sections.length - 1}
                  onClick={() => move(i, 1)}
                />
                <IconButton
                  icon="x"
                  size="sm"
                  label={`Remove ${s.heading || 'heading'}`}
                  disabled={sections.length === 1}
                  onClick={() => setSections((all) => all.filter((x) => x.key !== s.key))}
                />
              </li>
            ))}
          </ol>
          {sections.length < 12 && (
            <button
              type="button"
              className="do-add"
              onClick={() => {
                const [n] = withKeys([{ heading: '', note: 'Added by you' }]);
                added.current = n!.key;
                setSections((all) => [...all, n!]);
              }}
            >
              <Icon name="plus" size={16} />
              Add a heading
            </button>
          )}
        </div>

        <div className="do-options">
          <div>
            <div className="do-field-label">Length</div>
            <Tabs
              variant="segmented"
              label="Length"
              value={length}
              onChange={(v) => setLength(v as DocLength)}
              items={LENGTH_OPTIONS}
            />
          </div>
          <div>
            <div className="do-field-label" id="do-tone">
              Tone
            </div>
            <div className="do-chips" role="radiogroup" aria-labelledby="do-tone">
              {TONE_OPTIONS.map((t) => (
                <Chip
                  key={t.value}
                  shape="tag"
                  selected={tone === t.value}
                  role="radio"
                  aria-checked={tone === t.value}
                  onClick={() => setTone(t.value)}
                >
                  {t.label}
                </Chip>
              ))}
            </div>
          </div>
        </div>

        <div className="do-summary" aria-live="polite">
          <span>
            About <b>{(est?.words ?? 0).toLocaleString('en-US')} words</b>
          </span>
          <span>
            Takes <b>{minutes}</b>
          </span>
          <span>
            Costs about <b>{est ? `${est.credits} credits` : '…'}</b> · you have{' '}
            {credits.toLocaleString('en-US')}
          </span>
        </div>
        {!enough && (
          <Banner tone="warning" actionLabel="Top up" onAction={() => router.push('/settings/billing')}>
            You don’t have enough credits for a {length} document. Try Short, or top up.
          </Banner>
        )}
        {error && (
          <Banner tone="danger" onDismiss={() => setError('')}>
            {error}
          </Banner>
        )}

        <div className="do-foot">
          <Button
            variant="primary"
            icon="sparkles"
            loading={busy}
            disabled={!valid || !enough}
            onClick={() => void write()}
          >
            Write the document
          </Button>
          <Button variant="ghost" onClick={onBack} disabled={busy}>
            Back
          </Button>
          <span className="spacer" />
          <ModelPicker menu={menu} value={model} onChange={onModelChange} />
        </div>
      </div>
    </div>
  );
}
