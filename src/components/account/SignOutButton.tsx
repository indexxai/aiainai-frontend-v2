'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/ui';
import { authClient } from '@/lib/auth/client';

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="secondary"
      size="sm"
      icon="log-out"
      loading={busy}
      className={className}
      onClick={async () => {
        setBusy(true);
        await authClient.signOut();
        router.replace('/signin');
        router.refresh();
      }}
    >
      Sign out
    </Button>
  );
}
