'use client';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import './chat.css';

/**
 * Conversations frame (v2). A conversation with Jack fills the page, with his plan on the right;
 * the list of all conversations is its own page at /chat.
 */
export function ChatLayout({ panel, children }: { panel: ReactNode; children: ReactNode }) {
  const pathname = usePathname();
  const list = pathname === '/chat';
  return (
    <div className="chat-layout" data-view={list ? 'list' : 'content'}>
      {list ? panel : <div className="chat-content">{children}</div>}
    </div>
  );
}
