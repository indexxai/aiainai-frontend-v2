import { describe, expect, it } from 'vitest';
import { costLabel, menuRows, nameOf, type ModelMenu } from './models';

const m = (key: string, provider: string, extra: Partial<ModelMenu['models'][number]> = {}) => ({
  key,
  name: key.toUpperCase(),
  provider,
  description: `${key} description`,
  tags: ['Fast'],
  credits: 1,
  locked: false,
  requiredPlan: 'free' as const,
  ...extra,
});

const menu: ModelMenu = {
  kind: 'text',
  auto: { key: 'auto', name: 'Auto', description: 'Picks the best model', tags: ['Balanced'] },
  models: [
    m('gpt', 'OpenAI'),
    m('gpt-mini', 'OpenAI'),
    m('claude-sonnet', 'Anthropic'),
    m('claude-haiku', 'Anthropic'),
    m('kimi', 'Moonshot AI'),
    m('deepseek', 'DeepSeek', { tags: ['Reasoning'] }),
  ],
  selected: 'auto',
  demo: true,
};

describe('menuRows', () => {
  it('puts Auto first, groups providers and collects single models under "More models"', () => {
    const rows = menuRows(menu).map((r) => (r.type === 'group' ? `# ${r.label}` : r.option.key));
    expect(rows).toEqual([
      'auto',
      '# OpenAI',
      'gpt',
      'gpt-mini',
      '# Anthropic',
      'claude-sonnet',
      'claude-haiku',
      '# More models',
      'kimi',
      'deepseek',
    ]);
  });

  it('filters by name, provider, description and tags, dropping empty groups', () => {
    const rows = menuRows(menu, 'reasoning');
    expect(rows.map((r) => (r.type === 'group' ? r.label : r.option.key))).toEqual([
      'More models',
      'deepseek',
    ]);
    expect(menuRows(menu, 'anthropic').filter((r) => r.type === 'model')).toHaveLength(2);
    expect(menuRows(menu, 'zzz')).toEqual([]);
  });
});

describe('labels', () => {
  it('formats cost and names', () => {
    expect(costLabel({ credits: 3 }, 'text')).toBe('3× credits');
    expect(costLabel({ credits: 4 }, 'image')).toBe('4 credits / image');
    expect(nameOf(menu, 'auto')).toBe('Auto');
    expect(nameOf(menu, 'gpt')).toBe('GPT');
    expect(nameOf(menu, 'gone')).toBe('Auto');
  });
});
