import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Dialog } from './Dialog';
import { Sidebar } from './Sidebar';
import { Switch } from './Switch';
import { Tabs } from './Tabs';

describe('Tabs', () => {
  it('moves selection with the arrow keys', () => {
    const onChange = vi.fn();
    render(
      <Tabs
        label="Theme"
        value="dark"
        onChange={onChange}
        items={[
          { value: 'system', label: 'System' },
          { value: 'dark', label: 'Dark' },
          { value: 'light', label: 'Light' },
        ]}
      />,
    );
    const dark = screen.getByRole('tab', { name: 'Dark' });
    expect(dark.getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(dark, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith('light');
  });
});

describe('Dialog', () => {
  it('is labelled by its title and closes on Escape', () => {
    const onClose = vi.fn();
    render(
      <Dialog open title="More" onClose={onClose}>
        <button>Inside</button>
      </Dialog>,
    );
    expect(screen.getByRole('dialog', { name: 'More' })).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});

describe('Sidebar', () => {
  it('marks the current page for screen readers', () => {
    render(
      <Sidebar
        items={[
          { id: 'home', icon: 'house', label: 'Home', href: '/' },
          { id: 'chat', icon: 'message-square', label: 'Chat', href: '/chat', active: true },
        ]}
      />,
    );
    expect(screen.getByRole('link', { name: 'Chat' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: 'Home' }).getAttribute('aria-current')).toBeNull();
  });
});

describe('Switch', () => {
  it('exposes its state', () => {
    const onChange = vi.fn();
    render(<Switch checked={false} onChange={onChange} label="Email summary" />);
    const sw = screen.getByRole('switch', { name: 'Email summary' });
    expect(sw.getAttribute('aria-checked')).toBe('false');
    fireEvent.click(sw);
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
