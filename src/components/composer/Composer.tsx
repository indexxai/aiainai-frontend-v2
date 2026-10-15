'use client';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Chip, Icon, IconButton, cx } from '@/ui';
import { ModelPicker } from '@/components/models/ModelPicker';
import type { ModelMenu } from '@/lib/models';
import './composer.css';

export interface ComposerProps {
  menu: ModelMenu;
  model: string;
  onModelChange: (key: string) => void;
  /** Return false to keep the text in the box (e.g. the send was refused). */
  onSend: (text: string) => void | false | Promise<void | false>;
  /** Shows Stop instead of Send while an answer is being written. */
  running?: boolean;
  onStop?: () => void;
  placeholder?: string;
  elevated?: boolean;
  disabled?: boolean;
  label?: string;
  className?: string;
  /** Show the Connectors chip (Home and new chat; not inside a chat). */
  connectors?: boolean;
  /** Show the "Standard" mode chip (chat only). */
  modeChip?: boolean;
  autoFocus?: boolean;
  rows?: number;
  /** Controlled text (e.g. a suggestion fills the box). Leave out to let the box manage it. */
  text?: string;
  onTextChange?: (text: string) => void;
}

const MAX_HEIGHT = 240;

/**
 * The prompt box from the designs. Attach, Standard mode, Connectors and voice are shown
 * as in the design but arrive in later milestones; they explain that instead of doing nothing.
 */
export function Composer({
  menu,
  model,
  onModelChange,
  onSend,
  running,
  onStop,
  placeholder = 'Ask anything, create anything',
  elevated,
  disabled,
  label = 'Message',
  className,
  connectors = true,
  modeChip = true,
  autoFocus,
  rows = 2,
  text: controlled,
  onTextChange,
}: ComposerProps) {
  const [own, setOwn] = useState('');
  const text = controlled ?? own;
  const setText = (v: string) => {
    if (controlled === undefined) setOwn(v);
    onTextChange?.(v);
  };
  const [hint, setHint] = useState('');
  const area = useRef<HTMLTextAreaElement>(null);
  const hintTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const canSend = !disabled && !running && text.trim().length > 0;

  // Grow with the text up to a limit, then scroll.
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
  }, [text]);

  useEffect(() => () => clearTimeout(hintTimer.current), []);

  const send = async () => {
    if (!canSend) return;
    const value = text.trim();
    setText('');
    if ((await onSend(value)) === false) setText(value);
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void send();
    }
  };

  const soon = (what: string) => () => {
    setHint(`${what} arrives in a later update.`);
    clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setHint(''), 3000);
  };

  return (
    <div className={cx('cp', className)}>
      <div className={cx('as-composer', elevated && 'elevated')}>
        <textarea
          ref={area}
          aria-label={label}
          placeholder={placeholder}
          rows={rows}
          autoFocus={autoFocus}
          value={text}
          disabled={disabled}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKey}
        />
        <div className="as-composer-bar">
          <IconButton
            icon="plus"
            variant="secondary"
            shape="pill"
            label="Add files (coming soon)"
            aria-disabled="true"
            onClick={soon('Adding files')}
          />
          {modeChip && (
            <Chip
              icon="sparkles"
              dropdown
              className="cp-desktop"
              aria-disabled="true"
              onClick={soon('Choosing a mode')}
            >
              Standard
            </Chip>
          )}
          {connectors && (
            <Chip icon="blocks" className="cp-desktop" aria-disabled="true" onClick={soon('Connectors')}>
              Connectors
            </Chip>
          )}
          <span className="spacer" />
          <ModelPicker menu={menu} value={model} onChange={onModelChange} />
          <IconButton
            icon="mic"
            shape="pill"
            label="Dictate (coming soon)"
            aria-disabled="true"
            onClick={soon('Dictation')}
          />
          {running ? (
            <button type="button" className="as-send stop" aria-label="Stop" onClick={onStop}>
              <Icon name="square" size={14} strokeWidth={2.5} />
            </button>
          ) : (
            <button
              type="button"
              className="as-send"
              aria-label="Send"
              disabled={!canSend}
              onClick={() => void send()}
            >
              <Icon name="arrow-up" size={18} strokeWidth={2.25} />
            </button>
          )}
        </div>
      </div>
      <p className="cp-hint" role="status" aria-live="polite">
        {hint}
      </p>
    </div>
  );
}
