import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { ProjectsList } from '@/components/projects/ProjectsList';
import { serverApi } from '@/lib/session';

export const metadata: Metadata = { title: 'Projects' };

export default async function Projects() {
  const cookie = (await cookies()).toString();
  const { data } = await serverApi().GET('/api/projects', { headers: { cookie }, cache: 'no-store' });
  return <ProjectsList projects={data ?? []} />;
}
