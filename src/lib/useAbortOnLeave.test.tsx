import { render } from '@testing-library/react';
import { StrictMode, useEffect, useRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAbortOnLeave } from './useAbortOnLeave';

/** Starts a request as soon as it mounts, like a new chat's first message. */
function StartsOnMount({ onStart }: { onStart: (ac: AbortController) => void }) {
  const abort = useRef<AbortController | null>(null);
  const started = useRef(false);
  useAbortOnLeave(abort);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    abort.current = new AbortController();
    onStart(abort.current);
  }, [onStart]);
  return null;
}

describe('useAbortOnLeave', () => {
  afterEach(() => vi.useRealTimers());

  it('keeps a request started on mount through the development double-mount', () => {
    vi.useFakeTimers();
    let ac: AbortController | undefined;
    render(
      <StrictMode>
        <StartsOnMount onStart={(c) => (ac = c)} />
      </StrictMode>,
    );
    vi.runAllTimers();
    expect(ac?.signal.aborted).toBe(false);
  });

  it('aborts it when the page really closes', () => {
    vi.useFakeTimers();
    let ac: AbortController | undefined;
    const view = render(
      <StrictMode>
        <StartsOnMount onStart={(c) => (ac = c)} />
      </StrictMode>,
    );
    view.unmount();
    vi.runAllTimers();
    expect(ac?.signal.aborted).toBe(true);
  });
});
