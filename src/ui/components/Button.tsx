import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon } from './Icon';
import type { IconName } from '../icons';
import { cx } from '../cx';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'brand' | 'danger';
  size?: 'sm' | 'md';
  shape?: 'rounded' | 'pill';
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  children: ReactNode;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  shape = 'rounded',
  icon,
  iconRight,
  loading = false,
  disabled,
  type = 'button',
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      className={cx('as-btn', variant, size === 'sm' && 'sm', shape === 'pill' && 'pill', className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading ? (
        <Icon name="loader-circle" size={16} className="as-spin" />
      ) : (
        icon && <Icon name={icon} size={16} />
      )}
      {children}
      {iconRight && <Icon name={iconRight} size={16} />}
    </button>
  );
}

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: IconName;
  /** Required: icon-only buttons need an accessible name. */
  label: string;
  variant?: 'secondary' | 'primary' | 'brand';
  size?: 'sm' | 'md';
  shape?: 'rounded' | 'pill';
  pressed?: boolean;
}

export function IconButton({
  icon,
  label,
  variant,
  size = 'md',
  shape = 'rounded',
  pressed,
  className,
  type = 'button',
  ...rest
}: IconButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      className={cx('as-iconbtn', variant, size === 'sm' && 'sm', shape === 'pill' && 'pill', className)}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
    >
      <Icon name={icon} size={size === 'sm' ? 16 : 20} />
    </button>
  );
}
