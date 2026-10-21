'use client';
import { Icon, cx, type IconName } from '@/ui';
import { JackImg } from '@/components/jack/JackImg';
import { useSpace } from '@/lib/space-context';
import type { Space } from '@/lib/space';

/**
 * A square avatar with an icon. Jack (`captain`) shows his mascot's face: Jack of all trades in
 * Personal, Captain Jack in Business (or the `jack` given).
 */
export function AgentAvatar({
  icon,
  captain,
  jack,
  name,
  size = 36,
  className,
}: {
  icon?: string;
  captain?: boolean;
  jack?: Space;
  name?: string;
  size?: number;
  className?: string;
}) {
  const space = useSpace();
  return (
    <span
      className={cx('as-agent', captain && 'captain', className)}
      style={{ width: size, height: size }}
      role={name ? 'img' : undefined}
      aria-label={name}
      aria-hidden={name ? undefined : true}
      title={name}
    >
      {captain ? (
        <JackImg space={jack ?? space} part="head" width={size} height={size} className="as-agent-face" />
      ) : (
        <Icon name={(icon || 'bot') as IconName} size={Math.round(size * 0.5)} />
      )}
    </span>
  );
}
