import type { Metadata } from 'next';
import { EmptyState, Page } from '@/components/page/Page';

export const metadata: Metadata = { title: 'Files' };

export default function FilesPage() {
  return (
    <Page title="Files" description="PDF, Word, text and Markdown. Ask questions about anything you upload.">
      <EmptyState icon="folder" title="No files yet">
        Files you upload, and files you attach in chats, will appear here.
      </EmptyState>
    </Page>
  );
}
