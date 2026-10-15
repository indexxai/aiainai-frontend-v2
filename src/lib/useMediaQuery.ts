'use client';
import { useSyncExternalStore } from 'react';

/** True while the media query matches. Server render and first paint assume `fallback`. */
export function useMediaQuery(query: string, fallback = false): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(query);
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => fallback,
  );
}

export const PHONE_QUERY = '(max-width: 767px)';
