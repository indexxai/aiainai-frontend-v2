'use client';
import { useEffect, useRef, type RefObject } from 'react';

/**
 * Stops reading a running answer when the page closes (the server finishes and saves it), and
 * returns whether the page is still open.
 * The abort waits a tick: React's development check unmounts and remounts every component at
 * once, and an answer started on mount (a new chat's first message, a new document) must
 * survive that. A real unmount still aborts.
 */
export function useAbortOnLeave(abort: RefObject<AbortController | null>): RefObject<boolean> {
  const leaving = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    if (leaving.current) clearTimeout(leaving.current);
    leaving.current = null;
    mounted.current = true;
    return () => {
      mounted.current = false;
      // The request running when the page closes, not the one (if any) at mount.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      leaving.current = setTimeout(() => abort.current?.abort(), 0);
    };
  }, [abort]);
  return mounted;
}
