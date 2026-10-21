import Image from 'next/image';
import { Icon } from '@/ui';
import { RetryButton } from './SystemActions';
import '@/app/system.css';

/** The app can't reach the backend (design: SystemFlow "server-error"). */
export function ServiceDown() {
  return (
    <div className="sys-page">
      <span className="sys-top">
        <Image src="/brand/jacks-ai-mark.png" alt="" width={27} height={32} />
        Jack&rsquo;s AI
      </span>
      <main className="sys" id="main">
        <span className="sys-ic">
          <Icon name="server-crash" size={28} />
        </span>
        <span className="sys-code">Can’t connect</span>
        <h1 className="sys-t">Something went wrong on our side</h1>
        <p className="sys-p">
          It’s not something you did, and your work is saved. We’ll try again by ourselves every few seconds.
        </p>
        <div className="sys-row">
          <RetryButton />
        </div>
        <p className="sys-p muted">This page refreshes by itself when we’re back.</p>
      </main>
    </div>
  );
}
