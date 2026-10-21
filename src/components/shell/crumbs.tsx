'use client';
import { createContext, useContext, useEffect, type ReactNode } from 'react';

export interface Crumb {
  label: string;
  href?: string;
}
export interface CrumbState {
  path: string;
  items: Crumb[];
  /** Phone: show a back arrow to this page instead of the logo. */
  back?: string;
  /** Extra buttons on the right of the header (desktop and phone). */
  actions?: ReactNode;
}

export const CrumbsContext = createContext<((s: CrumbState | null) => void) | null>(null);

/**
 * Lets a page set the header breadcrumb, e.g. "Chat / Pricing page". Cleared when the page
 * unmounts; the header falls back to the section name.
 */
export function useShellCrumbs(state: CrumbState | null) {
  const set = useContext(CrumbsContext);
  const key = state ? JSON.stringify({ ...state, actions: undefined }) : '';
  useEffect(() => {
    if (!set) return;
    set(state);
    return () => set(null);
    // `key` captures the serialisable parts; actions are re-read on change of those
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [set, key, state?.actions]);
}
