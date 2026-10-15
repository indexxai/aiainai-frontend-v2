import type { ComponentType, ReactNode } from 'react';
import { Button, IconButton } from './Button';
import { Icon } from './Icon';
import type { IconName } from '../icons';
import { cx } from '../cx';

export interface NavEntry {
  id: string;
  icon: IconName;
  label: string;
  href?: string;
  active?: boolean;
  onClick?: () => void;
}

/** Anything that renders a link: Next.js `Link` in the app, a plain `a` in tests. */
export type LinkLike = ComponentType<{
  href: string;
  className?: string;
  title?: string;
  'aria-current'?: 'page';
  children: ReactNode;
  onClick?: () => void;
}>;

const PlainLink: LinkLike = ({ children, ...props }) => <a {...props}>{children}</a>;

export interface SidebarProps {
  rail?: boolean;
  logoSrc?: string;
  productName?: string;
  items: NavEntry[];
  footerItems?: NavEntry[];
  credits?: { remaining: string; percent: number; plan: string; topUpHref?: string };
  user?: { initials: string; name: string; detail?: string };
  onNew?: () => void;
  onCollapse?: () => void;
  /** Shown on the rail when it is a collapsed desktop sidebar. */
  onExpand?: () => void;
  linkAs?: LinkLike;
  className?: string;
}

function NavItem({ entry, rail, Link }: { entry: NavEntry; rail?: boolean; Link: LinkLike }) {
  const cls = cx('as-nav-item', entry.active && 'active');
  const inner = (
    <>
      <Icon name={entry.icon} size={20} />
      <span>{entry.label}</span>
    </>
  );
  return entry.href ? (
    <Link
      href={entry.href}
      className={cls}
      title={rail ? entry.label : undefined}
      aria-current={entry.active ? 'page' : undefined}
      onClick={entry.onClick}
    >
      {inner}
    </Link>
  ) : (
    <button type="button" className={cls} title={rail ? entry.label : undefined} onClick={entry.onClick}>
      {inner}
    </button>
  );
}

export function Sidebar({
  rail,
  logoSrc,
  productName = "Jack's Bridge",
  items,
  footerItems = [],
  credits,
  user,
  onNew,
  onCollapse,
  onExpand,
  linkAs = PlainLink,
  className,
}: SidebarProps) {
  const Link = linkAs;
  return (
    <nav className={cx('as-sidebar', rail && 'rail', className)} aria-label="Main">
      <div className="as-sb-head">
        {logoSrc ? (
          // The design system stays framework-agnostic, so it uses a plain <img>.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoSrc} alt="Jack's AI" width={32} height={32} />
        ) : (
          <span className="as-avatar">ai</span>
        )}
        {!rail && <span className="name">{productName}</span>}
        {!rail && <span className="spacer" />}
        {!rail && onCollapse && (
          <IconButton icon="panel-left" size="sm" label="Collapse sidebar" onClick={onCollapse} />
        )}
      </div>
      {rail && onExpand && (
        <IconButton icon="panel-left" size="sm" label="Expand sidebar" onClick={onExpand} />
      )}
      {rail ? (
        <NavItem entry={{ id: 'new', icon: 'plus', label: 'New', onClick: onNew }} rail Link={Link} />
      ) : (
        <Button variant="secondary" icon="plus" className="as-sb-new" onClick={onNew}>
          New project
        </Button>
      )}
      <div className="as-sb-sep" />
      <div className="as-nav">
        {items.map((it) => (
          <NavItem key={it.id} entry={it} rail={rail} Link={Link} />
        ))}
      </div>
      <div className="as-sb-foot">
        {!rail && credits && (
          <div className="as-credits">
            <div className="top">
              <span>Credits</span>
              <b>{credits.remaining}</b>
            </div>
            <div
              className="as-meter"
              role="meter"
              aria-label="Credits used"
              aria-valuenow={credits.percent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <i style={{ width: `${credits.percent}%` }} />
            </div>
            <div className="bot">
              <span>{credits.plan}</span>
              {credits.topUpHref && <Link href={credits.topUpHref}>Top up</Link>}
            </div>
          </div>
        )}
        <div className="as-nav">
          {footerItems.map((it) => (
            <NavItem key={it.id} entry={it} rail={rail} Link={Link} />
          ))}
        </div>
        {user &&
          (rail ? (
            <span className="as-avatar" title={user.name}>
              {user.initials}
            </span>
          ) : (
            <div className="as-user">
              <span className="as-avatar">{user.initials}</span>
              <div className="who">
                <b>{user.name}</b>
                {user.detail && <span>{user.detail}</span>}
              </div>
            </div>
          ))}
      </div>
    </nav>
  );
}
