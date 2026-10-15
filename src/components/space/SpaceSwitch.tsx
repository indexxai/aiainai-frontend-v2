'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon, Tabs, cx } from '@/ui';
import type { ShellSession } from '@/lib/session';
import { SPACE_ITEMS, openInSpace, saveSpace, type Space } from '@/lib/space';

/**
 * Personal / Business. Switching reloads Jack's home in the other space (chats, docs, images,
 * team and memory are kept apart). The first time Business is picked, set-up opens instead.
 */
export function SpaceSwitch({ space, className }: { space: ShellSession['space']; className?: string }) {
  const router = useRouter();
  const change = (value: string) => {
    const next = value as Space;
    if (next === space.active) return;
    if (next === 'business' && !space.business) {
      router.push('/business/setup');
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
        value={space.active}
        onChange={change}
      />
      {space.active === 'business' && space.business && (
        <Link href="/business/setup" className="space-name" title="Business details">
          <Icon name="briefcase" size={14} />
          <span>{space.business.name}</span>
        </Link>
      )}
    </div>
  );
}
