'use client';
import { useRouter } from 'next/navigation';
import { Icon, Tabs, cx } from '@/ui';
import type { ShellSession } from '@/lib/session';
import { SPACE_ITEMS, openInSpace, saveSpace, type Space } from '@/lib/space';

/**
 * Personal / Business. Switching reloads Jack's home in the other space (chats, docs, images
 * and memory are kept apart). Without a Business space, Business opens Captain Jack's "coming soon".
 */
export function SpaceSwitch({
  space,
  className,
  businessOpen = true,
  comingSoon = false,
}: {
  space: ShellSession['space'];
  className?: string;
  /** False until Captain Jack launches: Business opens the "coming soon" page. */
  businessOpen?: boolean;
  /** On the "coming soon" page, Business shows as picked. */
  comingSoon?: boolean;
}) {
  const router = useRouter();
  const change = (value: string) => {
    const next = value as Space;
    if (!businessOpen) {
      if (next === 'business') router.push('/captain-jack');
      else if (comingSoon) router.push('/');
      return;
    }
    if (next === space.active) return;
    if (next === 'business' && !space.business) {
      router.push('/captain-jack');
      return;
    }
    saveSpace(next);
    openInSpace();
  };
  return (
    <div className={cx('space-switch', className)}>
      <Tabs
        variant="segmented"
        label="Space"
        items={SPACE_ITEMS.map((i) => ({ ...i }))}
        value={comingSoon ? 'business' : space.active}
        onChange={change}
      />
      {businessOpen && space.active === 'business' && space.business && (
        <span className="space-name">
          <Icon name="briefcase" size={14} />
          <span>{space.business.name}</span>
        </span>
      )}
    </div>
  );
}
