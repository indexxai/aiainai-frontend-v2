import type { IconName } from '@/ui';

export interface Section {
  id: string;
  label: string;
  href: string;
  icon: IconName;
  /** Jack of all trades and Captain Jack open Jack's home in their own space. */
  space?: 'personal' | 'business';
}

const HOME: Section = { id: 'home', label: 'Jack', href: '/', icon: 'compass' };

/**
 * Main sidebar order, from the v2 designs: the two Jacks first (Jack of all trades opens the
 * Personal space, Captain Jack the Business space); Docs, Image and Team are their tools;
 * then what keeps you in control (Activity, Approvals, Wallet) and what Jack knows and can use.
 */
export const MAIN_NAV: Section[] = [
  { id: 'jack', label: 'Jack of all trades', href: '/', icon: 'compass', space: 'personal' },
  { id: 'captain', label: 'Captain Jack', href: '/', icon: 'briefcase', space: 'business' },
  { id: 'activity', label: 'Activity', href: '/activity', icon: 'history' },
  { id: 'approvals', label: 'Approvals', href: '/approvals', icon: 'hand' },
  { id: 'docs', label: 'Docs', href: '/docs', icon: 'file-text' },
  { id: 'image', label: 'Image', href: '/image', icon: 'image' },
  { id: 'team', label: 'AI Crews', href: '/team', icon: 'users' },
  { id: 'wallet', label: 'Wallet', href: '/wallet', icon: 'credit-card' },
  { id: 'memory', label: 'Memory', href: '/memory', icon: 'brain' },
  { id: 'connections', label: 'Connections', href: '/connections', icon: 'link' },
];

export const FOOTER_NAV: Section[] = [
  { id: 'settings', label: 'Settings', href: '/settings', icon: 'settings' },
  { id: 'help', label: 'Help', href: '/help', icon: 'circle-help' },
];

/** Phone bottom tabs (v2 phone design). "More" opens a sheet instead of a page. */
export const PHONE_TABS: Section[] = [
  { id: 'home', label: 'Jack', href: '/', icon: 'compass' },
  { id: 'activity', label: 'Activity', href: '/activity', icon: 'history' },
  { id: 'approvals', label: 'Approvals', href: '/approvals', icon: 'hand' },
];

export const PHONE_MORE: Section[] = [
  { id: 'docs', label: 'Docs', href: '/docs', icon: 'file-text' },
  { id: 'image', label: 'Image', href: '/image', icon: 'image' },
  { id: 'team', label: 'AI Crews', href: '/team', icon: 'users' },
  { id: 'wallet', label: 'Wallet', href: '/wallet', icon: 'credit-card' },
  { id: 'memory', label: 'Memory', href: '/memory', icon: 'brain' },
  { id: 'connections', label: 'Connections', href: '/connections', icon: 'link' },
];

export const PHONE_MORE_ROWS: Section[] = [
  { id: 'settings', label: 'Settings', href: '/settings', icon: 'settings' },
  { id: 'billing', label: 'Plan and billing', href: '/settings/billing', icon: 'receipt' },
  { id: 'help', label: 'Help', href: '/help', icon: 'circle-help' },
];

/**
 * v1 pages that stay reachable (links, history) but are no longer in the menu. Conversations
 * are Jack's, so Chat highlights Jack; Research and Files become Jack's tools.
 */
const JACK_PAGES: Section[] = [
  { id: 'chat', label: 'Conversation', href: '/chat', icon: 'message-square' },
  { id: 'research', label: 'Research', href: '/research', icon: 'globe' },
  { id: 'files', label: 'Files', href: '/files', icon: 'folder' },
  { id: 'browser', label: 'Jack’s browser', href: '/browser', icon: 'globe' },
];

const JACK_IDS = new Set([...JACK_PAGES.map((p) => p.id), 'business']);

const ALL: Section[] = [
  HOME,
  ...MAIN_NAV.filter((s) => !s.space),
  ...JACK_PAGES,
  ...FOOTER_NAV,
  { id: 'business', label: 'Business set-up', href: '/business', icon: 'briefcase' },
  { id: 'inbox', label: 'Inbox', href: '/inbox', icon: 'bell' },
  { id: 'billing', label: 'Plan and billing', href: '/settings/billing', icon: 'receipt' },
];

/** The section a path belongs to: the longest matching href wins ("/settings/billing" over "/settings"). */
export function sectionFor(pathname: string): Section | undefined {
  return ALL.filter((s) =>
    s.href === '/' ? pathname === '/' : pathname === s.href || pathname.startsWith(`${s.href}/`),
  ).sort((a, b) => b.href.length - a.href.length)[0];
}

export function isActive(section: Section, pathname: string, space?: 'personal' | 'business'): boolean {
  const current = sectionFor(pathname);
  if (!current) return false;
  // The two Jacks: Jack's pages, in their own space.
  if (section.space) return section.space === space && (current.id === 'home' || JACK_IDS.has(current.id));
  // Billing lives under Settings in the sidebar.
  if (section.id === 'settings' && current.id === 'billing') return true;
  // Conversations, Research, Files and Business set-up belong to Jack.
  if (section.id === 'home' && JACK_IDS.has(current.id)) return true;
  return current.id === section.id;
}

/** Cookie remembering a collapsed desktop sidebar (read on the server to avoid a layout jump). */
export const SIDEBAR_COOKIE = 'aiainai-sidebar';
