import type { ReactNode } from 'react';
import { Icon } from './Icon';
import type { IconName } from '../icons';
import { cx } from '../cx';

type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'brand';
const TONE_ICON: Partial<Record<Tone, IconName>> = {
  info: 'loader-circle',
  success: 'circle-check',
  warning: 'circle-alert',
  danger: 'circle-alert',
  brand: 'sparkles',
};

export interface BadgeProps {
  tone?: Tone;
  /** Pass false to hide the tone's default icon. Status is always shown as icon + word. */
  icon?: IconName | false;
  className?: string;
  children: ReactNode;
}

export function Badge({ tone = 'neutral', icon, className, children }: BadgeProps) {
  const name = icon === false ? undefined : (icon ?? TONE_ICON[tone]);
  return (
    <span className={cx('as-badge', tone, className)}>
      {name && <Icon name={name} size={12} strokeWidth={2} />}
      {children}
    </span>
  );
}
