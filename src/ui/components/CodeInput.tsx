'use client';
import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react';
import { cx } from '../cx';

export interface CodeInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Called when all digits are filled. */
  onComplete?: (value: string) => void;
  length?: number;
  label?: string;
  invalid?: boolean;
  disabled?: boolean;
}

/**
 * One box per digit, as in the designs. Typing moves forward, Backspace moves back, and
 * pasting a whole code fills every box. The phone's "code from Messages/Mail" suggestion works
 * via autocomplete="one-time-code" on the first box.
 */
export function CodeInput({
  value,
  onChange,
  onComplete,
  length = 6,
  label = 'Code',
  invalid,
  disabled,
}: CodeInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? '');

  const setAt = (i: number, d: string) => {
    const next = (value.slice(0, i) + d + value.slice(i + 1)).replace(/\D/g, '').slice(0, length);
    onChange(next);
    if (next.length === length) onComplete?.(next);
  };

  const fill = (raw: string, from = 0) => {
    const clean = raw.replace(/\D/g, '');
    if (!clean) return;
    const next = (value.slice(0, from) + clean).slice(0, length);
    onChange(next);
    refs.current[Math.min(next.length, length - 1)]?.focus();
    if (next.length === length) onComplete?.(next);
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>, i: number) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      e.preventDefault();
      onChange(value.slice(0, i - 1));
      refs.current[i - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus();
    else if (e.key === 'ArrowRight' && i < length - 1) refs.current[i + 1]?.focus();
  };

  return (
    <div role="group" aria-label={label} className={cx('as-code', invalid && 'invalid')}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={d}
          disabled={disabled}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          aria-label={`Digit ${i + 1} of ${length}`}
          aria-invalid={invalid || undefined}
          maxLength={length}
          className="as-code-box"
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '');
            if (v.length > 1) return fill(v, i);
            setAt(i, v);
            if (v && i < length - 1) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => onKey(e, i)}
          onPaste={(e: ClipboardEvent<HTMLInputElement>) => {
            e.preventDefault();
            fill(e.clipboardData.getData('text'), i);
          }}
          onFocus={(e) => e.target.select()}
        />
      ))}
    </div>
  );
}
