'use client';
import { useJack } from '@/lib/assistant';
import Link from 'next/link';
import { useState } from 'react';
import { Button, Icon } from '@/ui';
import type { Schemas } from '@/lib/api/client';
import { NewProjectDialog } from './NewProjectDialog';
import './projects.css';

type Project = Schemas['ProjectDto'];

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Projects in this space, most recently used first. */
export function ProjectsList({ projects }: { projects: Project[] }) {
  const jack = useJack();
  const [creating, setCreating] = useState(false);
  return (
    <div className="pjl">
      <div className="pjl-head">
        <div>
          <h1 className="title-lg">Projects</h1>
          <p className="pjl-sub">
            Keep chats, documents and files about one thing together. {jack.name} reads a project’s
            instructions and files in every chat inside it.
          </p>
        </div>
        <Button variant="primary" icon="plus" onClick={() => setCreating(true)}>
          New project
        </Button>
      </div>
      {projects.length === 0 ? (
        <div className="pjl-empty">
          <Icon name="folder" size={28} />
          <b>No projects yet</b>
          <span>Start one for a trip, a launch, a client or anything you keep coming back to.</span>
          <Button variant="secondary" size="sm" onClick={() => setCreating(true)}>
            Start a project
          </Button>
        </div>
      ) : (
        <ul className="pjl-grid">
          {projects.map((p) => (
            <li key={p.id}>
              <Link href={`/projects/${p.id}`} className="pjl-card">
                <span className="pjl-name">
                  <Icon name="folder" size={18} />
                  {p.name}
                </span>
                {p.instructions && <p className="pjl-ins">{p.instructions}</p>}
                <span className="pjl-meta">
                  {count(p.chatCount, 'chat', 'chats')} · {count(p.docCount, 'document', 'documents')} ·{' '}
                  {count(p.fileCount, 'file', 'files')}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <NewProjectDialog open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}
