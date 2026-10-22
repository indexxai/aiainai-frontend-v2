'use client';
import { useRef, type ReactNode } from 'react';
import { Icon, IconButton, cx } from '@/ui';
import { MAX_SECONDS, clock, useVoiceTyping } from '@/lib/voice/useVoiceTyping';
import './voice.css';

export type Voice = ReturnType<typeof useVoiceTyping>;

/** Adds spoken words after what is already typed, within an optional length limit. */
export function appendSpoken(current: string, said: string, maxLength?: number) {
  const cur = current.trimEnd();
  const next = cur ? `${cur} ${said}` : said;
  return maxLength ? next.slice(0, maxLength) : next;
}

/** The mic button, or while it's in use: how long you've spoken, and Cancel / Done. */
export function VoiceControl({ voice, label = 'Voice typing' }: { voice: Voice; label?: string }) {
  if (voice.state === 'idle')
    return (
      <IconButton
        icon="mic"
        size="sm"
        shape="pill"
        label={label}
        className="vb-mic"
        onClick={() => void voice.start()}
      />
    );
  if (voice.state === 'transcribing' || voice.state === 'starting')
    return (
      <span className="vb-bar" role="status">
        <Icon name="loader-circle" size={16} className="vb-spin" />
        <span>{voice.state === 'starting' ? 'Starting the mic…' : 'Writing it down…'}</span>
        <button type="button" className="vb-btn" aria-label="Cancel voice typing" onClick={voice.cancel}>
          <Icon name="x" size={16} />
        </button>
      </span>
    );
  return (
    <span className="vb-bar">
      <span className="vb-rec" aria-hidden />
      <span role="timer" aria-label={`Listening, ${voice.seconds} seconds`}>
        <span className="vb-wide">Listening </span>
        {clock(voice.seconds)}
        <span className="vb-max"> / {clock(MAX_SECONDS)}</span>
      </span>
      <button type="button" className="vb-btn" aria-label="Cancel voice typing" onClick={voice.cancel}>
        <Icon name="x" size={16} />
      </button>
      <button type="button" className="vb-btn done" aria-label="Done speaking" onClick={voice.stop}>
        <Icon name="check" size={16} strokeWidth={2.25} />
      </button>
    </span>
  );
}

/** A problem with the mic, shown under the box. */
export function VoiceError({ voice }: { voice: Voice }) {
  return voice.error ? (
    <span className="vb-error" role="alert">
      {voice.error}
    </span>
  ) : null;
}

/**
 * A mic for a toolbar or footer: what you say is added to the end of the text.
 * `target` (optional) is focused after the words arrive.
 */
export function VoiceButton({
  value,
  onChange,
  maxLength,
  target,
  label,
}: {
  value: string;
  onChange: (text: string) => void;
  maxLength?: number;
  target?: () => HTMLElement | null;
  label?: string;
}) {
  const voice = useVoiceTyping((said) => {
    onChange(appendSpoken(value, said, maxLength));
    requestAnimationFrame(() => target?.()?.focus());
  });
  return (
    <span className="vb-wrap">
      <VoiceControl voice={voice} label={label} />
      <VoiceError voice={voice} />
    </span>
  );
}

/**
 * Voice typing for any text box: wrap the textarea or input, and a mic sits in its corner
 * (bottom right for a textarea, middle right for a one-line input). Escape cancels.
 */
export function VoiceField({
  value,
  onChange,
  maxLength,
  children,
  className,
  label,
}: {
  value: string;
  onChange: (text: string) => void;
  maxLength?: number;
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const voice = useVoiceTyping((said) => {
    onChange(appendSpoken(value, said, maxLength));
    requestAnimationFrame(() => {
      const el = box.current?.querySelector<HTMLTextAreaElement | HTMLInputElement>('textarea, input');
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    });
  });
  const active = voice.state !== 'idle';
  return (
    <div className={cx('vf', className)}>
      <div
        ref={box}
        className={cx('vf-box', active && 'active')}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && active) {
            e.stopPropagation();
            voice.cancel();
          }
        }}
      >
        {children}
        <span className="vf-mic">
          <VoiceControl voice={voice} label={label} />
        </span>
      </div>
      <VoiceError voice={voice} />
    </div>
  );
}
