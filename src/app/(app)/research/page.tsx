import type { Metadata } from 'next';
import { EmptyState, Page } from '@/components/page/Page';

export const metadata: Metadata = { title: 'Research' };

export default function ResearchPage() {
  return (
    <Page title="Research" description="Research reports and fact checks, with every source listed.">
      <EmptyState icon="telescope" title="Your reports will appear here">
        Ask a question and get a report that cites where each fact came from, or check whether a claim is
        true.
      </EmptyState>
    </Page>
  );
}
