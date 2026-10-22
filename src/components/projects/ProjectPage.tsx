'use client';
import { useJack } from '@/lib/assistant';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { Banner, Button, Dialog, Field, Icon, IconButton } from '@/ui';
import { Composer } from '@/components/composer/Composer';
import { useShellCrumbs } from '@/components/shell/crumbs';
import { api, type Schemas } from '@/lib/api/client';
import { toApiError } from '@/lib/api/errors';
import { startChat } from '@/lib/chat/start';
import { ACCEPT, KIND_ICON, KIND_LABEL, fileSize, fileUrl, uploadFile } from '@/lib/files/files';
import type { ModelMenu } from '@/lib/models';
import { AddToProjectDialog, type ItemKind } from './AddToProjectDialog';
import './projects.css';
import { VoiceField } from '@/components/voice/Voice';

type Detail = Schemas['ProjectDetailDto'];

const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const DOC_STATE: Record<string, string> = {
  draft: 'Outline',
  writing: 'Writing…',
  ready: 'Ready',
  stopped: 'Stopped',
  failed: 'Didn’t finish',
};

/**
 * One project: start a chat in it, the instructions Jack follows in its chats, and the chats,
 * documents and files it holds.
 */
export function ProjectPage({ initial, menu }: { initial: Detail; menu: ModelMenu }) {
  const jack = useJack();
  const router = useRouter();
  const [d, setD] = useState(initial);
  const p = d.project;
  const [model, setModel] = useState(menu.selected);
  const [appsOff, setAppsOff] = useState<string[]>([]);
  const [instructions, setInstructions] = useState(p.instructions);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ tone: 'neutral' | 'danger'; text: string } | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(p.name);
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState<ItemKind | null>(null);
  const [uploading, setUploading] = useState(0);
  const picker = useRef<HTMLInputElement>(null);

  useShellCrumbs({
    path: `/projects/${p.id}`,
    items: [{ label: 'Projects', href: '/projects' }, { label: p.name }],
    back: '/projects',
  });

  const reload = async () => {
    const { data } = await api.GET('/api/projects/{id}', { params: { path: { id: p.id } } });
    if (data) setD(data);
  };

  const saveInstructions = async () => {
    setSaving(true);
    const { data, error } = await api.PATCH('/api/projects/{id}', {
      params: { path: { id: p.id } },
      body: { instructions },
    });
    setSaving(false);
    if (!data) return setToast({ tone: 'danger', text: toApiError(error).message });
    setD((cur) => ({ ...cur, project: data }));
    setToast({
      tone: 'neutral',
      text: `Instructions saved. ${jack.name} follows them in every chat and document in this project.`,
    });
  };

  const rename = async () => {
    if (!newName.trim()) return;
    setBusy(true);
    const { data, error } = await api.PATCH('/api/projects/{id}', {
      params: { path: { id: p.id } },
      body: { name: newName.trim() },
    });
    setBusy(false);
    if (!data) return setToast({ tone: 'danger', text: toApiError(error).message });
    setD((cur) => ({ ...cur, project: data }));
    setRenaming(false);
  };

  const remove = async () => {
    setBusy(true);
    const { error } = await api.DELETE('/api/projects/{id}', { params: { path: { id: p.id } } });
    setBusy(false);
    if (error) return setToast({ tone: 'danger', text: toApiError(error).message });
    router.push('/projects');
    router.refresh();
  };

  const add = async (kind: ItemKind, id: string) => {
    const { error } = await api.POST('/api/projects/{id}/items', {
      params: { path: { id: p.id } },
      body: { kind, id },
    });
    if (error) setToast({ tone: 'danger', text: toApiError(error).message });
    await reload();
  };

  const takeOut = async (kind: ItemKind, id: string, label: string) => {
    const { error } = await api.POST('/api/projects/{id}/items/remove', {
      params: { path: { id: p.id } },
      body: { kind, id },
    });
    if (error) return setToast({ tone: 'danger', text: toApiError(error).message });
    setToast({ tone: 'neutral', text: `${label} is out of this project. It’s still in your space.` });
    await reload();
  };

  const upload = async (list: FileList) => {
    const files = Array.from(list).slice(0, 10);
    setUploading(files.length);
    const results = await Promise.all(
      files.map(async (f) => {
        const r = await uploadFile(f);
        if (!('file' in r)) return r.error;
        const { error } = await api.POST('/api/projects/{id}/items', {
          params: { path: { id: p.id } },
          body: { kind: 'file', id: r.file.id },
        });
        return error ? toApiError(error).message : null;
      }),
    );
    setUploading(0);
    const bad = results.filter(Boolean);
    if (bad.length) setToast({ tone: 'danger', text: bad.join(' ') });
    await reload();
  };

  return (
    <div className="pjp">
      <div className="pjp-head">
        <div>
          <h1 className="title-lg">{p.name}</h1>
          <p className="pjp-meta">
            {count(p.chatCount, 'chat', 'chats')} · {count(p.docCount, 'document', 'documents')} ·{' '}
            {count(p.fileCount, 'file', 'files')}
          </p>
        </div>
        <IconButton
          icon="pencil"
          label="Rename project"
          onClick={() => {
            setNewName(p.name);
            setRenaming(true);
          }}
        />
        <IconButton icon="trash-2" label="Delete project" onClick={() => setDeleting(true)} />
      </div>

      {toast && (
        <Banner tone={toast.tone} onDismiss={() => setToast(null)}>
          {toast.text}
        </Banner>
      )}

      <Composer
        menu={menu}
        model={model}
        onModelChange={setModel}
        elevated
        attachments
        apps={{ off: appsOff, onChange: setAppsOff }}
        placeholder={`Ask ${jack.name} about ${p.name}…`}
        label={`Start a chat in ${p.name}`}
        onSend={async (text, files) => {
          const r = await startChat(text, model, files, p.id, appsOff);
          if ('error' in r) {
            setToast({ tone: 'danger', text: r.error.message });
            return false;
          }
          router.push(r.href);
        }}
      />

      <section className="pjp-sec" aria-labelledby="pjp-ins">
        <div className="pjp-sec-head">
          <h2 id="pjp-ins">Instructions for {jack.name}</h2>
        </div>
        <p className="pjp-hint">
          {jack.name} follows these in every chat and document in this project: background, goals, or how you
          want answers.
        </p>
        <VoiceField value={instructions} onChange={setInstructions} maxLength={4000}>
          <textarea
            className="pj-textarea"
            aria-label={`Instructions for ${jack.name}`}
            rows={4}
            maxLength={4000}
            placeholder="e.g. “We’re planning a family trip to Dubai in November. Budget is 2,000 dollars. Keep answers short.”"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
          />
        </VoiceField>
        {instructions.trim() !== p.instructions.trim() && (
          <div className="pjp-save">
            <Button variant="primary" size="sm" loading={saving} onClick={() => void saveInstructions()}>
              Save instructions
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setInstructions(p.instructions)}>
              Undo
            </Button>
          </div>
        )}
      </section>

      <section className="pjp-sec" aria-labelledby="pjp-chats">
        <div className="pjp-sec-head">
          <h2 id="pjp-chats">Chats</h2>
          <Button variant="ghost" size="sm" icon="plus" onClick={() => setAdding('chat')}>
            Add chats
          </Button>
        </div>
        {d.chats.length === 0 ? (
          <p className="pjp-none">No chats yet. Ask {jack.name} something above to start one here.</p>
        ) : (
          <ul className="pjp-list">
            {d.chats.map((c) => (
              <li key={c.id} className="pjp-row">
                <span className="pjp-row-ic" aria-hidden>
                  <Icon name="message-square" size={16} />
                </span>
                <span className="pjp-row-main">
                  <Link href={`/chat/${c.id}`}>{c.title}</Link>
                  <span>
                    {c.preview ? `${c.preview.slice(0, 90)} · ` : ''}
                    {day(c.lastMessageAt)}
                  </span>
                </span>
                <IconButton
                  icon="x"
                  size="sm"
                  label={`Take ${c.title} out of this project`}
                  onClick={() => void takeOut('chat', c.id, c.title)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="pjp-sec" aria-labelledby="pjp-docs">
        <div className="pjp-sec-head">
          <h2 id="pjp-docs">Documents</h2>
          <Button variant="ghost" size="sm" icon="plus" onClick={() => setAdding('doc')}>
            Add documents
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon="pen-line"
            onClick={() => router.push(`/docs?project=${p.id}`)}
          >
            New document
          </Button>
        </div>
        {d.docs.length === 0 ? (
          <p className="pjp-none">No documents yet. Documents written here follow the instructions above.</p>
        ) : (
          <ul className="pjp-list">
            {d.docs.map((doc) => (
              <li key={doc.id} className="pjp-row">
                <span className="pjp-row-ic" aria-hidden>
                  <Icon name="file-text" size={16} />
                </span>
                <span className="pjp-row-main">
                  <Link href={`/docs/${doc.id}`}>{doc.title}</Link>
                  <span>
                    {DOC_STATE[doc.status] ?? doc.status} · {day(doc.updatedAt)}
                  </span>
                </span>
                <IconButton
                  icon="x"
                  size="sm"
                  label={`Take ${doc.title} out of this project`}
                  onClick={() => void takeOut('doc', doc.id, doc.title)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="pjp-sec" aria-labelledby="pjp-files">
        <div className="pjp-sec-head">
          <h2 id="pjp-files">Files</h2>
          <Button variant="ghost" size="sm" icon="plus" onClick={() => setAdding('file')}>
            Add files
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon="upload"
            loading={uploading > 0}
            onClick={() => picker.current?.click()}
          >
            Upload
          </Button>
          <input
            ref={picker}
            type="file"
            multiple
            accept={ACCEPT}
            hidden
            onChange={(e) => {
              if (e.target.files?.length) void upload(e.target.files);
              e.target.value = '';
            }}
          />
        </div>
        <p className="pjp-hint">{jack.name} reads these in every chat and document in this project.</p>
        {d.files.length === 0 ? (
          <p className="pjp-none">No files yet.</p>
        ) : (
          <ul className="pjp-list">
            {d.files.map((f) => (
              <li key={f.id} className="pjp-row">
                <span className="pjp-row-ic" aria-hidden>
                  <Icon name={KIND_ICON[f.kind]} size={16} />
                </span>
                <span className="pjp-row-main">
                  <a href={fileUrl(f.id)} target="_blank" rel="noreferrer">
                    {f.name}
                  </a>
                  <span>
                    {KIND_LABEL[f.kind]} · {fileSize(f.bytes)}
                    {f.note ? ` · ${f.note}` : ''}
                  </span>
                </span>
                <IconButton
                  icon="x"
                  size="sm"
                  label={`Take ${f.name} out of this project`}
                  onClick={() => void takeOut('file', f.id, f.name)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <AddToProjectDialog kind={adding} projectId={p.id} onClose={() => setAdding(null)} onAdd={add} />

      <Dialog
        open={renaming}
        title="Rename project"
        width={440}
        onClose={() => setRenaming(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setRenaming(false)}>
              Cancel
            </Button>
            <Button variant="primary" loading={busy} disabled={!newName.trim()} onClick={() => void rename()}>
              Save
            </Button>
          </>
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void rename();
          }}
        >
          <Field
            label="Name"
            value={newName}
            maxLength={120}
            autoFocus
            onChange={(e) => setNewName(e.target.value)}
          />
        </form>
      </Dialog>

      <Dialog
        open={deleting}
        title={`Delete ${p.name}?`}
        description="The project goes away, but its chats, documents and files are kept in your space."
        width={440}
        onClose={() => setDeleting(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleting(false)}>
              Cancel
            </Button>
            <Button variant="primary" icon="trash-2" loading={busy} onClick={() => void remove()}>
              Delete project
            </Button>
          </>
        }
      />
    </div>
  );
}
