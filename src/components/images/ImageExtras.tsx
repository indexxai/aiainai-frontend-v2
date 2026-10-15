'use client';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Badge, Button, Chip, Dialog, Icon, IconButton, Tabs } from '@/ui';
import type { Schemas } from '@/lib/api/client';
import { toApiError } from '@/lib/api/errors';

export type Reference = Schemas['ReferenceDto'] & { preview: string; use: 'style' | 'layout' | 'subject' };

const REF_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_REF = 20 * 1024 * 1024;
const REF_USES = [
  { value: 'style', label: 'Style' },
  { value: 'layout', label: 'Layout' },
  { value: 'subject', label: 'Subject' },
];

/** Upload a reference image (design: ImageFlow reference / reference-error). */
export async function uploadReference(file: File): Promise<{ ref?: Reference; error?: string }> {
  const bad = `${file.name} isn’t an image. Use a JPG, PNG or WebP under 20 MB.`;
  if (!REF_TYPES.includes(file.type) || file.size > MAX_REF) return { error: bad };
  try {
    const res = await fetch(`/api/images/references?name=${encodeURIComponent(file.name)}`, {
      method: 'POST',
      headers: { 'content-type': file.type },
      body: file,
      credentials: 'include',
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) return { error: toApiError(body).message };
    return {
      ref: { ...(body as Schemas['ReferenceDto']), preview: URL.createObjectURL(file), use: 'style' },
    };
  } catch {
    return { error: 'The upload didn’t finish. Check your connection and try again.' };
  }
}

export function ReferenceRow({
  reference,
  onUse,
  onRemove,
}: {
  reference: Reference;
  onUse: (u: Reference['use']) => void;
  onRemove: () => void;
}) {
  return (
    <div className="is-ref">
      {/* eslint-disable-next-line @next/next/no-img-element -- a local preview of the chosen file */}
      <img src={reference.preview} alt="Reference image" />
      <span className="is-ref-body">
        <span className="is-ref-name">{reference.name}</span>
        <Tabs
          variant="segmented"
          label="Use the reference for"
          items={REF_USES}
          value={reference.use}
          onChange={(v) => onUse(v as Reference['use'])}
        />
      </span>
      <IconButton icon="x" size="sm" label="Remove reference" onClick={onRemove} />
    </div>
  );
}

/** "Improve prompt" suggestion card (design: ImageFlow improve). */
export function ImprovedPrompt({
  text,
  onUse,
  onKeep,
}: {
  text: string | null;
  onUse: () => void;
  onKeep: () => void;
}) {
  return (
    <div className="is-improve" role="region" aria-label="Suggested prompt">
      <div className="is-improve-head">
        <Badge tone="info" icon="wand-sparkles">
          Suggested prompt
        </Badge>
        <span className="muted">free</span>
      </div>
      {text === null ? (
        <span className="muted is-improve-wait">
          <Icon name="loader-circle" size={14} className="as-spin" /> Improving your prompt…
        </span>
      ) : (
        <span className="is-improve-text">{text}</span>
      )}
      <div className="is-improve-actions">
        <Button size="sm" variant="primary" icon="check" disabled={text === null} onClick={onUse}>
          Use this
        </Button>
        <Button size="sm" variant="ghost" onClick={onKeep}>
          Keep mine
        </Button>
      </div>
    </div>
  );
}

const EDIT_IDEAS = ['Remove it', 'Make it brighter', 'Add a plant'];

/** Left panel in edit mode (design: ImageFlow edit). */
export function EditPanel({
  brush,
  onBrush,
  text,
  onText,
  onBack,
}: {
  brush: 'box' | 'brush';
  onBrush: (b: 'box' | 'brush') => void;
  text: string;
  onText: (t: string) => void;
  onBack: () => void;
}) {
  return (
    <>
      <div className="is-edit-head">
        <div className="is-edit-title">
          <IconButton icon="chevron-left" size="sm" label="Back" onClick={onBack} />
          <span>Edit part of the image</span>
        </div>
        <span className="muted">
          Drag over the area to change, then say what should be there. The rest stays the same.
        </span>
      </div>
      <div className="is-field">
        <div className="is-label">Selection</div>
        <Tabs
          variant="segmented"
          label="Selection"
          value={brush}
          onChange={(v) => onBrush(v as 'box' | 'brush')}
          items={[
            { value: 'box', label: 'Box' },
            { value: 'brush', label: 'Brush' },
          ]}
        />
      </div>
      <div className="is-field">
        <label htmlFor="is-edit-text" className="is-label">
          What should be there?
        </label>
        <div className="is-prompt">
          <textarea
            id="is-edit-text"
            rows={3}
            maxLength={1000}
            placeholder="e.g. Replace the laptop with an open notebook and a coffee mug"
            value={text}
            onChange={(e) => onText(e.target.value)}
          />
        </div>
      </div>
      <div className="is-styles">
        {EDIT_IDEAS.map((idea) => (
          <Chip key={idea} shape="tag" onClick={() => onText(idea)}>
            {idea}
          </Chip>
        ))}
      </div>
    </>
  );
}

type Shape =
  | { type: 'box'; x: number; y: number; w: number; h: number }
  | { type: 'stroke'; r: number; pts: [number, number][] };

export interface MaskHandle {
  /** The selection as a PNG data URL (white = change), at the image's own size; null if empty. */
  toPng: () => string | null;
  clear: () => void;
}

/**
 * Selection drawn over the image for an edit: a box (drag) or a brush (paint). Coordinates are
 * kept in the image's own pixels so the mask matches it exactly.
 */
export const MaskCanvas = forwardRef<
  MaskHandle,
  { img: HTMLImageElement | null; mode: 'box' | 'brush'; onChange: (has: boolean) => void }
>(function MaskCanvas({ img, mode, onChange }, ref) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const shapes = useRef<Shape[]>([]);
  const drawing = useRef<Shape | null>(null);
  const [rect, setRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const nat = { w: img?.naturalWidth || 1024, h: img?.naturalHeight || 1024 };

  // Where the image actually is inside the stage (object-fit: contain).
  useEffect(() => {
    if (!img) return;
    const place = () => {
      const cw = img.clientWidth;
      const ch = img.clientHeight;
      const s = Math.min(cw / (img.naturalWidth || cw), ch / (img.naturalHeight || ch));
      const w = (img.naturalWidth || cw) * s;
      const h = (img.naturalHeight || ch) * s;
      setRect({
        left: img.offsetLeft + (cw - w) / 2,
        top: img.offsetTop + (ch - h) / 2,
        width: w,
        height: h,
      });
    };
    place();
    if (!img.complete) img.addEventListener('load', place, { once: true });
    const ro = new ResizeObserver(place);
    ro.observe(img);
    return () => ro.disconnect();
  }, [img]);

  const paint = useCallback((ctx: CanvasRenderingContext2D, forExport: boolean) => {
    const { w, h } = { w: ctx.canvas.width, h: ctx.canvas.height };
    ctx.clearRect(0, 0, w, h);
    const all = drawing.current ? [...shapes.current, drawing.current] : shapes.current;
    if (forExport) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);
    } else if (all.some((s) => s.type === 'box')) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(0, 0, w, h);
    }
    for (const s of all) {
      if (s.type === 'box') {
        const x = Math.min(s.x, s.x + s.w);
        const y = Math.min(s.y, s.y + s.h);
        const bw = Math.abs(s.w);
        const bh = Math.abs(s.h);
        if (forExport) {
          ctx.fillStyle = '#fff';
          ctx.fillRect(x, y, bw, bh);
        } else {
          ctx.clearRect(x, y, bw, bh);
          ctx.fillStyle = 'rgba(255,255,255,0.22)';
          ctx.fillRect(x, y, bw, bh);
          ctx.setLineDash([w / 80, w / 120]);
          ctx.lineWidth = Math.max(2, w / 400);
          ctx.strokeStyle = '#fff';
          ctx.strokeRect(x, y, bw, bh);
        }
      } else {
        ctx.strokeStyle = forExport ? '#fff' : 'rgba(255,255,255,0.45)';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = s.r * 2;
        ctx.setLineDash([]);
        ctx.beginPath();
        s.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        if (s.pts.length === 1) ctx.lineTo(s.pts[0]![0] + 0.1, s.pts[0]![1]);
        ctx.stroke();
      }
    }
  }, []);

  const redraw = useCallback(() => {
    const ctx = canvas.current?.getContext('2d');
    if (ctx) paint(ctx, false);
  }, [paint]);

  useImperativeHandle(
    ref,
    () => ({
      toPng: () => {
        if (!shapes.current.length) return null;
        const c = document.createElement('canvas');
        c.width = nat.w;
        c.height = nat.h;
        const ctx = c.getContext('2d')!;
        paint(ctx, true);
        return c.toDataURL('image/png');
      },
      clear: () => {
        shapes.current = [];
        redraw();
        onChange(false);
      },
    }),
    [nat.w, nat.h, paint, redraw, onChange],
  );

  const at = (e: React.PointerEvent): [number, number] => {
    const r = canvas.current!.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * nat.w, ((e.clientY - r.top) / r.height) * nat.h];
  };

  if (!rect) return null;
  return (
    <canvas
      ref={canvas}
      className="is-mask"
      width={nat.w}
      height={nat.h}
      style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
      aria-label={mode === 'box' ? 'Drag to select the area to change' : 'Paint over the area to change'}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        const [x, y] = at(e);
        if (mode === 'box') {
          shapes.current = shapes.current.filter((s) => s.type !== 'box');
          drawing.current = { type: 'box', x, y, w: 0, h: 0 };
        } else drawing.current = { type: 'stroke', r: nat.w * 0.035, pts: [[x, y]] };
        redraw();
      }}
      onPointerMove={(e) => {
        const d = drawing.current;
        if (!d) return;
        const [x, y] = at(e);
        if (d.type === 'box') {
          d.w = x - d.x;
          d.h = y - d.y;
        } else d.pts.push([x, y]);
        redraw();
      }}
      onPointerUp={() => {
        const d = drawing.current;
        drawing.current = null;
        if (d && (d.type === 'stroke' || (Math.abs(d.w) > nat.w * 0.02 && Math.abs(d.h) > nat.h * 0.02)))
          shapes.current.push(d);
        redraw();
        onChange(shapes.current.length > 0);
      }}
    />
  );
});

/** Upscale and Remove background are on Jack Personal (design: ImageFlow free-upscale). */
export function ProToolsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog
      open={open}
      title="Large images are on Jack Personal"
      description="On Jack Free you can make images up to 1024 px. Jack Personal lets you upscale large images and remove backgrounds — good for print and ads."
      width={480}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Not now
          </Button>
          <a href="/settings/billing" className="as-btn primary">
            See Jack Personal
          </a>
        </>
      }
    />
  );
}

export const TOOL_TEXT = {
  edit: {
    wait: 'Editing the selected area…',
    keep: 'Keep edit',
    done: 'Saved as a new image — the original is kept',
  },
  upscale: {
    wait: 'Upscaling — about 20 seconds',
    keep: 'Keep large version',
    done: 'Saved as a new image — the original is kept',
  },
  cutout: {
    wait: 'Removing the background…',
    keep: 'Save as PNG',
    done: 'Saved as a transparent PNG in All images',
  },
} as const;
