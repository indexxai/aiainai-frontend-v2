import type { ReactNode } from 'react';
import { Icon, type IconName } from '@/ui';
import './page.css';

/** Standard page column with a title row. */
export function Page({
  title,
  description,
  actions,
  children,
  width = 960,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
  width?: number;
}) {
  return (
    <div className="pg" style={{ maxWidth: width }}>
      {title && (
        <div className="pg-head">
          <div className="pg-titles">
            <h1 className="title-lg pg-title">{title}</h1>
            {description && <p className="pg-desc">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}

/** Calm empty state: what will appear here and how to get started. */
export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon: IconName;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="pg-empty">
      <span className="pg-empty-icon">
        <Icon name={icon} size={28} />
      </span>
      <h2 className="pg-empty-title">{title}</h2>
      {children && <p className="pg-empty-text">{children}</p>}
      {action}
    </div>
  );
}
