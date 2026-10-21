/* eslint-disable @next/next/no-img-element -- small static mascots, swapped by theme in CSS */
import { JACKS } from '@/lib/jack';
import type { Space } from '@/lib/space';
import type { CSSProperties } from 'react';
import { cx } from '@/ui';

type Props = {
  space: Space;
  part: 'full' | 'head';
  className?: string;
  width?: number;
  height?: number;
  style?: CSSProperties;
};

/**
 * A Jack mascot that follows the theme: the white figure on the dark theme and the
 * coloured one on the light theme. Both images are rendered and CSS hides the one that
 * does not match `data-theme`, so there is no flash and it works in server components.
 */
export function JackImg({ space, part, className, width, height, style }: Props) {
  const art = JACKS[space][part];
  return (
    <>
      <img
        src={art.dark}
        alt=""
        width={width}
        height={height}
        style={style}
        className={cx('jack-on-dark', className)}
      />
      <img
        src={art.light}
        alt=""
        width={width}
        height={height}
        style={style}
        className={cx('jack-on-light', className)}
      />
    </>
  );
}
