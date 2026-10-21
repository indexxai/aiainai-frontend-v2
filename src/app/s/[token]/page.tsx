import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Icon } from '@/ui';
import { PublicDoc } from '@/components/docs/PublicDoc';
import { serverApi } from '@/lib/session';
import '../../system.css';

type Params = { params: Promise<{ token: string }> };

async function load(token: string) {
  const { data } = await serverApi().GET('/api/public/docs/{token}', {
    params: { path: { token } },
    cache: 'no-store',
  });
  return data ?? null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const doc = await load((await params).token);
  // Shared links are not for search engines.
  return { title: doc?.title ?? 'Shared document', robots: { index: false, follow: false } };
}

/** A document shared by link: read-only, no sign-in needed. */
export default async function SharedDocPage({ params }: Params) {
  const doc = await load((await params).token);
  if (!doc)
    return (
      <div className="sys-page">
        <Link href="/" className="sys-top">
          <Image src="/brand/jacks-ai-mark.png" alt="" width={27} height={32} />
          Jack&rsquo;s AI
        </Link>
        <main className="sys" id="main">
          <span className="sys-ic">
            <Icon name="link-2-off" size={28} />
          </span>
          <h1 className="sys-t">This link doesn’t work</h1>
          <p className="sys-p">
            The owner may have turned off link sharing or made a new link. Ask them to send it again.
          </p>
        </main>
      </div>
    );
  return <PublicDoc doc={doc} token={(await params).token} />;
}
