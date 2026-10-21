'use client';
import type { AnyExtension } from '@tiptap/core';
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TableKit } from '@tiptap/extension-table';
import { Placeholder } from '@tiptap/extensions';
import { useEffect, useRef, type ReactNode } from 'react';
import { cx, type IconName } from '@/ui';
import { Icon } from '@/ui';

export interface EditorChange {
  json: Record<string, unknown>;
  text: string;
}

/**
 * The document editor (Tiptap): headings, bold/italic, lists, tables and quotes.
 * `initial` is editor JSON or HTML; `onChange` fires on every edit (the caller debounces saving).
 */
export function RichEditor({
  initial,
  editable,
  onChange,
  onReady,
  extensions = [],
  label = 'Document text',
}: {
  initial: Record<string, unknown> | string;
  editable: boolean;
  onChange?: (c: EditorChange) => void;
  onReady?: (e: Editor) => void;
  /** Extra editor extensions (read once, when the editor is created). */
  extensions?: AnyExtension[];
  label?: string;
}) {
  const change = useRef(onChange);
  useEffect(() => {
    change.current = onChange;
  });
  const editor = useEditor({
    immediatelyRender: false,
    editable,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, link: { openOnClick: false, autolink: true } }),
      TableKit.configure({ table: { resizable: false } }),
      Placeholder.configure({ placeholder: 'Start writing…' }),
      ...extensions,
    ],
    content: initial,
    editorProps: {
      attributes: {
        class: 'de-prose',
        'aria-label': label,
        ...(editable && { role: 'textbox', 'aria-multiline': 'true' }),
      },
    },
    onUpdate: ({ editor }) =>
      change.current?.({
        json: editor.getJSON() as Record<string, unknown>,
        text: editor.getText({ blockSeparator: '\n' }),
      }),
    onCreate: ({ editor }) => onReady?.(editor as Editor),
  });

  useEffect(() => {
    if (editor && editor.isEditable !== editable) editor.setEditable(editable, false);
  }, [editor, editable]);

  return <EditorContent editor={editor} className="de-editor" />;
}

type Tool = {
  icon?: IconName;
  text?: string;
  label: string;
  run: (e: Editor) => void;
  on?: (e: Editor) => boolean;
};

const TOOLS: (Tool | 'sep')[] = [
  {
    text: 'H1',
    label: 'Heading 1',
    run: (e) => e.chain().focus().toggleHeading({ level: 1 }).run(),
    on: (e) => e.isActive('heading', { level: 1 }),
  },
  {
    text: 'H2',
    label: 'Heading 2',
    run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
    on: (e) => e.isActive('heading', { level: 2 }),
  },
  {
    text: 'B',
    label: 'Bold',
    run: (e) => e.chain().focus().toggleBold().run(),
    on: (e) => e.isActive('bold'),
  },
  {
    text: 'I',
    label: 'Italic',
    run: (e) => e.chain().focus().toggleItalic().run(),
    on: (e) => e.isActive('italic'),
  },
  'sep',
  {
    icon: 'list-ordered',
    label: 'Numbered list',
    run: (e) => e.chain().focus().toggleOrderedList().run(),
    on: (e) => e.isActive('orderedList'),
  },
  {
    icon: 'list-checks',
    label: 'Bulleted list',
    run: (e) => e.chain().focus().toggleBulletList().run(),
    on: (e) => e.isActive('bulletList'),
  },
  {
    icon: 'table',
    label: 'Insert table',
    run: (e) => e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  {
    icon: 'quote',
    label: 'Quote',
    run: (e) => e.chain().focus().toggleBlockquote().run(),
    on: (e) => e.isActive('blockquote'),
  },
];

/** Formatting toolbar from the design (H1, H2, B, I · lists, table, quote). */
export function EditorToolbar({
  editor,
  disabled,
  children,
}: {
  editor: Editor | null;
  disabled?: boolean;
  /** Extra controls after the formatting buttons (e.g. Ask AI). */
  children?: ReactNode;
}) {
  const active = useEditorState({
    editor,
    selector: ({ editor: e }) => (e ? TOOLS.map((t) => (t !== 'sep' && t.on ? t.on(e) : false)) : []),
  });
  return (
    <div className="de-toolbar" role="toolbar" aria-label="Formatting">
      {TOOLS.map((t, i) =>
        t === 'sep' ? (
          <span key={i} className="de-sep" aria-hidden />
        ) : (
          <button
            key={t.label}
            type="button"
            className={cx('de-tool', t.text === 'B' && 'b', t.text === 'I' && 'i', active?.[i] && 'on')}
            aria-label={t.label}
            title={t.label}
            aria-pressed={t.on ? !!active?.[i] : undefined}
            disabled={disabled || !editor}
            onMouseDown={(ev) => ev.preventDefault()}
            onClick={() => editor && t.run(editor)}
          >
            {t.icon ? <Icon name={t.icon} size={16} /> : t.text}
          </button>
        ),
      )}
      {children}
    </div>
  );
}
