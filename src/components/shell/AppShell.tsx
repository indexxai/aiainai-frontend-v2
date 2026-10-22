'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useState, type MouseEvent, type ReactNode } from 'react';
import { Dialog, Icon, Sidebar, cx, type LinkLike, type NavEntry } from '@/ui';
import type { ShellSession } from '@/lib/session';
import { SignOutButton } from '@/components/account/SignOutButton';
import {
  FOOTER_NAV,
  SIDEBAR_COOKIE,
  MAIN_NAV,
  PHONE_MORE,
  PHONE_MORE_ROWS,
  PHONE_TABS,
  isActive,
  sectionFor,
  type Section,
} from './nav';
import { CrumbsContext, type CrumbState } from './crumbs';
import { SpaceSwitch } from '@/components/space/SpaceSwitch';
import { openInSpace, saveSpace, type Space } from '@/lib/space';
import { SpaceContext } from '@/lib/space-context';
import { AssistantContext } from '@/lib/assistant';
import { usePendingApprovals } from '@/lib/approvals-count';
import { NewProjectDialog } from '@/components/projects/NewProjectDialog';
import './shell.css';
import '@/components/space/space.css';

const NextLink: LinkLike = ({ children, ...props }) => <Link {...props}>{children}</Link>;

/** Nav labels that name the Personal assistant follow the name the person gave him. */
export const labelFor = (s: Section, a: ShellSession['assistant'], active: Space = 'personal'): string =>
  s.id === 'jack'
    ? a.title
    : active === 'business'
      ? s.label
      : s.id === 'home'
        ? a.name
        : s.id === 'browser'
          ? `${a.name}’s browser`
          : s.label;

const toEntries = (
  sections: Section[],
  pathname: string,
  space: ShellSession['space'],
  openSpace: (target: Space) => void,
  assistant: ShellSession['assistant'],
  businessOpen = true,
): NavEntry[] =>
  sections
    .filter((s) => businessOpen || s.id !== 'team')
    .map((s) => {
      const entry = {
        id: s.id,
        icon: s.icon,
        label: labelFor(s, assistant, space.active),
        active: isActive(s, pathname, space.active),
      };
      // Until Captain Jack launches, his item opens the "coming soon" page.
      if (s.space === 'business' && !businessOpen) return { ...entry, href: '/captain-jack' };
      // The other space's Jack is a button: it switches space (or opens Business set-up first).
      if (s.space && s.space !== space.active) return { ...entry, onClick: () => openSpace(s.space!) };
      return { ...entry, href: s.href };
    });

/**
 * The frame around every signed-in screen:
 * desktop (≥1280px) full sidebar · tablet (768–1279px) icon rail · phone (<768px) top bar + bottom tabs.
 * All three are rendered and switched with CSS, so there is no layout jump on load.
 */
