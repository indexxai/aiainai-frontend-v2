import type { CSSProperties } from 'react';
import { cx } from '../cx';

export interface SkeletonProps {
  width?: CSSProperties['width'];
  height?: CSSProperties['height'];
  radius?: CSSProperties['borderRadius'];
  className?: string;
}

/** Placeholder block shown while content loads. Decorative: the loading region carries aria-busy. */
export function Skeleton({ width = '100%', height = 16, radius, className }: SkeletonProps) {
  return (
    <span
      aria-hidden
      className={cx('as-skeleton', className)}
      style={{ width, height, borderRadius: radius }}
    />
  );
}
