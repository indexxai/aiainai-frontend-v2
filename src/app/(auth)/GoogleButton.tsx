'use client';
import { useState } from 'react';
import { Button } from '@/ui';
import { authClient, googleEnabled } from '@/lib/auth/client';

/** "Continue with Google" + "or with email" divider. Hidden until the backend has Google keys. */
export function GoogleButton({ next, onError }: { next: string; onError: (msg: string) => void }) {
  const [busy, setBusy] = useState(false);
  if (!googleEnabled) return null;
  return (
    <>
      <Button
        variant="secondary"
        icon="globe"
        className="au-full"
        loading={busy}
        onClick={async () => {
          setBusy(true);
          const { error } = await authClient.signIn.social({ provider: 'google', callbackURL: next });
          if (error) {
            setBusy(false);
            onError('Google sign-in didn’t work. Try again, or use your email.');
          }
        }}
      >
        Continue with Google
      </Button>
      <div className="au-or">or with email</div>
    </>
  );
}
