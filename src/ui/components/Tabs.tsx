'use client';
import { useRef, type KeyboardEvent } from 'react';
import { Icon } from './Icon';
import type { IconName } from '../icons';
import { cx } from '../cx';

export interface TabItem {
  value: string;
  label: string;
  icon?: IconName;
}

export interface TabsProps {
  items: TabItem[];
  value: string;
  onChange?: (value: string) => void;
  variant?: 'pill' | 'segmented';
  /** Accessible name for the group, e.g. "Theme". */
  label?: string;
  className?: string;
}

/** Tab list with roving focus: arrow keys move between tabs, as screen-reader users expect. */
export function Tabs({ items, value, onChange, variant = 'pill', label, className }: TabsProps) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const onKey = (e: KeyboardEvent, i: number) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (i + step + items.length) % items.length;
    refs.current[next]?.focus();
    onChange?.(items[next]!.value);
  };
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cx('as-tabs', variant === 'segmented' && 'segmented', className)}
    >
      {items.map((it, i) => {
        const active = it.value === value;
        return (
          <button
            key={it.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            role="tab"
            type="button"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            className={cx('as-tab', active && 'active')}
            onClick={() => onChange?.(it.value)}
            onKeyDown={(e) => onKey(e, i)}
          >
            {it.icon && <Icon name={it.icon} size={16} />}
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
