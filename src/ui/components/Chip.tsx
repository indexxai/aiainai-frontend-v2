import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon } from './Icon';
import type { IconName } from '../icons';
import { cx } from '../cx';

export interface ChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon?: IconName;
  shape?: 'pill' | 'tag';
  selected?: boolean;
  /** Opens a menu: shows a caret and announces a popup instead of a pressed state. */
  dropdown?: boolean;
  children: ReactNode;
}

export function Chip({
  icon,
  shape = 'pill',
  selected,
  dropdown,
  className,
  type = 'button',
  children,
  ...rest
}: ChipProps) {
  return (
    <button
      {...rest}
      type={type}
      className={cx('as-chip', shape === 'tag' && 'tag', selected && 'selected', className)}
      aria-pressed={dropdown ? undefined : !!selected}
      aria-haspopup={dropdown ? 'menu' : undefined}
    >
      {icon && <Icon name={icon} size={16} />}
      {children}
      {dropdown && <Icon name="chevron-down" size={14} className="as-caret" />}
    </button>
  );
}
