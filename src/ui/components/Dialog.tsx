'use client';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { IconButton } from './Button';

export interface DialogProps {
  open: boolean;
  title: string;
  description?: string;
  step?: string;
  width?: number;
  onClose?: () => void;
  footer?: ReactNode;
  children?: ReactNode;
  /** Phone layout: slide up from the bottom instead of centring. */
  sheet?: boolean;
  /** Extra class on the panel, e.g. `flush` for edge-to-edge lists. */
  className?: string;
}

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';

/**
 * Modal dialog / bottom sheet. Traps focus, closes on Escape and backdrop click,
 * and returns focus to whatever opened it.
 */
export function Dialog({
  open,
  title,
  description,
  step,
  width,
  onClose,
  footer,
  children,
  sheet,
  className,
}: DialogProps) {
  const panel = useRef<HTMLDivElement>(null);
  // Latest onClose without re-running the open effect (which would move focus) on every render.
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const el = panel.current;
    (el?.querySelector<HTMLElement>(FOCUSABLE) ?? el)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeRef.current) {
        e.stopPropagation();
        closeRef.current();
      }
      if (e.key !== 'Tab' || !el) return;
      const items = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (!items.length) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      opener?.focus?.();
    };
  }, [open]);

  if (!open || typeof document === 'undefined') return null;
  return createPortal(
    <div className={sheet ? 'as-dialog-layer fixed sheet' : 'as-dialog-layer fixed'}>
      <div className="as-dialog-backdrop" onClick={onClose} />
      <div
        ref={panel}
        className={className ? `as-dialog ${className}` : 'as-dialog'}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        style={width && !sheet ? { width } : undefined}
      >
        {sheet && <span className="as-sheet-grab" aria-hidden />}
        <div className="as-dialog-head">
          <div className="txt">
            {step && <div className="step">{step}</div>}
            <h2 id={titleId}>{title}</h2>
            {description && <p id={descId}>{description}</p>}
          </div>
          {onClose && <IconButton icon="x" size="sm" label="Close" onClick={onClose} />}
        </div>
        <div className="as-dialog-body">{children}</div>
        {footer && <div className="as-dialog-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
