'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Banner, Button, CodeInput, Icon } from '@/ui';
import { authClient } from '@/lib/auth/client';
import { authErrorMessage } from '@/lib/auth/messages';
import { safeNext } from '@/lib/auth/redirect';
import { mmss, useCountdown } from '../useCountdown';

export function VerifyForm() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get('email') ?? '';
  const next = safeNext(params.get('next'));
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(
    params.get('resent') ? 'Your email isn’t confirmed yet. We sent you a new code.' : '',
  );
  const { left, restart } = useCountdown(60);

  async function verify(otp = code) {
    if (otp.length !== 6) return;
    setBusy(true);
    setError('');
    const { error: err } = await authClient.emailOtp.verifyEmail({ email, otp });
    if (err) {
      setBusy(false);
      setCode('');
      return setError(authErrorMessage(err));
    }
    router.replace(next);
    router.refresh();
  }

  async function resend() {
    setError('');
    const { error: err } = await authClient.emailOtp.sendVerificationOtp({
      email,
      type: 'email-verification',
    });
    if (err) return setError(authErrorMessage(err));
    setNotice('New code sent. It works for 10 minutes.');
    restart(60);
  }

  if (!email) {
    return (
      <div className="au-head">
        <h1 className="au-title">Check your email</h1>
        <p className="au-sub">
          This link is missing the email address.{' '}
          <Link className="au-link" href="/signup">
            Start again
          </Link>
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="au-head">
        <span className="au-icon" aria-hidden>
          <Icon name="mail" size={20} />
        </span>
        <h1 className="au-title">Check your email</h1>
        <p className="au-sub">
          We sent a 6-digit code to <b>{email}</b>. It expires in 10 minutes.
        </p>
      </div>
      {notice && !error && <Banner tone="neutral">{notice}</Banner>}
      {error && <Banner tone="danger">{error}</Banner>}
      <form
        className="au-form"
        onSubmit={(e) => {
          e.preventDefault();
          void verify();
        }}
      >
        <CodeInput
          label="6-digit code"
          value={code}
          onChange={setCode}
          onComplete={(c) => void verify(c)}
          invalid={!!error}
          disabled={busy}
        />
        <Button
          type="submit"
          variant="primary"
          className="au-full"
          loading={busy}
          disabled={code.length !== 6}
        >
          Verify email
        </Button>
      </form>
      <p className="au-small">
        Didn’t get it? Check spam, or{' '}
        <button type="button" className="au-link" onClick={resend} disabled={left > 0}>
          {left > 0 ? `send a new code in ${mmss(left)}` : 'send a new code'}
        </button>
        .
      </p>
      <p className="au-small">
        Wrong email?{' '}
        <Link className="au-link" href="/signup">
          Change it
        </Link>
      </p>
    </>
  );
}
