import Image from 'next/image';
import Link from 'next/link';
import { Icon } from '@/ui';
import './system.css';

export default function NotFound() {
  return (
    <div className="sys-page">
      <Link href="/" className="sys-top">
        <Image src="/brand/jacks-ai-mark.png" alt="" width={27} height={32} />
        Jack&rsquo;s AI
      </Link>
      <main className="sys" id="main">
        <span className="sys-ic">
          <Icon name="compass" size={28} />
        </span>
        <span className="sys-code">Error 404</span>
        <h1 className="sys-t">We can’t find that page</h1>
        <p className="sys-p">
          The page may have moved, been deleted, or the link has a typo. If someone sent you the link, ask
          them to send it again.
        </p>
        <div className="sys-row">
          <Link href="/" className="as-btn primary">
            <Icon name="house" size={16} />
            Go to Home
          </Link>
        </div>
      </main>
    </div>
  );
}
