import type { Metadata } from 'next';
import { EmptyState, Page } from '@/components/page/Page';

export const metadata: Metadata = { title: 'Help' };

export default function HelpPage() {
  return (
    <Page title="Help">
      <EmptyState icon="circle-help" title="Help centre">
        Guides for every tool will live here.
      </EmptyState>
    </Page>
  );
}
