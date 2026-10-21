'use client';
import { useEffect, useState } from 'react';
import { api } from './api/client';

const CHANGED = 'jack:approvals-changed';
const POLL_MS = 30_000;

/** Tell the header that approvals may have changed (one appeared in a chat, one was decided). */
export function approvalsChanged(): void {
  window.dispatchEvent(new Event(CHANGED));
}

/**
 * How many approvals are waiting, for the bell and the phone Approvals tab. Starts from the
 * server's count, then refreshes on page changes, when told something changed, when the tab
 * comes back into view, and every 30 seconds while it's visible.
 */
export function usePendingApprovals(serverCount: number, pathname: string): number {
  // The latest count fetched here, with the server count it replaced, so a newer server render wins.
  const [live, setLive] = useState<{ base: number; n: number } | null>(null);

  useEffect(() => {
    let on = true;
    const refresh = () =>
      void countWaiting().then((n) => {
        if (on && n !== null) setLive({ base: serverCount, n });
      });
    refresh();
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    const t = setInterval(onVisible, POLL_MS);
    window.addEventListener(CHANGED, refresh);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      on = false;
      clearInterval(t);
      window.removeEventListener(CHANGED, refresh);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [serverCount, pathname]);

  return live && live.base === serverCount ? live.n : serverCount;
}

async function countWaiting(): Promise<number | null> {
  try {
    const { data } = await api.GET('/api/approvals');
    return data ? data.jackPending.length : null;
  } catch {
    return null;
  }
}
