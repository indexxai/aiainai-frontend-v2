'use client';
import { cx } from '../cx';

export interface SwitchProps {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  /** Required when there is no visible label. */
  ariaLabel?: string;
  disabled?: boolean;
}

export function Switch({ checked, onChange, label, ariaLabel, disabled }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label ? undefined : ariaLabel}
      disabled={disabled}
      className={cx('as-switch', checked && 'on')}
      onClick={() => onChange?.(!checked)}
    >
      <span className="track">
        <span className="thumb" />
      </span>
      {label && <span className="lbl">{label}</span>}
    </button>
  );
}
