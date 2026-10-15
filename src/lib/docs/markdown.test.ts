import { describe, expect, it } from 'vitest';
import { toMarkdown, type PmNode } from './markdown';

const t = (text: string, ...marks: string[]): PmNode => ({
  type: 'text',
  text,
  marks: marks.map((type) => ({ type })),
});
const p = (...content: PmNode[]): PmNode => ({ type: 'paragraph', content });

describe('toMarkdown', () => {
  it('writes headings, marks, lists, quotes and tables', () => {
    const doc: PmNode = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [t('Summary')] },
        p(t('We '), t('relaunch', 'bold'), t(' the '), t('site', 'italic'), t('.')),
        {
          type: 'bulletList',
          content: [
            { type: 'listItem', content: [p(t('One'))] },
            {
              type: 'listItem',
              content: [
                p(t('Two')),
                { type: 'orderedList', content: [{ type: 'listItem', content: [p(t('Nested'))] }] },
              ],
            },
          ],
        },
        { type: 'blockquote', content: [p(t('Quoted'))] },
        {
          type: 'table',
          content: [
            {
              type: 'tableRow',
              content: [
                { type: 'tableHeader', content: [p(t('Phase'))] },
                { type: 'tableHeader', content: [p(t('Weeks'))] },
              ],
            },
            {
              type: 'tableRow',
              content: [
                { type: 'tableCell', content: [p(t('Design'))] },
                { type: 'tableCell', content: [p(t('2'))] },
              ],
            },
          ],
        },
      ],
    };
    expect(toMarkdown(doc)).toBe(
      [
        '## Summary',
        'We **relaunch** the *site*.',
        '- One\n- Two\n  1. Nested',
        '> Quoted',
        '| Phase | Weeks |\n| --- | --- |\n| Design | 2 |',
      ].join('\n\n'),
    );
  });

  it('handles an empty document', () => {
    expect(toMarkdown({ type: 'doc', content: [{ type: 'paragraph' }] })).toBe('');
  });
});
