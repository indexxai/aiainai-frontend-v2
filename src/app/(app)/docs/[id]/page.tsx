import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { DocEditor } from '@/components/docs/DocEditor';
import { getMe, getModelMenu, serverApi } from '@/lib/session';

type Params = { params: Promise<{ id: string }> };

async function load(id: string) {
  const cookie = (await cookies()).toString();
  const { data, response } = await serverApi().GET('/api/docs/{id}', {
    params: { path: { id } },
    headers: { cookie },
    cache: 'no-store',
  });
  if (response.status === 404) notFound();
  if (!data) throw new Error(`Could not load the document (status ${response.status})`);
  return data;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const cookie = (await cookies()).toString();
  const { data } = await serverApi().GET('/api/docs/{id}', { params: { path: { id } }, headers: { cookie } });
  return { title: data?.title ?? 'Document' };
}

export default async function DocPage({ params }: Params) {
  const { id } = await params;
  const [doc, me, menu] = await Promise.all([load(id), getMe(), getModelMenu('text')]);
  return (
    <DocEditor
      key={id}
      initial={doc}
      author={me?.user.name || 'you'}
      menu={menu}
      me={{ name: me?.user.name ?? '', email: me?.user.email ?? '' }}
      credits={me?.credits.spendable ?? 0}
    />
  );
}
