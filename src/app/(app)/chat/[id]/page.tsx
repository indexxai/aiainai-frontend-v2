import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { ChatThread } from '@/components/chat/ChatThread';
import { getMe, getModelMenu, serverApi } from '@/lib/session';

type Params = { params: Promise<{ id: string }> };

async function loadChat(id: string) {
  const cookie = (await cookies()).toString();
  const { data, response } = await serverApi().GET('/api/chats/{id}', {
    params: { path: { id } },
    headers: { cookie },
    cache: 'no-store',
  });
  if (response.status === 404) notFound();
  if (!data) throw new Error(`Could not load the chat (status ${response.status})`);
  return data;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const cookie = (await cookies()).toString();
  const { data } = await serverApi().GET('/api/chats/{id}', {
    params: { path: { id } },
    headers: { cookie },
  });
  return { title: data?.chat.title ?? 'Chat' };
}

export default async function ChatThreadPage({ params }: Params) {
  const { id } = await params;
  const [detail, menu, me] = await Promise.all([loadChat(id), getModelMenu('text'), getMe()]);
  const resetsOn = me
    ? new Date(me.workspace.periodEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    : undefined;
  return <ChatThread key={id} detail={detail} menu={menu} resetsOn={resetsOn} />;
}
