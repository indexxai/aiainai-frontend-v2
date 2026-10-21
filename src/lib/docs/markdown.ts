/**
 * Editor JSON (Tiptap / ProseMirror) → Markdown, for sending the document (or a selection) to
 * the AI. Covers what the editor can make: headings, paragraphs, bold/italic/strike/code, links,
 * lists, quotes, code blocks, rules and tables.
 */
export interface PmNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: PmNode[];
  text?: string;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
}

export function toMarkdown(doc: PmNode): string {
  return blocks(doc.content ?? [], '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function blocks(nodes: PmNode[], indent: string): string {
  return nodes
    .map((n) => block(n, indent))
    .filter((s) => s !== null)
    .join('\n\n');
}

function block(n: PmNode, indent: string): string | null {
  switch (n.type) {
    case 'heading':
      return `${'#'.repeat(Number(n.attrs?.level ?? 2))} ${inline(n.content)}`;
    case 'paragraph':
      return indent + inline(n.content);
    case 'blockquote':
      return blocks(n.content ?? [], '')
        .split('\n')
        .map((l) => `> ${l}`.trimEnd())
        .join('\n');
    case 'codeBlock':
      return `\`\`\`${(n.attrs?.language as string) ?? ''}\n${text(n)}\n\`\`\``;
    case 'horizontalRule':
      return '---';
    case 'bulletList':
    case 'orderedList':
      return list(n, indent);
    case 'table':
      return table(n);
    default:
      return n.content ? blocks(n.content, indent) : (n.text ?? null);
  }
}

function list(n: PmNode, indent: string): string {
  const start = Number(n.attrs?.start ?? 1);
  return (n.content ?? [])
    .map((item, i) => {
      const bullet = n.type === 'orderedList' ? `${start + i}. ` : '- ';
      const [first, ...rest] = item.content ?? [];
      const head = first ? (block(first, '') ?? '') : '';
      const pad = indent + ' '.repeat(bullet.length);
      const tail = rest.map((c) => block(c, pad)).filter((s) => s !== null);
      return [indent + bullet + head, ...tail].join('\n');
    })
    .join('\n');
}

function table(n: PmNode): string {
  const rows = (n.content ?? []).map((r) =>
    (r.content ?? []).map((c) =>
      blocks(c.content ?? [], '')
        .replace(/\n+/g, ' ')
        .replace(/\|/g, '\\|'),
    ),
  );
  if (!rows.length) return '';
  const width = Math.max(...rows.map((r) => r.length));
  const line = (r: string[]) => `| ${Array.from({ length: width }, (_, i) => r[i] ?? '').join(' | ')} |`;
  return [
    line(rows[0]!),
    `| ${Array.from({ length: width }, () => '---').join(' | ')} |`,
    ...rows.slice(1).map(line),
  ].join('\n');
}

function text(n: PmNode): string {
  return n.text ?? (n.content ?? []).map(text).join('');
}

function inline(nodes: PmNode[] = []): string {
  return nodes
    .map((n) => {
      if (n.type === 'hardBreak') return '  \n';
      if (n.type !== 'text') return text(n);
      let t = n.text ?? '';
      const marks = n.marks ?? [];
      const has = (m: string) => marks.some((x) => x.type === m);
      if (has('code')) return `\`${t}\``;
      if (has('bold')) t = `**${t}**`;
      if (has('italic')) t = `*${t}*`;
      if (has('strike')) t = `~~${t}~~`;
      const link = marks.find((x) => x.type === 'link');
      if (link) t = `[${t}](${String(link.attrs?.href ?? '')})`;
      return t;
    })
    .join('');
}
