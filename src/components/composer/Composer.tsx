'use client';
import { useEffect, useRef, useState, type ClipboardEvent, type DragEvent, type KeyboardEvent } from 'react';
import { Chip, Icon, IconButton, cx } from '@/ui';
import { ModelPicker } from '@/components/models/ModelPicker';
import { MAX_SECONDS, clock, useVoiceTyping } from '@/lib/voice/useVoiceTyping';
import type { ModelMenu } from '@/lib/models';
import { ACCEPT, KIND_ICON, fileSize, type Attachment } from '@/lib/files/files';
import { useAttachments } from '@/lib/files/useAttachments';
import { ConnectorsChip, type AppsChoice } from './ConnectorsChip';
import './composer.css';

export interface ComposerProps {
  menu: ModelMenu;
  model: string;
  onModelChange: (key: string) => void;
  /** Return false to keep the text (and files) in the box (e.g. the send was refused). */
  onSend: (text: string, files: Attachment[]) => void | false | Promise<void | false>;
  /** Let people attach files with + (or by dropping or pasting them). */
  attachments?: boolean;
  /** Shows Stop instead of Send while an answer is being written. */
  running?: boolean;
  onStop?: () => void;
  placeholder?: string;
  elevated?: boolean;
  disabled?: boolean;
  label?: string;
  className?: string;
  /** The Connectors chip: which connected apps Jack may use in this chat. Leave out to hide it. */
  apps?: AppsChoice;
  /** Show the model picker (off where the choice isn't used, e.g. describing a business). */
  modelPicker?: boolean;
  autoFocus?: boolean;
  rows?: number;
  /** Controlled text (e.g. a suggestion fills the box). Leave out to let the box manage it. */
  text?: string;
  onTextChange?: (text: string) => void;
}

const MAX_HEIGHT = 240;

