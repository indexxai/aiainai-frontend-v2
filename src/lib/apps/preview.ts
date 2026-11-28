export interface PreviewFile {
  path: string;
  content: string;
}

/** `a/b.html` + `../c.css` → `c.css`. Returns null when the link leaves the project or is external. */
export function resolveLink(from: string, href: string): string | null {
  if (/^([a-z][a-z0-9+.-]*:|\/\/|#|data:)/i.test(href)) return null;
  const clean = href.split(/[?#]/)[0] ?? '';
  const parts = from.split('/').slice(0, -1);
  for (const seg of clean.split('/')) {
    if (!seg || seg === '.') continue;
    if (seg === '..') {
      if (!parts.length) return null;
      parts.pop();
    } else parts.push(seg);
  }
  return parts.join('/');
}

const escapeScript = (s: string) => s.replace(/<\/script/gi, '<\\/script');
const escapeStyle = (s: string) => s.replace(/<\/style/gi, '<\\/style');

/**
 * One self-contained HTML string for the preview iframe: the page's own CSS and JavaScript
 * files are inlined, so the preview needs no server. Other pages open by clicking links are not
 * supported; the entry is `index.html` (or the first .html file).
 */
export function buildPreview(files: PreviewFile[], entry?: string): string | null {
  const byPath = new Map(files.map((f) => [f.path, f.content]));
  const page =
    entry && byPath.has(entry)
      ? entry
      : byPath.has('index.html')
        ? 'index.html'
        : files.find((f) => f.path.endsWith('.html'))?.path;
  if (!page) return null;
  let html = byPath.get(page) ?? '';
  html = html.replace(/<link\b[^>]*>/gi, (tag) => {
    if (!/rel\s*=\s*["']?stylesheet/i.test(tag)) return tag;
    const href = /href\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1];
    const target = href ? resolveLink(page, href) : null;
    const css = target ? byPath.get(target) : undefined;
    return css === undefined ? tag : `<style>${escapeStyle(css)}</style>`;
  });
  html = html.replace(
    /<script\b([^>]*)\bsrc\s*=\s*["']([^"']+)["']([^>]*)>\s*<\/script>/gi,
    (tag, a: string, src: string, b: string) => {
      const target = resolveLink(page, src);
      const js = target ? byPath.get(target) : undefined;
      const attrs = `${a} ${b}`.trim();
      return js === undefined ? tag : `<script${attrs ? ` ${attrs}` : ''}>${escapeScript(js)}</script>`;
    },
  );
  return html;
}

/** Download-friendly language label for the editor header. */
export function languageOf(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  return (
    (
      {
        html: 'HTML',
        css: 'CSS',
        js: 'JavaScript',
        mjs: 'JavaScript',
        json: 'JSON',
        md: 'Markdown',
        ts: 'TypeScript',
        svg: 'SVG',
        txt: 'Text',
      } as Record<string, string>
    )[ext] ?? 'Text'
  );
}

/** Folders first, then files, both A–Z, so the tree reads like an editor's. */
export function sortPaths(paths: string[]): string[] {
  return [...paths].sort((a, b) => {
    const ad = a.includes('/');
    const bd = b.includes('/');
    if (ad !== bd) return ad ? -1 : 1;
    return a.localeCompare(b);
  });
}
