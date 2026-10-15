import type { Metadata } from 'next';
import { EmptyState, Page } from '@/components/page/Page';

export const metadata: Metadata = { title: 'Inbox' };

export default function InboxPage() {
  return (
    <Page title="Inbox">
      <EmptyState icon="circle-check" title="You’re all caught up">
        Your agents will ask here when they need your approval. Finished reports and shared documents show up
        here too.
      </EmptyState>
    </Page>
  );
}
