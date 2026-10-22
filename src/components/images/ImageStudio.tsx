'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { Schemas } from '@/lib/api/client';
import { Banner, Button, Chip, Dialog, Icon, IconButton, Tabs, cx } from '@/ui';
import { ModelPicker } from '@/components/models/ModelPicker';
import { useShellCrumbs } from '@/components/shell/crumbs';
import { api } from '@/lib/api/client';
import { toApiError, type ApiError } from '@/lib/api/errors';
import {
  COUNTS,
  MAX_PROMPT,
  RATIOS,
  STYLES,
  SUGGESTIONS,
  modelFor,
  type ImageBatch,
  type ImageRatio,
  type ImageStyle,
} from '@/lib/images/types';
import type { ModelMenu } from '@/lib/models';
import {
  EditPanel,
  ImprovedPrompt,
  MaskCanvas,
  ProToolsDialog,
  ReferenceRow,
  TOOL_TEXT,
  uploadReference,
  type MaskHandle,
  type Reference,
} from './ImageExtras';
import './images.css';
import { VoiceField } from '@/components/voice/Voice';

type Caps = Schemas['ImageCapabilitiesDto'];
type ToolKind = 'edit' | 'upscale' | 'cutout';

const POLL_MS = 1500;

/**
 * AI Image studio (design: ImageFlow): settings on the left, the image in the middle,
 * details on the right. Images arrive in the background; the page checks for them.
 */
