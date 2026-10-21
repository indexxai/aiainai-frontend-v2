'use client';
import { useEffect } from 'react';
import { Button, Icon } from '@/ui';
import '@/components/page/page.css';
import '../system.css';

/** Something failed while rendering a page. The rest of the app (sidebar, tabs) keeps working. */
export default function PageError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="sys">
      <span className="sys-ic">
        <Icon name="server-crash" size={28} />
      </span>
      <span className="sys-code">Something went wrong</span>
      <h1 className="sys-t">This page didn’t load</h1>
      <p className="sys-p">
        It’s not something you did, and your work is saved. Try again; if it keeps happening, send us the
        error ID.
      </p>
      {error.digest && <code className="sys-box">Error ID {error.digest}</code>}
      <Button variant="primary" icon="refresh-cw" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
