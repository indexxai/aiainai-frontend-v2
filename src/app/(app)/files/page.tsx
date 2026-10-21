import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { FilesPage } from '@/components/files/FilesPage';
import { serverApi } from '@/lib/session';

export const metadata: Metadata = { title: 'Files' };

export default async function Files() {
  const cookie = (await cookies()).toString();
  const { data } = await serverApi().GET('/api/files', { headers: { cookie }, cache: 'no-store' });
  return <FilesPage initial={data ?? { items: [], nextCursor: null }} />;
}