export function ImageStudio({
  menu,
  credits,
  caps,
  initial,
  initialIndex = 0,
  saved,
}: {
  menu: ModelMenu;
  credits: number;
  caps: Caps;
  initial: ImageBatch | null;
  /** The image to show first (from ?i= in the gallery link). */
  initialIndex?: number;
  /** Set when arriving from "Keep …" on the previous image (?saved=edit), to confirm it here. */
  saved?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [prompt, setPrompt] = useState(initial?.prompt ?? '');
  const [model, setModel] = useState(initial?.requestedModel ?? menu.selected);
  const [ratio, setRatio] = useState<ImageRatio>(initial?.ratio ?? '1:1');
  const [count, setCount] = useState<number>(initial?.count ?? 1);
  const [hd, setHd] = useState(initial?.hd ?? false);
  const [style, setStyle] = useState<ImageStyle>(initial?.style ?? 'photo');
  const [negative, setNegative] = useState(initial?.negative ?? '');
  const [batch, setBatch] = useState<ImageBatch | null>(initial);
  const [selected, setSelected] = useState(initialIndex);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const promptRef = useRef<HTMLTextAreaElement>(null);

  /* Extras: reference, improve prompt, edit, variations, upscale, remove background */
  const [reference, setReference] = useState<Reference | null>(null);
  const [refError, setRefError] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const [improved, setImproved] = useState<{ text: string | null } | null>(null);
  const [mode, setMode] = useState<'view' | 'edit' | 'result'>('view');
  const [brush, setBrush] = useState<'box' | 'brush'>('box');
  const [editText, setEditText] = useState('');
  const [hasMask, setHasMask] = useState(false);
  const mask = useRef<MaskHandle>(null);
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);
  const [result, setResult] = useState<{ kind: ToolKind; batch: ImageBatch } | null>(null);
  const [proDialog, setProDialog] = useState(false);
  const [toolBusy, setToolBusy] = useState(false);
  const [toast, setToast] = useState(() =>
    saved && saved in TOOL_TEXT ? TOOL_TEXT[saved as keyof typeof TOOL_TEXT].done : '',
  );
  // Tidy the address so a reload doesn't confirm it again.
  useEffect(() => {
    if (saved) window.history.replaceState(window.history.state, '', window.location.pathname);
  }, [saved]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  useShellCrumbs({
    path: pathname,
    items: [{ label: 'Images', href: '/image/all' }, { label: batch?.title ?? 'New image' }],
    back: '/image/all',
  });

  // While images are being made, check for them.
  const generating = batch?.status === 'generating';
  const batchId = batch?.id;
  useEffect(() => {
    if (!generating || !batchId) return;
    const t = setInterval(async () => {
      const { data } = await api.GET('/api/images/{id}', { params: { path: { id: batchId } } });
      if (!data) return;
      setBatch(data);
      if (data.status !== 'generating') router.refresh(); // credits in the sidebar
    }, POLL_MS);
    return () => clearInterval(t);
  }, [generating, batchId, router]);

  // The result of an edit, upscale or cut-out: check until it's ready.
  const resultId = result?.batch.status === 'generating' ? result.batch.id : null;
  useEffect(() => {
    if (!resultId) return;
    const t = setInterval(async () => {
      const { data } = await api.GET('/api/images/{id}', { params: { path: { id: resultId } } });
      if (!data) return;
      setResult((r) => (r && r.batch.id === data.id ? { ...r, batch: data } : r));
      if (data.status !== 'generating') router.refresh();
    }, 1000);
    return () => clearInterval(t);
  }, [resultId, router]);

  // With a reference image, Auto uses the model that takes an image as input.
  const target: { name: string; credits: number } | null =
    reference && model === 'auto' ? caps.editModel : modelFor(menu, model, style);
  const cost = (target?.credits ?? 0) * count;
  const enough = credits >= cost;
  const canApplyEdit =
    hasMask && editText.trim().length >= 2 && !!caps.editModel && credits >= (caps.editModel?.credits ?? 0);
  const blocked = batch?.status === 'blocked' && batch.prompt === prompt.trim() ? batch.error?.message : null;

  const generate = async () => {
    setBusy(true);
    setError(null);
    const { data, error: err } = await api.POST('/api/images', {
      body: {
        prompt: prompt.trim(),
        model,
        ratio,
        count: count as 1 | 2 | 4,
        hd,
        style,
        negative: negative.trim() || undefined,
        reference: reference ? { id: reference.id, use: reference.use } : undefined,
      },
    });
    setBusy(false);
    if (!data) {
      setError(toApiError(err));
      return;
    }
    setBatch(data);
    setSelected(0);
    router.push(`/image/${data.id}`);
  };

  const pickReference = async (file: File | undefined) => {
    if (!file) return;
    setRefError('');
    setUploading(true);
    const r = await uploadReference(file);
    setUploading(false);
    if (r.error) setRefError(r.error);
    else if (r.ref) setReference(r.ref);
  };

  const improve = async () => {
    if (!prompt.trim()) {
      setToast('Write a few words first');
      return;
    }
    setImproved({ text: null });
    const { data, error: err } = await api.POST('/api/images/improve', {
      body: { prompt: prompt.trim(), style },
    });
    if (data) setImproved({ text: data.prompt });
    else {
      setImproved(null);
      setError(toApiError(err));
    }
  };

  const runTool = async (kind: ToolKind | 'variations') => {
    if (!batch || !current) return;
    if ((kind === 'upscale' || kind === 'cutout') && !caps.toolsIncluded) {
      setProDialog(true);
      return;
    }
    setToolBusy(true);
    setError(null);
    const path = { params: { path: { id: batch.id } } };
    const index = current.index;
    const res =
      kind === 'variations'
        ? await api.POST('/api/images/{id}/variations', { ...path, body: { index } })
        : kind === 'upscale'
          ? await api.POST('/api/images/{id}/upscale', { ...path, body: { index } })
          : kind === 'cutout'
            ? await api.POST('/api/images/{id}/remove-background', { ...path, body: { index } })
            : await api.POST('/api/images/{id}/edit', {
                ...path,
                body: { index, prompt: editText.trim(), mask: mask.current?.toPng() ?? '', model: 'auto' },
              });
    setToolBusy(false);
    if (!res.data) {
      setError(toApiError(res.error));
      return;
    }
    if (kind === 'variations') {
      router.push(`/image/${res.data.id}`);
      return;
    }
    setResult({ kind, batch: res.data });
    setMode('result');
  };

  const leaveResult = async (keep: boolean) => {
    if (!result) return;
    if (keep) {
      router.push(`/image/${result.batch.id}?saved=${result.kind}`);
      return;
    }
    if (result.batch.status === 'generating')
      await api.POST('/api/images/{id}/cancel', { params: { path: { id: result.batch.id } } });
    await api.DELETE('/api/images/{id}', { params: { path: { id: result.batch.id } } });
    setResult(null);
    setMode('view');
    router.refresh();
  };

  const images = batch?.images ?? [];
  const current = images[selected] ?? images[0];
  const ready = images.filter((i) => i.status === 'done').length;
  const failed = images.filter((i) => i.status === 'failed').length;
  const cancelled = images.filter((i) => i.status === 'cancelled').length;

  return (
    <div className="is">
      <header className="is-header">
        <nav aria-label="Breadcrumb" className="is-crumb">
          <Link href="/image/all">Images</Link>
          <span className="sep" aria-hidden>
            /
          </span>
          <span aria-current="page">{batch?.title ?? 'New image'}</span>
        </nav>
        <Link href="/image/all" className="as-btn ghost sm">
          <Icon name="layout-dashboard" size={16} />
          All images
        </Link>
        <Link href="/approvals" className="as-iconbtn" aria-label="Approvals" title="Approvals">
          <Icon name="bell" size={20} />
        </Link>
      </header>

      <div className={cx('is-body', batch && 'has-batch')}>
        {/* ── Settings ── */}
        <form
          className="is-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (mode === 'edit') {
              if (canApplyEdit) void runTool('edit');
            } else if (prompt.trim().length >= 3 && enough && !busy) void generate();
          }}
        >
          <div className="is-scroll">
            {mode === 'edit' ? (
              <EditPanel
                brush={brush}
                onBrush={setBrush}
                text={editText}
                onText={setEditText}
                onBack={() => setMode('view')}
              />
            ) : (
              <>
                <div className="is-row">
                  <label htmlFor="is-prompt" className="is-label">
                    Describe your image
                  </label>
                  <ModelPicker
                    menu={menu}
                    value={model}
                    onChange={setModel}
                    align="end"
                    footNote="Credits are per image."
                  />
                </div>
                <div className={cx('is-prompt', blocked && 'error')}>
                  <VoiceField value={prompt} onChange={setPrompt} maxLength={MAX_PROMPT}>
                    <textarea
                      id="is-prompt"
                      ref={promptRef}
                      rows={4}
                      maxLength={MAX_PROMPT}
                      placeholder="What do you want to see? Describe the subject, setting, light and style."
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey))
                          e.currentTarget.form?.requestSubmit();
                      }}
                    />
                  </VoiceField>
                  {reference && (
                    <ReferenceRow
                      reference={reference}
                      onUse={(use) => setReference({ ...reference, use })}
                      onRemove={() => setReference(null)}
                    />
                  )}
                  {refError && (
                    <div className="is-ref-error" role="alert">
                      <Icon name="circle-alert" size={14} /> {refError}
                    </div>
                  )}
                  <div className="is-prompt-foot">
                    {caps.reference && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          icon="image"
                          loading={uploading}
                          onClick={() => fileInput.current?.click()}
                        >
                          Reference
                        </Button>
                        <input
                          ref={fileInput}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          hidden
                          onChange={(e) => {
                            void pickReference(e.target.files?.[0]);
                            e.target.value = '';
                          }}
                        />
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      icon="wand-sparkles"
                      disabled={improved?.text === null}
                      onClick={() => void improve()}
                    >
                      Improve prompt
                    </Button>
                    <span className="is-chars">
                      {prompt.length} / {MAX_PROMPT.toLocaleString('en-US')}
                    </span>
                  </div>
                </div>
                {improved && (
                  <ImprovedPrompt
                    text={improved.text}
                    onUse={() => {
                      if (improved.text) setPrompt(improved.text);
                      setImproved(null);
                    }}
                    onKeep={() => setImproved(null)}
                  />
                )}
                {blocked && (
                  <div className="is-blocked" role="alert">
                    <Icon name="shield-alert" size={18} />
                    <span>{blocked} You weren’t charged.</span>
                  </div>
                )}

                <fieldset className="is-field">
                  <legend className="is-label">Shape</legend>
                  <div className="is-ratios">
                    {RATIOS.map((r) => (
                      <button
                        key={r.value}
                        type="button"
                        className={cx('is-ratio', ratio === r.value && 'on')}
                        aria-pressed={ratio === r.value}
                        onClick={() => setRatio(r.value)}
                      >
                        <span className="box" style={{ width: r.w, height: r.h }} aria-hidden />
                        {r.label}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <div className="is-two">
                  <div>
                    <div className="is-label">How many</div>
                    <Tabs
                      variant="segmented"
                      label="How many"
                      value={String(count)}
                      onChange={(v) => setCount(Number(v))}
                      items={COUNTS.map((c) => ({ value: String(c), label: String(c) }))}
                    />
                  </div>
                  <div>
                    <div className="is-label">Size</div>
                    <Tabs
                      variant="segmented"
                      label="Size"
                      value={hd ? 'hd' : 'standard'}
                      onChange={(v) => setHd(v === 'hd')}
                      items={[
                        { value: 'standard', label: 'Standard' },
                        { value: 'hd', label: 'HD' },
                      ]}
                    />
                  </div>
                </div>

                <fieldset className="is-field">
                  <legend className="is-label">Style</legend>
                  <div className="is-styles">
                    {STYLES.map((s) => (
                      <Chip
                        key={s.value}
                        shape="tag"
                        selected={style === s.value}
                        onClick={() => setStyle(s.value)}
                      >
                        {s.label}
                      </Chip>
                    ))}
                  </div>
                </fieldset>

                <div className="is-field">
                  <label htmlFor="is-neg" className="is-label">
                    Leave out <span className="muted">(optional)</span>
                  </label>
                  <VoiceField value={negative} onChange={setNegative} maxLength={300}>
                    <input
                      id="is-neg"
                      className="is-input"
                      maxLength={300}
                      placeholder="e.g. text, people, clutter"
                      value={negative}
                      onChange={(e) => setNegative(e.target.value)}
                    />
                  </VoiceField>
                </div>
              </>
            )}

            {error && (
              <Banner
                tone="danger"
                onDismiss={() => setError(null)}
                actionLabel={error.code === 'insufficient_credits' ? 'Top up' : undefined}
                onAction={() => router.push('/settings/billing')}
              >
                {error.message}
              </Banner>
            )}
          </div>

          <div className="is-foot">
            <div className="is-cost">
              <span>
                {mode === 'edit'
                  ? `About ${caps.editModel?.credits ?? '—'} credits for this edit`
                  : target
                    ? `About ${cost} credits · ${count} × ${target.name}`
                    : menu.models.length
                      ? 'Image models come with Jack Personal'
                      : 'No image model is set up yet'}
              </span>
              <span className={cx('muted', !enough && 'short')}>
                {enough
                  ? `${credits.toLocaleString('en-US')} available`
                  : `You have ${credits.toLocaleString('en-US')}`}
              </span>
            </div>
            {mode === 'edit' ? (
              <Button
                type="submit"
                variant="primary"
                icon="wand-sparkles"
                loading={toolBusy}
                disabled={!canApplyEdit}
              >
                Apply edit
              </Button>
            ) : (
              <Button
                type="submit"
                variant="primary"
                icon="sparkles"
                loading={busy || generating}
                disabled={prompt.trim().length < 3 || !enough || !target}
              >
                {generating ? 'Generating…' : batch ? 'Generate again' : 'Generate'}
              </Button>
            )}
          </div>
        </form>

        {/* ── Canvas ── */}
        <section className="is-canvas" aria-label="Images">
          {!batch ? (
            <div className="is-empty">
              <Icon name="image" size={36} strokeWidth={1.5} />
              <h2>Your images appear here</h2>
              <p>Describe what you want, or start from one of these.</p>
              <div className="is-suggest">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.text}
                    type="button"
                    className="as-row"
                    onClick={() => {
                      setPrompt(s.text);
                      setStyle(s.style);
                      promptRef.current?.focus();
                    }}
                  >
                    <Icon name={s.icon} size={18} className="lead" />
                    <span className="txt">{s.text}</span>
                    <Icon name="arrow-right" size={18} className="trail" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="is-result">
              {mode === 'edit' ? (
                <div className="is-tools">
                  <IconButton
                    icon="rotate-ccw"
                    size="sm"
                    label="Undo selection"
                    disabled={!hasMask}
                    onClick={() => mask.current?.clear()}
                  />
                  <Button size="sm" variant="ghost" icon="x" onClick={() => setMode('view')}>
                    Cancel edit
                  </Button>
                </div>
              ) : mode === 'result' && result ? (
                <div className="is-tools">
                  <Button size="sm" variant="ghost" icon="x" onClick={() => void leaveResult(false)}>
                    Discard
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    icon="check"
                    disabled={result.batch.status !== 'done'}
                    onClick={() => void leaveResult(true)}
                  >
                    {TOOL_TEXT[result.kind].keep}
                  </Button>
                </div>
              ) : (
                current?.status === 'done' &&
                current.url && (
                  <div className="is-tools">
                    {caps.variations && (
                      <Button
                        size="sm"
                        variant="ghost"
                        icon="sparkles"
                        disabled={toolBusy}
                        onClick={() => void runTool('variations')}
                      >
                        Variations
                      </Button>
                    )}
                    {caps.edit && (
                      <Button
                        size="sm"
                        variant="ghost"
                        icon="pen-line"
                        onClick={() => {
                          setHasMask(false);
                          setMode('edit');
                        }}
                      >
                        Edit
                      </Button>
                    )}
                    {caps.upscale && (
                      <Button
                        size="sm"
                        variant="ghost"
                        icon="zap"
                        disabled={toolBusy}
                        onClick={() => void runTool('upscale')}
                      >
                        Upscale
                      </Button>
                    )}
                    {caps.removeBackground && (
                      <Button
                        size="sm"
                        variant="ghost"
                        icon="wand-sparkles"
                        disabled={toolBusy}
                        onClick={() => void runTool('cutout')}
                      >
                        Remove background
                      </Button>
                    )}
                    <DownloadMenu batch={batch} index={current.index} />
                    <IconButton
                      icon="trash-2"
                      size="sm"
                      label="Delete these images"
                      onClick={() => setConfirmDelete(true)}
                    />
                  </div>
                )
              )}
              {mode === 'result' && result ? (
                <ResultStage result={result} />
              ) : (
                <div className="is-stage" style={{ aspectRatio: batch.ratio.replace(':', ' / ') }}>
                  {current?.status === 'done' && current.url ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element -- served by the API with auth */}
                      <img src={current.url} alt={batch.prompt} ref={setImgEl} />
                      {mode === 'edit' && (
                        <MaskCanvas ref={mask} img={imgEl} mode={brush} onChange={setHasMask} />
                      )}
                      {mode !== 'edit' && (
                        <span className="is-dims">
                          {current.width} × {current.height} · PNG
                        </span>
                      )}
                    </>
                  ) : (
                    <div className="is-stage-msg">
                      {batch.status === 'blocked' ? (
                        <>
                          <Icon name="shield-alert" size={24} />
                          <span>{batch.error?.message}</span>
                        </>
                      ) : current?.status === 'waiting' ? (
                        <>
                          <Icon name="loader-circle" size={24} className="as-spin" />
                          <span>Making your image…</span>
                        </>
                      ) : (
                        <>
                          <Icon name="circle-alert" size={24} />
                          <span>
                            {current?.status === 'cancelled'
                              ? 'Cancelled · not charged'
                              : 'Didn’t finish · not charged'}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {batch.status !== 'blocked' && mode === 'view' && (
                <>
                  <div className="is-batch-head">
                    <h2 className="is-ov">This batch</h2>
                    <span className="muted">
                      {generating
                        ? `${ready} of ${batch.count} ready`
                        : `${ready} ${ready === 1 ? 'image' : 'images'}${batch.modelName ? ` · ${batch.modelName}` : ''}${failed ? ` · ${failed} didn’t finish` : ''}${cancelled ? ` · ${cancelled} cancelled` : ''}`}
                    </span>
                    {generating && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          const { data } = await api.POST('/api/images/{id}/cancel', {
                            params: { path: { id: batch.id } },
                          });
                          if (data) setBatch(data);
                        }}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                  <div className="is-strip" role="listbox" aria-label="Images in this batch">
                    {images.map((img, i) => (
                      <button
                        key={i}
                        type="button"
                        role="option"
                        aria-selected={i === (current?.index ?? 0)}
                        className={cx(
                          'is-thumb',
                          i === (current?.index ?? 0) && 'on',
                          img.status !== 'done' && img.status,
                        )}
                        style={{ aspectRatio: batch.ratio.replace(':', ' / ') }}
                        onClick={() => setSelected(i)}
                      >
                        {img.status === 'done' && img.thumbUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element -- served by the API with auth
                          <img src={img.thumbUrl} alt={`Image ${i + 1}`} />
                        ) : img.status === 'waiting' ? (
                          <span>
                            <Icon
                              name={i === ready ? 'loader-circle' : 'clock'}
                              size={20}
                              className={i === ready ? 'as-spin' : undefined}
                            />
                            {i === ready ? `Making image ${i + 1}…` : 'Waiting'}
                          </span>
                        ) : (
                          <span>
                            <Icon name="circle-alert" size={20} />
                            {img.status === 'cancelled' ? 'Cancelled' : 'Didn’t finish · not charged'}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </section>

        {/* ── Details ── */}
        {batch && (
          <aside className="is-about" aria-label="About this image">
            <h2 className="is-ov">About this image</h2>
            <p className="is-about-prompt">{batch.prompt}</p>
            <dl className="is-kv">
              {batch.source && (
                <div>
                  <dt>Made from</dt>
                  <dd>
                    <Link href={`/image/${batch.source.id}?i=${batch.source.index}`}>
                      {KIND_LABEL[batch.kind]} image {batch.source.index + 1}
                    </Link>
                  </dd>
                </div>
              )}
              {batch.reference && (
                <div>
                  <dt>Reference</dt>
                  <dd>
                    {batch.reference.name} ·{' '}
                    {batch.reference.use === 'style'
                      ? 'Style'
                      : batch.reference.use === 'layout'
                        ? 'Layout'
                        : 'Subject'}
                  </dd>
                </div>
              )}
              <div>
                <dt>Model</dt>
                <dd>
                  {batch.modelName ?? '…'}
                  {batch.auto ? ' · chosen by Auto' : ''}
                </dd>
              </div>
              <div>
                <dt>Size</dt>
                <dd>{current?.width ? `${current.width} × ${current.height}` : batch.ratio}</dd>
              </div>
              <div>
                <dt>Style</dt>
                <dd>{STYLES.find((s) => s.value === batch.style)?.label}</dd>
              </div>
              <div>
                <dt>Cost</dt>
                <dd>{generating ? 'Charged per finished image' : `${batch.credits} credits`}</dd>
              </div>
              <div>
                <dt>Made</dt>
                <dd>{madeAt(batch.createdAt)}</dd>
              </div>
            </dl>
            <p className="is-note">
              Generated images are saved in All images. You own what you make and can use it commercially,
              within our usage rules.
            </p>
          </aside>
        )}
      </div>

      <ProToolsDialog open={proDialog} onClose={() => setProDialog(false)} />
      {toast && (
        <div className="is-toast" role="status">
          {toast}
        </div>
      )}
      <Dialog
        open={confirmDelete}
        title="Delete these images?"
        description={batch ? `All ${batch.count} images from “${batch.title}” will be deleted.` : undefined}
        width={440}
        onClose={() => setConfirmDelete(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                if (!batch) return;
                await api.DELETE('/api/images/{id}', { params: { path: { id: batch.id } } });
                setConfirmDelete(false);
                router.push('/image');
                router.refresh();
              }}
            >
              Delete
            </Button>
          </>
        }
      />
    </div>
  );
}

/** The new image from an edit, upscale or cut-out, before it's kept or discarded. */
function ResultStage({ result }: { result: { kind: ToolKind; batch: ImageBatch } }) {
  const item = result.batch.images[0];
  const b = result.batch;
  return (
    <div
      className={cx('is-stage', result.kind === 'cutout' && 'checker')}
      style={{ aspectRatio: b.ratio.replace(':', ' / ') }}
    >
      {item?.status === 'done' && item.url ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- served by the API with auth */}
          <img src={item.url} alt={b.prompt} />
          <span className="is-dims">
            {item.width} × {item.height} · PNG · {b.credits} credit{b.credits === 1 ? '' : 's'}
          </span>
        </>
      ) : (
        <div className="is-stage-msg" role="status">
          {b.status === 'generating' ? (
            <>
              <Icon name="loader-circle" size={28} className="as-spin" />
              <span>{TOOL_TEXT[result.kind].wait}</span>
            </>
          ) : (
            <>
              <Icon name={b.status === 'blocked' ? 'shield-alert' : 'circle-alert'} size={24} />
              <span>{b.error?.message ?? 'That didn’t work. No credits were used.'}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

const KIND_LABEL: Record<ImageBatch['kind'], string> = {
  generate: 'Generated',
  variations: 'Variations of',
  edit: 'Edit of',
  upscale: 'Upscaled from',
  cutout: 'Background removed from',
};

function madeAt(iso: string) {
  const d = new Date(iso);
  const t = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return d.toDateString() === new Date().toDateString()
    ? `Today, ${t}`
    : `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}, ${t}`;
}

/** Download as PNG, JPG (smaller) or WebP (for websites), or every finished image. */
function DownloadMenu({ batch, index }: { batch: ImageBatch; index: number }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('mousedown', down);
      document.removeEventListener('keydown', key);
    };
  }, [open]);
  const url = (i: number, format: string) => `/api/images/${batch.id}/files/${i}?format=${format}&download=1`;
  const done = batch.images.filter((i) => i.status === 'done');
  const item = batch.images[index];
  return (
    <div className="is-dl" ref={ref}>
      <Button
        size="sm"
        variant="ghost"
        icon="download"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        Download
      </Button>
      {open && (
        <div className="is-menu" role="menu">
          <a role="menuitem" href={url(index, 'png')} onClick={() => setOpen(false)}>
            <b>PNG</b>
            <span>
              {item?.width} × {item?.height}
            </span>
          </a>
          <a role="menuitem" href={url(index, 'jpg')} onClick={() => setOpen(false)}>
            <b>JPG</b>
            <span>smaller file</span>
          </a>
          <a role="menuitem" href={url(index, 'webp')} onClick={() => setOpen(false)}>
            <b>WebP</b>
            <span>for websites</span>
          </a>
          {done.length > 1 && (
            <>
              <div className="sep" role="separator" />
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  // One download per image (browsers allow this after a click).
                  done.forEach((img, n) =>
                    setTimeout(() => {
                      const a = document.createElement('a');
                      a.href = url(img.index, 'png');
                      a.click();
                    }, n * 300),
                  );
                }}
              >
                <Icon name="download" size={16} />
                <b>Download all {done.length}</b>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
