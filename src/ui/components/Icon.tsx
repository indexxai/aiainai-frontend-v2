import type { CSSProperties } from 'react';
import { icons, type IconName } from '../icons';
import { cx } from '../cx';

export interface IconProps {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  color?: string;
  /** Give a label only when the icon carries meaning on its own; otherwise it is hidden from screen readers. */
  label?: string;
  className?: string;
  style?: CSSProperties;
}

export function Icon({ name, size = 20, strokeWidth = 1.75, color, label, className, style }: IconProps) {
  return (
    <svg
      className={cx('as-icon', className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color ?? 'currentColor'}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      aria-label={label}
      style={style}
      // Icon markup comes from our own generated, static icon set — never from user input.
      dangerouslySetInnerHTML={{ __html: icons[name] }}
    />
  );
}
