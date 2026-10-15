'use client';
import { useEffect, useState } from 'react';
import { Button, Dialog, Icon, IconButton, cx } from '@/ui';
import { api, type Schemas } from '@/lib/api/client';
import { toApiError } from '@/lib/api/errors';

type Share = Schemas['ShareDto'];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const LINK_OPTS: { value: Share['linkAccess']; label: string; desc: string }[] = [
  { value: 'off', label: 'Off', desc: 'Only people you add can open it' },
  { value: 'view', label: 'Can view', desc: 'Anyone with the link can read it' },
];

const initials = (nameOrEmail: string) => {
  const words = nameOrEmail.includes('@') ? [] : nameOrEmail.trim().split(/\s+/);
  return (
    words.length > 1 ? words[0]![0]! + words[words.length - 1]![0]! : nameOrEmail.slice(0, 2)
  ).toUpperCase();
};

/**
 * Share a document (design: DocsFlow share). People are added by email and can view it after
 * signing in; the link can be opened by anyone when it's on. Viewing only for now.
 */
export function ShareDialog({
  open,
  docId,
  title,
  me,
  onClose,
  onChange,
  onToast,
}: {
  open: boolean;
  docId: string;
  title: string;
  me: { name: string; email: string };
  onClose: () => void;
  onChange: (s: Share) => void;
  onToast: (message: string) => void;
}) {
  const [share, setShare] = useState<Share | null>(null);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    let live = true;
    void api.GET('/api/docs/{id}/share', { params: { path: { id: docId } } }).then(({ data }) => {
      if (live && data) setShare(data);
    });
    return () => {
      live = false;
    };
  }, [open, docId]);

  const apply = (s: Share) => {
    setShare(s);
    onChange(s);
  };

  const list = email
    .split(/[\s,;]+/)
    .map((e) => e.trim())
    .filter(Boolean);
  const bad = list.find((e) => !EMAIL.test(e));

  const invite = async () => {
    if (!list.length) return;
    if (bad) {
      setError('Enter a full email address, like name@company.com');
      return;
    }
    setBusy(true);
    setError('');
    const { data, error: err } = await api.POST('/api/docs/{id}/share/invites', {
      params: { path: { id: docId } },
      body: { emails: list.slice(0, 10) },
    });
    setBusy(false);
    if (!data) {
      setError(toApiError(err).message);
      return;
    }
    apply(data);
    setEmail('');
    onToast(list.length === 1 ? 'Invite sent' : `${list.length} invites sent`);
  };

  const setLink = async (linkAccess: Share['linkAccess']) => {
    if (share?.linkAccess === linkAccess) return;
    setShare((s) => (s ? { ...s, linkAccess } : s));
    const { data } = await api.PATCH('/api/docs/{id}/share', {
      params: { path: { id: docId } },
      body: { linkAccess },
    });
    if (data) apply(data);
  };

  const copy = async () => {
    const url = share?.url ?? `${window.location.origin}/docs/${docId}`;
    try {
      await navigator.clipboard.writeText(url);
      onToast(share?.url ? 'Link copied' : 'Link copied — only people you added can open it');
    } catch {
      onToast(url);
    }
  };

  return (
    <Dialog
      open={open}
      title={`Share “${title || 'Untitled document'}”`}
      width={560}
      onClose={onClose}
      className="ds"
      footer={
        <>
          <Button variant="ghost" icon="link" onClick={() => void copy()}>
            Copy link
          </Button>
          <span className="grow" />
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        </>
      }
    >
      <form
        className="ds-invite"
        onSubmit={(e) => {
          e.preventDefault();
          void invite();
        }}
      >
        <input
          className="ds-in"
          type="text"
          inputMode="email"
          autoComplete="off"
          placeholder="Add people by email"
          aria-label="Email"
          aria-invalid={!!error || undefined}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError('');
          }}
        />
        <span className="ds-role">Can view</span>
        <Button type="submit" variant="primary" disabled={!list.length} loading={busy}>
          Invite
        </Button>
      </form>
      {error && (
        <span className="ds-err" role="alert">
          {error}
        </span>
      )}

      <div>
        <div className="ds-ov">People with access</div>
        <div className="ds-person">
          <span className="ds-av">{initials(me.name || me.email)}</span>
          <span className="grow">
            <b>{me.name || me.email} (you)</b>
            <span>{me.email}</span>
          </span>
          <span className="ds-r">Owner</span>
        </div>
        {share?.invites.map((p) => (
          <div key={p.email} className="ds-person">
            <span className="ds-av">{initials(p.email)}</span>
            <span className="grow">
              <b>{p.email}</b>
              <span>Invite sent · they open it after signing in with this email</span>
            </span>
            <span className="ds-r">Can view</span>
            <IconButton
              icon="x"
              size="sm"
              label={`Remove ${p.email}`}
              onClick={async () => {
                const { data } = await api.DELETE('/api/docs/{id}/share/invites/{email}', {
                  params: { path: { id: docId, email: p.email } },
                });
                if (data) apply(data);
              }}
            />
          </div>
        ))}
      </div>

      <div>
        <div className="ds-ov">Anyone with the link</div>
        <div className="ds-radios" role="radiogroup" aria-label="Anyone with the link">
          {LINK_OPTS.map((o) => {
            const on = (share?.linkAccess ?? 'off') === o.value;
            return (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={on}
                className="ds-radio"
                onClick={() => void setLink(o.value)}
              >
                <span className={cx('ds-dot', on && 'on')} aria-hidden />
                <span>
                  <b>{o.label}</b>
                  <span>{o.desc}</span>
                </span>
              </button>
            );
          })}
        </div>
        {share?.url && (
          <div className="ds-url">
            <Icon name="globe" size={14} />
            <span>{share.url}</span>
          </div>
        )}
      </div>
    </Dialog>
  );
}
