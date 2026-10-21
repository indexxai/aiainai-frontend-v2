import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { ImageStudio } from '@/components/images/ImageStudio';
import { getImageCaps, getMe, getModelMenu, serverApi } from '@/lib/session';

type Params = { params: Promise<{ id: string }>; searchParams: Promise<{ i?: string; saved?: string }> };

export const metadata: Metadata = { title: 'Image' };

export default async function ImageBatchPage({ params, searchParams }: Params) {
  const { id } = await params;
  const sp = await searchParams;
  const i = Number(sp.i ?? 0);
  const cookie = (await cookies()).toString();
  const [res, menu, me, caps] = await Promise.all([
    serverApi().GET('/api/images/{id}', { params: { path: { id } }, headers: { cookie }, cache: 'no-store' }),
    getModelMenu('image'),
    getMe(),
    getImageCaps(),
  ]);
  if (res.response.status === 404) notFound();
  if (!res.data) throw new Error(`Could not load the images (status ${res.response.status})`);
  return (
    <ImageStudio
      key={id}
      menu={menu}
      credits={me?.credits.spendable ?? 0}
      caps={caps}
      initial={res.data}
      initialIndex={Number.isInteger(i) && i >= 0 && i < res.data.count ? i : 0}
      saved={sp.saved}
    />
  );
}
