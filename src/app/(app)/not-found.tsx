import Link from 'next/link';
import { BackButton } from '@/components/system/SystemActions';
import { Icon } from '@/ui';
import '../system.css';

/** A missing document, image or chat inside the app: keeps the sidebar, no second logo bar. */
export default function AppNotFound() {
  return (
    <main className="sys" id="main">
      <span className="sys-ic">
        <Icon name="compass" size={28} />
      </span>
      <span className="sys-code">Error 404</span>
      <h1 className="sys-t">We can’t find that page</h1>
      <p className="sys-p">
        It may have been deleted, or the link has a typo. If you followed a link from someone, ask them to
        send it again.
      </p>
      <div className="sys-row">
        <Link href="/" className="as-btn primary">
          <Icon name="house" size={16} />
          Go to Home
        </Link>
        <BackButton />
      </div>
    </main>
  );
}
