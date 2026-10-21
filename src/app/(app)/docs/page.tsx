import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { DocsStart, type DocProject } from '@/components/docs/DocsStart';
import { getMe, getModelMenu, serverApi } from '@/lib/session';

export const metadata: Metadata = { title: 'Docs' };

/** `?project=<id>` starts the document inside that project (an unknown project is ignored). */
async function projectOf(id: string | undefined): Promise<DocProject | null> {
  if (!id || !/^[a-f0-9]{24}$/.test(id)) return null;
  const cookie = (await cookies()).toString();
  const res = await serverApi().GET('/api/projects/{id}', {
    params: { path: { id } },
    headers: { cookie },
    cache: 'no-store',
  });
  return res.data ? { id: res.data.project.id, name: res.data.project.name } : null;
}

export default async function DocsPage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const { project: projectId } = await searchParams;
  const [menu, me, project] = await Promise.all([getModelMenu('text'), getMe(), projectOf(projectId)]);
  return (
    <DocsStart
      key={project?.id ?? 'none'}
      menu={menu}
      credits={me?.credits.spendable ?? 0}
      project={project}
    />
  );
}
