'use client';
import { Icon, cx, type IconName } from '@/ui';
import { AGENT_STATUS_LABEL, type AgentStatus as Status } from '@/lib/team/types';
import { JackImg } from '@/components/jack/JackImg';
import { useSpace } from '@/lib/space-context';
import type { Space } from '@/lib/space';

/**
 * An agent's square avatar with its icon, and a status dot. Jack (`captain`) shows his mascot's
 * face: Jack of all trades in Personal, Captain Jack in Business (or the `jack` given).
 */
export function AgentAvatar({
  icon,
  captain,
  jack,
  name,
  status,
  size = 36,
  className,
}: {
  icon?: string;
  captain?: boolean;
  jack?: Space;
  name?: string;
  status?: Status;
  size?: number;
  className?: string;
}) {
  const space = useSpace();
  const label = name ? `${name}${status ? `, ${AGENT_STATUS_LABEL[status]}` : ''}` : undefined;
  return (
    <span
      className={cx('as-agent', captain && 'captain', className)}
      style={{ width: size, height: size }}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      title={label}
    >
      {captain ? (
        <JackImg space={jack ?? space} part="head" width={size} height={size} className="as-agent-face" />
      ) : (
        <Icon name={(icon || 'bot') as IconName} size={Math.round(size * 0.5)} />
      )}
      {status && <span className={cx('as-agent-dot', status)} />}
    </span>
  );
}

export function AgentStatus({ status }: { status: Status }) {
  return (
    <span className={cx('as-agent-status', status)}>
      <span className={cx('as-agent-dot', 'inline', status)} />
      {AGENT_STATUS_LABEL[status]}
    </span>
  );
}