/**
 * The prompt box from the designs: text, files (+), the apps Jack may use (Connectors), the model,
 * voice typing and send. A + in boxes that can't take files explains that instead of doing nothing.
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
  modelPicker = true,
  apps,
  autoFocus,
  rows = 2,
  text: controlled,
  onTextChange,
  attachments = false,
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
  // Voice typing: what was said is added to the box, to check before sending.
  const latest = useRef(text);
  useEffect(() => {
    latest.current = text;
  }, [text]);
  const voice = useVoiceTyping((said) => {
    const cur = latest.current.trimEnd();
    setText(cur ? `${cur} ${said}` : said);
    requestAnimationFrame(() => {
      const el = area.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    });
  });
  const listening = voice.state !== 'idle';
  const files = useAttachments();
  const picker = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const canSend =
    !disabled &&
    !running &&
    !listening &&
    !files.uploading &&
    (text.trim().length > 0 || files.ready.length > 0);

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
    const attached = files.ready;
    setText('');
    if ((await onSend(value, attached)) === false) setText(value);
    else files.clear();
  };

  const say = (message: string) => {
    setHint(message);
    clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setHint(''), 5000);
  };
  const addFiles = (list: FileList | File[]) => {
    const note = files.add(list);
    if (note) say(note);
  };
  const onDrop = (e: DragEvent) => {
    if (!attachments || !e.dataTransfer.files.length) return;
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };
  const onPaste = (e: ClipboardEvent) => {
    if (!attachments || !e.clipboardData.files.length) return;
    e.preventDefault();
    addFiles(e.clipboardData.files);
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape' && listening) {
      e.preventDefault();
      voice.cancel();
      return;
    }
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
    <div
      className={cx('cp', className)}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && listening) voice.cancel();
      }}
    >
      <div
        className={cx(
          'as-composer',
          elevated && 'elevated',
          listening && 'cp-listening',
          dragging && 'cp-drop',
        )}
        onDragOver={(e) => {
          if (!attachments || !Array.from(e.dataTransfer.types).includes('Files')) return;
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
        }}
        onDrop={onDrop}
      >
        {files.items.length > 0 && (
          <ul className="as-composer-files cp-files" aria-label="Attached files">
            {files.items.map((f) => (
              <li
                key={f.key}
                className={cx('as-file', f.status === 'error' && 'cp-file-bad')}
                title={f.error ?? f.name}
              >
                {f.status === 'uploading' ? (
                  <Icon name="loader-circle" size={16} className="cp-spin" />
                ) : (
                  <Icon
                    name={
                      f.status === 'error'
                        ? 'circle-alert'
                        : KIND_ICON[f.file?.kind ?? files.kindOf(f.name) ?? 'text']
                    }
                    size={16}
                  />
                )}
                <span className="name">{f.name}</span>
                <span className="meta">
                  {f.status === 'uploading'
                    ? 'Reading…'
                    : f.status === 'error'
                      ? 'Can’t use'
                      : fileSize(f.size)}
                </span>
                <button
                  type="button"
                  className="cp-file-x"
                  aria-label={`Remove ${f.name}`}
                  onClick={() => files.remove(f.key)}
                >
                  <Icon name="x" size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
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
          onPaste={onPaste}
        />
        {attachments && (
          <input
            ref={picker}
            type="file"
            multiple
            accept={ACCEPT}
            hidden
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = '';
            }}
          />
        )}
        <div className="as-composer-bar">
          {attachments ? (
            <IconButton
              icon="plus"
              variant="secondary"
              shape="pill"
              label="Attach files"
              title="Attach files: PDF, Word, Excel, CSV, text or images (up to 5, 20 MB each)"
              disabled={disabled}
              onClick={() => picker.current?.click()}
            />
          ) : (
            <IconButton
              icon="plus"
              variant="secondary"
              shape="pill"
              label="Add files (coming soon)"
              aria-disabled="true"
              onClick={soon('Adding files here')}
            />
          )}
          {apps && <ConnectorsChip apps={apps} />}
          <span className="spacer" />
          {modelPicker && <ModelPicker menu={menu} value={model} onChange={onModelChange} />}
          {voice.state === 'idle' ? (
            <IconButton
              icon="mic"
              shape="pill"
              label="Voice typing"
              title="Voice typing: speak, then check the words before sending"
              disabled={disabled}
              onClick={() => void voice.start()}
            />
          ) : (
            <VoiceBar voice={voice} />
          )}
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
        {voice.error || files.error || hint}
      </p>
    </div>
  );
}

/** While voice typing: how long you've spoken, and Cancel / Done (or a wait while it's written down). */
function VoiceBar({ voice }: { voice: ReturnType<typeof useVoiceTyping> }) {
  if (voice.state === 'transcribing' || voice.state === 'starting')
    return (
      <span className="cp-voice" role="status">
        <Icon name="loader-circle" size={16} className="cp-spin" />
        <span className="cp-voice-label">
          {voice.state === 'starting' ? 'Starting the mic…' : 'Writing it down…'}
        </span>
        <button
          type="button"
          className="cp-voice-btn"
          aria-label="Cancel voice typing"
          onClick={voice.cancel}
        >
          <Icon name="x" size={16} />
        </button>
      </span>
    );
  return (
    <span className="cp-voice">
      <span className="cp-rec" aria-hidden />
      <span className="cp-voice-label" role="timer" aria-label={`Listening, ${voice.seconds} seconds`}>
        <span className="cp-desktop-inline">Listening </span>
        {clock(voice.seconds)}
        <span className="cp-voice-max"> / {clock(MAX_SECONDS)}</span>
      </span>
      <button type="button" className="cp-voice-btn" aria-label="Cancel voice typing" onClick={voice.cancel}>
        <Icon name="x" size={16} />
      </button>
      <button type="button" className="cp-voice-btn done" aria-label="Done speaking" onClick={voice.stop}>
        <Icon name="check" size={16} strokeWidth={2.25} />
      </button>
    </span>
  );
}
