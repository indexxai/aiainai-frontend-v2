import type { Metadata } from 'next';
import { ImageStudio } from '@/components/images/ImageStudio';
import { getImageCaps, getMe, getModelMenu } from '@/lib/session';

export const metadata: Metadata = { title: 'New image' };

export default async function ImagePage() {
  const [menu, me, caps] = await Promise.all([getModelMenu('image'), getMe(), getImageCaps()]);
  return <ImageStudio menu={menu} credits={me?.credits.spendable ?? 0} caps={caps} initial={null} />;
}