export function AppShell({
  session,
  initialCollapsed = false,
  children,
}: {
  session: ShellSession;
  initialCollapsed?: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);
  const [newProject, setNewProject] = useState(false);
  const waiting = usePendingApprovals(session.inboxCount, pathname);
  // Desktop only: collapse the sidebar to the icon rail. Kept in a cookie so the server
  // renders the right layout on the next visit (no jump on load).
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const setCollapsedSaved = (v: boolean) => {
    setCollapsed(v);
    document.cookie = `${SIDEBAR_COOKIE}=${v ? 'collapsed' : 'open'}; path=/; max-age=31536000; samesite=lax`;
  };
  const section = sectionFor(pathname);
  // Business is Captain Jack's; Personal is named after the person's assistant (Jack, Kash…).
  const bridge =
    session.space.active === 'business' ? 'Captain Jack’s Bridge' : `${session.assistant.name}'s AI`;
  const title = section ? labelFor(section, session.assistant, session.space.active) : bridge;
  const [crumbState, setCrumbs] = useState<CrumbState | null>(null);
  const crumbs = crumbState?.path === pathname ? crumbState : null;

  // Close the More sheet when one of its links is followed.
  const closeOnLink = (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest('a')) setMoreOpen(false);
  };

  const openSpace = (target: Space) => {
    // Without a Business space (there's no set-up yet), Business shows Captain Jack's "coming soon".
    if (target === 'business' && (!session.businessOpen || !session.space.business)) {
      router.push('/captain-jack');
      return;
    }
    saveSpace(target);
    openInSpace();
  };

  const sidebarProps = {
    logoSrc: '/brand/jacks-ai-mark.png',
    productName: bridge,
    items: toEntries(MAIN_NAV, pathname, session.space, openSpace, session.assistant, session.businessOpen),
    footerItems: toEntries(
      FOOTER_NAV,
      pathname,
      session.space,
      openSpace,
      session.assistant,
      session.businessOpen,
    ),
    credits: { ...session.credits, topUpHref: '/settings/billing' },
    user: session.user,
    onNew: () => setNewProject(true),
    linkAs: NextLink,
  };

  return (
    <>
      <a className="as-skip" href="#main">
        Skip to content
      </a>
      <div className="shell" data-collapsed={collapsed || undefined}>
        <Sidebar
          {...sidebarProps}
          onCollapse={() => setCollapsedSaved(true)}
          className="shell-sidebar shell-sidebar-full"
        />
        <Sidebar
          {...sidebarProps}
          rail
          onExpand={collapsed ? () => setCollapsedSaved(false) : undefined}
          className="shell-sidebar shell-sidebar-rail"
        />

        <div className="shell-body" data-section={section?.id}>
          <header className={cx('shell-header', !!crumbs?.actions && 'has-actions')}>
            {crumbs?.back ? (
              <Link href={crumbs.back} className="as-iconbtn shell-phone-only shell-back" aria-label="Back">
                <Icon name="arrow-left" size={22} />
              </Link>
            ) : (
              <Link href="/" className="shell-phone-brand" aria-label={`${bridge} home`}>
                <Image src="/brand/jacks-ai-mark.png" alt="" width={23} height={28} priority />
              </Link>
            )}
            <nav aria-label="Breadcrumb" className="shell-crumb">
              {crumbs ? (
                crumbs.items.map((c, i) => {
                  const last = i === crumbs.items.length - 1;
                  return (
                    <span key={i} className={cx('shell-crumb-item', !last && 'parent')}>
                      {last ? (
                        <span aria-current="page">{c.label}</span>
                      ) : c.href ? (
                        <Link href={c.href}>{c.label}</Link>
                      ) : (
                        <span>{c.label}</span>
                      )}
                      {!last && (
                        <span className="sep" aria-hidden>
                          /
                        </span>
                      )}
                    </span>
                  );
                })
              ) : (
                <span aria-current="page">{title}</span>
              )}
            </nav>
            <SpaceSwitch
              space={session.space}
              businessOpen={session.businessOpen}
              comingSoon={pathname === '/captain-jack'}
              className={cx('shell-space', pathname !== '/' && 'shell-space-away')}
            />
            <div className="shell-header-actions">
              {crumbs?.actions}
              <Link
                href="/approvals"
                className="as-iconbtn shell-desktop-only"
                aria-label={waiting > 0 ? `Approvals, ${waiting} waiting for you` : 'Approvals'}
                title="Approvals"
              >
                <Icon name="bell" size={20} />
                {waiting > 0 && (
                  <span className="shell-dot" aria-hidden>
                    {waiting}
                  </span>
                )}
              </Link>
              <button
                type="button"
                className="shell-avatar-btn shell-phone-only"
                aria-label="Account and more"
                onClick={() => setMoreOpen(true)}
              >
                <span className="as-avatar">{session.user.initials}</span>
              </button>
            </div>
          </header>

          <main id="main" tabIndex={-1} className="shell-main">
            <SpaceContext.Provider value={session.space.active}>
              <AssistantContext.Provider value={session.assistant}>
                <CrumbsContext.Provider value={setCrumbs}>{children}</CrumbsContext.Provider>
              </AssistantContext.Provider>
            </SpaceContext.Provider>
          </main>

          <nav className="shell-tabs" aria-label="Main" data-space={session.space.active}>
            {PHONE_TABS.map((t) => {
              const on = isActive(t, pathname, session.space.active);
              return (
                <Link
                  key={t.id}
                  href={t.href}
                  className={cx('shell-tab', on && 'on')}
                  aria-current={on ? 'page' : undefined}
                >
                  <Icon name={t.icon} size={22} />
                  {labelFor(t, session.assistant, session.space.active)}
                  {t.id === 'approvals' && waiting > 0 && (
                    <>
                      <span className="shell-dot" aria-hidden>
                        {waiting}
                      </span>
                      <span className="sr-only">, {waiting} waiting for you</span>
                    </>
                  )}
                </Link>
              );
            })}
            <button
              type="button"
              className={cx('shell-tab', moreOpen && 'on')}
              aria-haspopup="dialog"
              onClick={() => setMoreOpen(true)}
            >
              <Icon name="more-horizontal" size={22} />
              More
            </button>
          </nav>
        </div>
      </div>

      <Dialog open={moreOpen} sheet title="More" onClose={() => setMoreOpen(false)}>
        <div className="shell-more" onClickCapture={closeOnLink}>
          <div className="shell-more-user">
            <span className="as-avatar">{session.user.initials}</span>
            <div>
              <b>{session.user.name}</b>
              <span>{session.user.detail}</span>
            </div>
          </div>
          <div className="shell-more-grid">
            {PHONE_MORE.filter((s) => session.businessOpen || s.id !== 'team').map((s) => (
              <Link key={s.id} href={s.href} className="shell-more-tile">
                <Icon name={s.icon} size={20} />
                {s.label}
              </Link>
            ))}
          </div>
          <div className="as-credits">
            <div className="top">
              <span>Credits</span>
              <b>{session.credits.remaining}</b>
            </div>
            <div className="bot">
              <span>{session.credits.plan}</span>
              <Link href="/settings/billing">Top up</Link>
            </div>
          </div>
          <div className="shell-more-rows">
            {PHONE_MORE_ROWS.map((s) => (
              <Link key={s.id} href={s.href} className="shell-more-row">
                <Icon name={s.icon} size={20} />
                <span>{s.label}</span>
                <Icon name="chevron-right" size={16} />
              </Link>
            ))}
          </div>
          <SignOutButton className="shell-more-signout" />
        </div>
      </Dialog>
      <NewProjectDialog open={newProject} onClose={() => setNewProject(false)} />
    </>
  );
}
