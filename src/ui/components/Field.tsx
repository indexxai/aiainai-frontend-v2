'use client';
import { useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { IconButton } from './Button';
import { cx } from '../cx';

export interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  hint?: string;
  error?: string;
  /** Adds a show/hide button for password fields. */
  revealable?: boolean;
  /** Small link on the label row, e.g. "Forgot password?". */
  labelAction?: ReactNode;
}

/** Labelled text input with hint and error text wired up for screen readers. */
export function Field({
  label,
  hint,
  error,
  revealable,
  labelAction,
  type = 'text',
  className,
  ...rest
}: FieldProps) {
  const id = useId();
  const [shown, setShown] = useState(false);
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
  return (
    <div className={cx('as-field', error && 'invalid', className)}>
      <div className="as-field-labelrow">
        <label htmlFor={id} className="as-field-label">
          {label}
        </label>
        {labelAction}
      </div>
      <div className="as-field-box">
        <input
          {...rest}
          id={id}
          type={revealable && shown ? 'text' : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="as-field-input"
        />
        {revealable && (
          <IconButton
            icon={shown ? 'eye-off' : 'eye'}
            size="sm"
            label={shown ? 'Hide password' : 'Show password'}
            pressed={shown}
            onClick={() => setShown((v) => !v)}
          />
        )}
      </div>
      {hint && !error && (
        <span id={`${id}-hint`} className="as-field-hint">
          {hint}
        </span>
      )}
      {error && (
        <span id={`${id}-error`} className="as-field-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
