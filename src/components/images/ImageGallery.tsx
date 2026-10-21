'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Button, Icon } from '@/ui';
import { useShellCrumbs } from '@/components/shell/crumbs';
import { api } from '@/lib/api/client';
import { groupLabel } from '@/lib/chat/client';
import type { ImageBatch } from '@/lib/images/types';
import './images.css';

/** All images (design: ImageFlow gallery): every finished image, newest first, by day. */
export function ImageGallery({ items, nextCursor }: { items: ImageBatch[]; nextCursor: string | null }) {
  const pathname = usePathname();
  useShellCrumbs({
    path: pathname,
    items: [{ label: 'Images', href: '/image' }, { label: 'All images' }],
    back: '/image',
  });
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<ImageBatch[] | null>(null);
  const [more, setMore] = useState<{ items: ImageBatch[]; cursor: string | null }>({
    items: [],
    cursor: nextCursor,
  });

  useEffect(() => {
    const q = query.trim();
    if (!q) return;
    const t = setTimeout(async () => {
      const { data } = await api.GET('/api/images', { params: { query: { q } } });
      setFound(data?.items ?? []);
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const searching = query.trim().length > 0;
  const batches = useMemo(
    () => (searching ? (found ?? []) : [...items, ...more.items]),
    [searching, found, items, more.items],
  );
  const groups = useMemo(() => {
    const out: { label: string; tiles: { batch: ImageBatch; index: number; thumb: string }[] }[] = [];
    for (const b of batches)
      for (const img of b.images) {
        if (img.status !== 'done' || !img.thumbUrl) continue;
        const label = groupLabel(b.createdAt);
        let g = out.find((x) => x.label === label);
        if (!g) out.push((g = { label, tiles: [] }));
        g.tiles.push({ batch: b, index: img.index, thumb: img.thumbUrl });
      }
    return out;
  }, [batches]);

  return (
    <div className="ig">
      <header className="is-header">
        <nav aria-label="Breadcrumb" className="is-crumb">
          <Link href="/image">Images</Link>
          <span className="sep" aria-hidden>
            /
          </span>
          <span aria-current="page">All images</span>
        </nav>
        <Link href="/image" className="as-btn primary sm">
          <Icon name="plus" size={16} />
          New image
        </Link>
        <Link href="/approvals" className="as-iconbtn" aria-label="Approvals" title="Approvals">
          <Icon name="bell" size={20} />
        </Link>
      </header>
      <div className="ig-body">
        <div className="ig-head">
          <h1 className="title-lg">All images</h1>
          <div className="ig-search">
            <Icon name="search" size={16} />
            <input
              type="search"
              aria-label="Search by prompt"
              placeholder="Search by prompt"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (!e.target.value.trim()) setFound(null);
              }}
            />
          </div>
        </div>

        {groups.length === 0 ? (
          <div className="ig-empty">
            <Icon name="image" size={28} />
            <b>{query.trim() ? 'No images match' : 'No images yet'}</b>
            <span>
              {query.trim()
                ? `Nothing found for “${query.trim()}”.`
                : 'Describe an image and it will appear here.'}
            </span>
            {!query.trim() && (
              <Link href="/image" className="as-btn secondary sm">
                Make an image
              </Link>
            )}
          </div>
        ) : (
          groups.map((g) => (
            <section key={g.label} aria-label={g.label}>
              <h2 className="is-ov ig-group">{g.label}</h2>
              <div className="ig-grid">
                {g.tiles.map((t) => (
                  <Link
                    key={`${t.batch.id}-${t.index}`}
                    href={`/image/${t.batch.id}?i=${t.index}`}
                    className="ig-tile"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- served by the API with auth */}
                    <img src={t.thumb} alt={t.batch.prompt} loading="lazy" />
                    {t.batch.kind !== 'generate' && <span className="ig-kind">{KIND_TAG[t.batch.kind]}</span>}
                    <span className="ig-cap">{t.batch.title}</span>
                  </Link>
                ))}
              </div>
            </section>
          ))
        )}
        {!query.trim() && more.cursor && (
          <Button
            size="sm"
            variant="ghost"
            className="ig-more"
            onClick={async () => {
              const { data } = await api.GET('/api/images', { params: { query: { cursor: more.cursor! } } });
              if (data) setMore((m) => ({ items: [...m.items, ...data.items], cursor: data.nextCursor }));
            }}
          >
            Show more
          </Button>
        )}
      </div>
    </div>
  );
}

const KIND_TAG: Record<ImageBatch['kind'], string> = {
  generate: '',
  variations: 'Variation',
  edit: 'Edited',
  upscale: 'Upscaled',
  cutout: 'No background',
};
