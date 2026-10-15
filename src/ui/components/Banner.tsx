import type { ReactNode } from 'react';
import { Button, IconButton } from './Button';
import { Icon } from './Icon';
import type { IconName } from '../icons';
import { cx } from '../cx';

type Tone = 'neutral' | 'warning' | 'danger' | 'success';
const BANNER_ICON: Record<Tone, IconName> = {
  neutral: 'info',
  warning: 'circle-alert',
  danger: 'circle-alert',
  success: 'circle-check',
};

export interface BannerProps {
  tone?: Tone;
  icon?: IconName;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  className?: string;
  children: ReactNode;
}

export function Banner({
  tone = 'neutral',
  icon,
  actionLabel,
  onAction,
  onDismiss,
  className,
  children,
}: BannerProps) {
  return (
    <div className={cx('as-banner', tone, className)} role={tone === 'danger' ? 'alert' : 'status'}>
      <Icon name={icon ?? BANNER_ICON[tone]} size={18} />
      <span className="txt">{children}</span>
      {actionLabel && (
        <Button size="sm" variant="secondary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
      {onDismiss && <IconButton icon="x" size="sm" label="Dismiss" onClick={onDismiss} />}
    </div>
  );
}
