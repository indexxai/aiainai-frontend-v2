import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { ProjectPage } from '@/components/projects/ProjectPage';
import { getModelMenu, serverApi } from '@/lib/session';

export const metadata: Metadata = { title: 'Project' };

export default async function Project({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookie = (await cookies()).toString();
  const [res, menu] = await Promise.all([
    serverApi().GET('/api/projects/{id}', {
      params: { path: { id } },
      headers: { cookie },
      cache: 'no-store',
    }),
    getModelMenu('text'),
  ]);
  if (res.response.status === 404) notFound();
  if (!res.data) throw new Error(`Could not load the project (status ${res.response.status})`);
  return <ProjectPage key={id} initial={res.data} menu={menu} />;
}
