'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/ui';

/** "Go back" on an error page (falls back to Home when there's no history). */
export function BackButton() {
  const router = useRouter();
  return (
    <Button icon="arrow-left" onClick={() => (window.history.length > 1 ? router.back() : router.push('/'))}>
      Go back
    </Button>
  );
}

/** Try again now, and check by itself every 20 seconds until the service is back. */
export function RetryButton() {
  useEffect(() => {
    const t = setInterval(() => window.location.reload(), 20_000);
    return () => clearInterval(t);
  }, []);
  return (
    <Button variant="primary" icon="refresh-cw" onClick={() => window.location.reload()}>
      Try again
    </Button>
  );
}
