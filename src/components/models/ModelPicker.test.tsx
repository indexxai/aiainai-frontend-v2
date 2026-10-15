import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ModelMenu } from '@/lib/models';
import { ModelPicker } from './ModelPicker';

vi.mock('next/link', () => ({
  default: ({ children, ...p }: { children: React.ReactNode; href: string }) => <a {...p}>{children}</a>,
}));

const opt = (key: string, name: string, provider: string, credits: number, pro = false) => ({
  key,
  name,
  provider,
  description: `${name} description`,
  tags: ['Fast'],
  credits,
  locked: pro,
  requiredPlan: (pro ? 'pro' : 'free') as 'pro' | 'free',
});

const menu: ModelMenu = {
  kind: 'text',
  auto: {
    key: 'auto',
    name: 'Auto',
    description: 'Picks the best model for each request',
    tags: ['Balanced', 'Credits vary'],
  },
  models: [
    opt('gpt', 'GPT', 'OpenAI', 3, true),
    opt('gpt-mini', 'GPT mini', 'OpenAI', 1),
    opt('claude-sonnet', 'Claude Sonnet', 'Anthropic', 2),
    opt('claude-haiku', 'Claude Haiku', 'Anthropic', 1),
  ],
  selected: 'auto',
  demo: true,
};

beforeAll(() => {
  window.matchMedia = ((q: string) => ({
    matches: false,
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
  Element.prototype.scrollIntoView = () => {};
});
afterEach(cleanup);

describe('ModelPicker', () => {
  it('shows Auto, provider groups, costs and the Jack Personal lock', () => {
    render(<ModelPicker menu={menu} value="auto" onChange={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Model: Auto' }));
    expect(screen.getByRole('listbox')).toBeTruthy();
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(5);
    expect(options[0]!.getAttribute('aria-selected')).toBe('true');
    expect(screen.getByText('OpenAI', { selector: '.as-model-group' })).toBeTruthy();
    expect(screen.getByText('3× credits')).toBeTruthy();
    expect(screen.getByRole('option', { name: 'GPT, needs Jack Personal' })).toBeTruthy();
  });

  it('filters with search and picks with the keyboard', () => {
    const onChange = vi.fn();
    render(<ModelPicker menu={menu} value="auto" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Model: Auto' }));
    const search = screen.getByRole('combobox', { name: 'Search models' });
    fireEvent.change(search, { target: { value: 'claude' } });
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
      expect.stringContaining('Claude Sonnet'),
      expect.stringContaining('Claude Haiku'),
    ]);
    fireEvent.keyDown(search, { key: 'ArrowDown' });
    fireEvent.keyDown(search, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('claude-haiku');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('explains the upgrade for a locked model and offers Auto instead', () => {
    const onChange = vi.fn();
    render(<ModelPicker menu={menu} value="gpt-mini" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Model: GPT mini' }));
    fireEvent.click(screen.getByRole('option', { name: 'GPT, needs Jack Personal' }));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'GPT is on Jack Personal' })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Upgrade to Jack Personal/ }).getAttribute('href')).toBe(
      '/settings/billing',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Use Auto instead' }));
    expect(onChange).toHaveBeenCalledWith('auto');
  });

  it('closes on Escape', () => {
    render(<ModelPicker menu={menu} value="auto" onChange={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Model: Auto' }));
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
  });
});
