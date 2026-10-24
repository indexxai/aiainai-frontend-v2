/* eslint-disable @next/next/no-img-element -- small static mascots */
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
 * A Jack mascot. The same coloured figure is used on the light and dark themes (the design
 * dropped the white dark-theme version), so one image is enough.
 */
export function JackImg({ space, part, className, width, height, style }: Props) {
  const art = JACKS[space][part];
  return <img src={art.light} alt="" width={width} height={height} style={style} className={className} />;
}
