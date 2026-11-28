import { describe, expect, it } from 'vitest';
import { buildPreview, resolveLink, sortPaths } from './preview';

describe('resolveLink', () => {
  it('resolves relative links and ignores external ones', () => {
    expect(resolveLink('index.html', 'app.js')).toBe('app.js');
    expect(resolveLink('pages/a.html', '../css/s.css?v=2')).toBe('css/s.css');
    expect(resolveLink('index.html', './x/y.js')).toBe('x/y.js');
    expect(resolveLink('index.html', 'https://cdn.example.com/x.js')).toBeNull();
    expect(resolveLink('index.html', '//cdn/x.js')).toBeNull();
    expect(resolveLink('index.html', '../../escape.js')).toBeNull();
  });
});

describe('buildPreview', () => {
  const files = [
    {
      path: 'index.html',
      content: '<link rel="stylesheet" href="style.css"><body><script src="app.js"></script></body>',
    },
    { path: 'style.css', content: 'b{color:red}' },
    { path: 'app.js', content: 'if (1 < 2) document.title = "</script>";' },
  ];
  it('inlines stylesheets and scripts', () => {
    const html = buildPreview(files)!;
    expect(html).toContain('<style>b{color:red}</style>');
    expect(html).toContain('<script>if (1 < 2)');
    expect(html).not.toContain('src="app.js"');
  });
  it('does not let a script close its own tag early', () => {
    expect(buildPreview(files)!.match(/<\/script>/g)).toHaveLength(1);
  });
  it('keeps links it cannot find and returns null without a page', () => {
    expect(buildPreview([{ path: 'index.html', content: '<script src="missing.js"></script>' }])).toContain(
      'missing.js',
    );
    expect(buildPreview([{ path: 'a.js', content: '' }])).toBeNull();
  });
  it('falls back to the first html file', () => {
    expect(buildPreview([{ path: 'home.html', content: '<p>x</p>' }])).toBe('<p>x</p>');
  });
});

describe('sortPaths', () => {
  it('puts folders first', () => {
    expect(sortPaths(['z.js', 'a/b.js', 'a.js'])).toEqual(['a/b.js', 'a.js', 'z.js']);
  });
});
