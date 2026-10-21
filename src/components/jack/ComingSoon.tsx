import type { ReactNode } from 'react';
import { Badge, Icon, type IconName } from '@/ui';
import './coming.css';

/**
 * A v2 screen that arrives later this week: what it will do, so the menu item is never a dead
 * end. Replaced screen by screen (Days 2–5).
 */
export function ComingSoon({
  icon,
  title,
  when,
  points,
  children,
}: {
  icon: IconName;
  title: string;
  when: string;
  points: string[];
  children?: ReactNode;
}) {
  return (
    <section className="soon" aria-label={title}>
      <span className="soon-icon">
        <Icon name={icon} size={28} />
      </span>
      <div className="soon-head">
        <h2 className="soon-title">{title}</h2>
        <Badge tone="neutral" icon="clock">
          {when}
        </Badge>
      </div>
      <ul className="soon-points">
        {points.map((p) => (
          <li key={p}>
            <Icon name="check" size={16} />
            <span>{p}</span>
          </li>
        ))}
      </ul>
      {children}
    </section>
  );
}
