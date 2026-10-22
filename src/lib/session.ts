import 'server-only';
import { cookies } from 'next/headers';
import { createApiClient } from './api/client';
import type { Schemas } from './api/client';
import type { ModelMenu } from './models';

export type Me = Schemas['MeDto'];

export interface ShellSession {
  user: { initials: string; name: string; detail: string };
  credits: { remaining: string; percent: number; plan: string };
  /** Approvals waiting for you, in both spaces (Jack's purchases, emails and messages). */
  inboxCount: number;
  /** The space this page was rendered in, and the Business space if one is set up. */
  space: Me['space'];
  /** The Personal assistant's name (Jack until renamed). */
  assistant: Me['assistant'];
  /** False until the Business space (Captain Jack) launches: it shows "coming soon" instead. */
  businessOpen: boolean;
}

/**
 * Asks the backend who is signed in, forwarding this request's cookies.
 * Returns null when there is no valid session.
 */
export async function getMe(): Promise<Me | null> {
  const cookie = (await cookies()).toString();
  if (!cookie) return null;
  const { data, response } = await serverApi().GET('/api/me', { headers: { cookie }, cache: 'no-store' });
  if (response.status === 401) return null;
  if (!data) throw new Error(`Could not load the account (status ${response.status})`);
  return data;
}

/** How many approvals are waiting, for the bell. 0 if the backend can't say (never breaks the page). */
export async function getPendingApprovals(): Promise<number> {
  const cookie = (await cookies()).toString();
  try {
    const { data } = await serverApi().GET('/api/approvals', { headers: { cookie }, cache: 'no-store' });
    return data ? data.jackPending.length : 0;
  } catch {
    return 0;
  }
}

/** Backend client for server components; pass this request's cookies in `headers`. */
export const serverApi = () => createApiClient(process.env.BACKEND_URL ?? 'http://localhost:4000');

/**
 * The model menu for a prompt box. If the backend can't be reached, the box still works
 * with Auto only, rather than failing the whole page.
 */
export async function getModelMenu(kind: 'text' | 'image' = 'text'): Promise<ModelMenu> {
  const cookie = (await cookies()).toString();
  try {
    const { data } = await serverApi().GET('/api/models', {
      params: { query: { kind } },
      headers: { cookie },
      cache: 'no-store',
    });
    if (data) return data;
  } catch {
    // fall through to the Auto-only menu
  }
  return {
    kind,
    auto:
      kind === 'text'
        ? {
            key: 'auto',
            name: 'Auto',
            description: 'Picks the best model for each request',
            tags: ['Balanced', 'Credits vary'],
          }
        : null,
    models: [],
    selected: 'auto',
    demo: false,
  };
}

export function initialsOf(name: string, email: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return email.slice(0, 2).toUpperCase();
}

export function toShellSession(me: Me, pendingApprovals = 0): ShellSession {
  const { credits, workspace, user } = me;
  // Sidebar meter shows how much of this period's plan credits are used.
  const used =
    credits.monthly > 0
      ? Math.round(((credits.monthly - Math.min(credits.plan, credits.monthly)) / credits.monthly) * 100)
      : 0;
  return {
    user: { initials: initialsOf(user.name, user.email), name: user.name || user.email, detail: user.email },
    credits: {
      remaining: credits.spendable.toLocaleString('en-US'),
      percent: Math.max(0, Math.min(100, used)),
      plan: workspace.plan === 'pro' ? 'Jack Personal' : 'Jack Free',
    },
    inboxCount: pendingApprovals,
    space: me.space,
    assistant: me.assistant ?? { name: 'Jack', title: 'Jack of all trades', custom: false },
    businessOpen: me.businessOpen !== false,
  };
}

export type Home = Schemas['HomeDto'];

/** Jack's home for the current space. Empty (not an error) if the backend can't say. */
export async function getHome(space: Me['space']['active']): Promise<Home> {
  const cookie = (await cookies()).toString();
  try {
    const { data } = await serverApi().GET('/api/home', { headers: { cookie }, cache: 'no-store' });
    if (data) return data;
  } catch {
    // fall through
  }
  return {
    space,
    needsYou: [],
    needsYouCount: 0,
    inProgress: [],
    inProgressCount: 0,
    suggestions: [],
    memoryCount: 0,
    apps: [],
  };
}

/** Spaces, for Business set-up and Connections. */
export async function getSpaces(): Promise<Schemas['SpacesDto'] | null> {
  const cookie = (await cookies()).toString();
  const { data } = await serverApi().GET('/api/spaces', { headers: { cookie }, cache: 'no-store' });
  return data ?? null;
}

/** Which AI Image extras can be used (reference, edit, variations, upscale, remove background). */
export async function getImageCaps(): Promise<Schemas['ImageCapabilitiesDto']> {
  const cookie = (await cookies()).toString();
  try {
    const { data } = await serverApi().GET('/api/images/capabilities', {
      headers: { cookie },
      cache: 'no-store',
    });
    if (data) return data;
  } catch {
    // fall through: show no extras rather than failing the page
  }
  return {
    editModel: null,
    reference: false,
    variations: false,
    edit: false,
    upscale: false,
    removeBackground: false,
    toolsPlan: 'pro',
    toolsIncluded: false,
    upscaleCredits: 2,
    removeBackgroundCredits: 1,
    variationCount: 4,
  };
}
