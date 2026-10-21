import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button, IconButton } from './Button';

describe('Button', () => {
  it('is disabled and busy while loading', () => {
    render(<Button loading>Save</Button>);
    const btn = screen.getByRole('button', { name: 'Save' });
    expect(btn).toHaveProperty('disabled', true);
    expect(btn.getAttribute('aria-busy')).toBe('true');
  });

  it('gives icon-only buttons an accessible name', () => {
    render(<IconButton icon="bell" label="Notifications" />);
    expect(screen.getByRole('button', { name: 'Notifications' })).toBeTruthy();
  });
});
