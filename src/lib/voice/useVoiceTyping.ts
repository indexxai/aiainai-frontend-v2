'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toApiError } from '@/lib/api/errors';

/** The mic stops by itself here (the backend takes up to 3 minutes). */
export const MAX_SECONDS = 180;

/** Formats browsers can record, best first (Chrome/Firefox: webm or ogg; Safari: mp4). */
const TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/ogg'];

export type VoiceState = 'idle' | 'starting' | 'recording' | 'transcribing';

/**
 * Voice typing for a prompt box: record with the microphone, then turn it into text on our
 * server (OpenAI speech-to-text). The text goes to `onText` for the person to check and send.
 */
export function useVoiceTyping(onText: (text: string) => void) {
  const [state, setState] = useState<VoiceState>('idle');
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState('');
  const rec = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startedAt = useRef(0);
  const cancelled = useRef(false);
  const tick = useRef<ReturnType<typeof setInterval>>(undefined);
  const abort = useRef<AbortController | null>(null);
  const onTextRef = useRef(onText);
  useEffect(() => {
    onTextRef.current = onText;
  }, [onText]);

  const release = useCallback(() => {
    clearInterval(tick.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    rec.current = null;
  }, []);

  const send = useCallback(async (blob: Blob, secs: number) => {
    setState('transcribing');
    const ac = new AbortController();
    abort.current = ac;
    try {
      const res = await fetch(`/api/voice/transcribe?seconds=${Math.round(secs)}`, {
        method: 'POST',
        headers: { 'content-type': blob.type.split(';')[0] || 'audio/webm' },
        body: blob,
        credentials: 'include',
        signal: ac.signal,
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        if (!ac.signal.aborted) setError(toApiError(body).message);
        return;
      }
      const text = String((body as { text?: string } | null)?.text ?? '').trim();
      if (text && !ac.signal.aborted) onTextRef.current(text);
    } catch {
      if (!ac.signal.aborted) setError('We couldn’t reach the server. Check your connection and try again.');
    } finally {
      abort.current = null;
      setState('idle');
    }
  }, []);

  const stop = useCallback(() => {
    if (rec.current?.state === 'recording') rec.current.stop();
  }, []);

  const start = useCallback(async () => {
    if (state !== 'idle') return;
    setError('');
    if (
      typeof window === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === 'undefined'
    ) {
      setError('Voice typing doesn’t work in this browser. Try Chrome, Edge, Firefox or Safari.');
      return;
    }
    setState('starting');
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      setState('idle');
      const name = e instanceof DOMException ? e.name : '';
      setError(
        name === 'NotAllowedError' || name === 'SecurityError'
          ? 'Allow the microphone for this site in your browser, then try again.'
          : name === 'NotFoundError'
            ? 'No microphone found. Plug one in or check your sound settings.'
            : 'The microphone couldn’t start. Check that no other app is using it.',
      );
      return;
    }
    const mimeType = TYPES.find((t) => MediaRecorder.isTypeSupported(t));
    const r = new MediaRecorder(stream.current, mimeType ? { mimeType } : undefined);
    rec.current = r;
    chunks.current = [];
    cancelled.current = false;
    r.ondataavailable = (ev) => {
      if (ev.data.size) chunks.current.push(ev.data);
    };
    r.onstop = () => {
      const secs = (Date.now() - startedAt.current) / 1000;
      const blob = new Blob(chunks.current, { type: r.mimeType || mimeType || 'audio/webm' });
      release();
      if (cancelled.current) return setState('idle');
      if (secs < 0.6 || blob.size < 200) {
        setState('idle');
        setError('That was too short. Hold on a moment longer and speak.');
        return;
      }
      void send(blob, secs);
    };
    startedAt.current = Date.now();
    setSeconds(0);
    r.start(1000);
    setState('recording');
    tick.current = setInterval(() => {
      const s = Math.floor((Date.now() - startedAt.current) / 1000);
      setSeconds(s);
      if (s >= MAX_SECONDS) stop();
    }, 250);
  }, [state, release, send, stop]);

  const cancel = useCallback(() => {
    cancelled.current = true;
    if (rec.current?.state === 'recording') rec.current.stop();
    else release();
    abort.current?.abort();
    setState('idle');
  }, [release]);

  // Leaving the page never leaves the microphone on.
  useEffect(
    () => () => {
      cancelled.current = true;
      if (rec.current?.state === 'recording') rec.current.stop();
      stream.current?.getTracks().forEach((t) => t.stop());
      clearInterval(tick.current);
      abort.current?.abort();
    },
    [],
  );

  return { state, seconds, error, clearError: () => setError(''), start, stop, cancel };
}

export const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
