import type { Metadata } from 'next';
import { DocsStart } from '@/components/docs/DocsStart';
import { getMe, getModelMenu } from '@/lib/session';

export const metadata: Metadata = { title: 'Docs' };

export default async function DocsPage() {
  const [menu, me] = await Promise.all([getModelMenu('text'), getMe()]);
  return <DocsStart menu={menu} credits={me?.credits.spendable ?? 0} />;
}
