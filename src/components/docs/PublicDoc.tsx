'use client';
import { marked } from 'marked';
import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Badge, Button } from '@/ui';
import type { Schemas } from '@/lib/api/client';
import { readMinutes, TYPE_INFO } from '@/lib/docs/types';
import { ExportDialog } from './ExportDialog';
import { RichEditor } from './RichEditor';
import './docs.css';

/** Read-only view of a document opened from a share link. */
export function PublicDoc({ doc, token }: { doc: Schemas['PublicDocDto']; token: string }) {
  const [downloading, setDownloading] = useState(false);
  const content = useMemo(
    () => doc.content ?? (marked.parse(doc.markdown || '', { async: false }) as string),
    [doc],
  );
  return (
    <div className="pd">
      <header className="pd-top">
        <Link href="/" className="pd-brand">
          <Image src="/brand/jacks-ai-mark.png" alt="" width={23} height={28} />
          Jack&rsquo;s AI
        </Link>
        <Badge icon="eye" className="pd-view">
          View only
        </Badge>
        <span className="grow" />
        <Button size="sm" variant="ghost" icon="download" onClick={() => setDownloading(true)}>
          Download
        </Button>
        <Link href="/signup" className="as-btn secondary sm">
          <span className="pd-cta-long">Try Captain Jack&rsquo;s Bridge free</span>
          <span className="pd-cta-short">Try it free</span>
        </Link>
      </header>
      <main className="pd-main" id="main">
        <article className="de-paper">
          <div className="de-eyebrow">{TYPE_INFO[doc.type].label} · Shared</div>
          <h1 className="de-title pd-title">{doc.title}</h1>
          <div className="de-byline">
            Updated{' '}
            {new Date(doc.updatedAt).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}{' '}
            · {readMinutes(doc.wordCount)} min read
          </div>
          <RichEditor initial={content} editable={false} label={doc.title} />
        </article>
      </main>
      <ExportDialog
        open={downloading}
        onClose={() => setDownloading(false)}
        title={doc.title}
        url={`/api/public/docs/${token}/export`}
        download
      />
    </div>
  );
}
