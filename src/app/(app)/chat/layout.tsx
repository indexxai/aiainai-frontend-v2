import { cookies } from 'next/headers';
import { ChatLayout } from '@/components/chat/ChatLayout';
import { ChatsPanel } from '@/components/chat/ChatsPanel';
import { serverApi } from '@/lib/session';

export default async function ChatSectionLayout({ children }: { children: React.ReactNode }) {
  const cookie = (await cookies()).toString();
  const { data } = await serverApi().GET('/api/chats', { headers: { cookie }, cache: 'no-store' });
  return (
    <ChatLayout panel={<ChatsPanel items={data?.items ?? []} nextCursor={data?.nextCursor ?? null} />}>
      {children}
    </ChatLayout>
  );
}
