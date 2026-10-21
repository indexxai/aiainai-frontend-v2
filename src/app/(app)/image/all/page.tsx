import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { ImageGallery } from '@/components/images/ImageGallery';
import { serverApi } from '@/lib/session';

export const metadata: Metadata = { title: 'All images' };

export default async function AllImagesPage() {
  const cookie = (await cookies()).toString();
  const { data } = await serverApi().GET('/api/images', { headers: { cookie }, cache: 'no-store' });
  return <ImageGallery items={data?.items ?? []} nextCursor={data?.nextCursor ?? null} />;
}
