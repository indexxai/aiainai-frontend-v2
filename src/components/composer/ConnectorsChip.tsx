'use client';
import { useJack } from '@/lib/assistant';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Chip, Dialog, Icon, Switch, type IconName } from '@/ui';
import { api } from '@/lib/api/client';
import { useMediaQuery } from '@/lib/useMediaQuery';

export interface AppsChoice {
  /** App ids (and 'browser') Jack must not use in this chat. */
  off: string[];
  onChange: (off: string[]) => void;
}

interface App {
  id: string;
  name: string;
  icon: IconName;
  what: string;
}

/**
 * The Connectors chip: which connected apps Jack may use in this chat (all of them unless you
 * switch some off). Adding apps happens on the Connections page.
 */
export function ConnectorsChip({ apps }: { apps: AppsChoice }) {
  const jack = useJack();
  const phone = useMediaQuery('(max-width: 767px)', false);
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<App[] | null>(null);

  // Load what's connected once (and again whenever the menu opens, in case it changed).
  useEffect(() => {
    let live = true;
    void api.GET('/api/connections').then(({ data }) => {
      if (!live || !data) return;
      const connected: App[] = data.apps
        .filter((a) => a.status === 'connected')
        .map((a) => ({ id: a.id, name: a.name, icon: (a.icon || 'link') as IconName, what: a.what }));
      if (data.browser !== 'off')
        connected.push({
          id: 'browser',
          name: `${jack.name}’s browser`,
          icon: 'globe',
          what: 'Opens websites to look things up or fill in forms (asks before paying)',
        });
      setList(connected);
    });
    return () => {
      live = false;
    };
  }, [open, jack.name]);

  const on = (list ?? []).filter((a) => !apps.off.includes(a.id)).length;
  const total = list?.length ?? 0;
  const label =
    !list || total === 0 ? 'Connectors' : on === total ? `Connectors · ${total}` : `${on} of ${total} apps`;

  return (
    <>
      <Chip
        icon="blocks"
        className="cp-apps"
        aria-haspopup="dialog"
        aria-label={`Apps ${jack.name} can use in this chat: ${label}`}
        onClick={() => setOpen(true)}
      >
        <span className="cp-apps-label">{label}</span>
      </Chip>
      <Dialog
        open={open}
        sheet={phone}
        title={`Apps ${jack.name} can use here`}
        description={`${jack.name} uses your connected apps when a request needs them. Switch any off for this chat.`}
        width={440}
        onClose={() => setOpen(false)}
      >
        {list === null ? (
          <p className="cp-apps-none">Loading…</p>
        ) : list.length === 0 ? (
          <p className="cp-apps-none">
            No apps connected yet. <Link href="/connections">Connect Gmail, Google Calendar and more</Link>.
          </p>
        ) : (
          <ul className="cp-apps-list">
            {list.map((a) => {
              const enabled = !apps.off.includes(a.id);
              return (
                <li key={a.id}>
                  <span className="cp-apps-ic" aria-hidden>
                    <Icon name={a.icon} size={18} />
                  </span>
                  <span className="cp-apps-tx">
                    <b>{a.name}</b>
                    <span>{a.what}</span>
                  </span>
                  <Switch
                    checked={enabled}
                    ariaLabel={`${enabled ? 'Stop' : 'Let'} ${jack.name} using ${a.name} in this chat`}
                    onChange={(v) =>
                      apps.onChange(v ? apps.off.filter((x) => x !== a.id) : [...apps.off, a.id])
                    }
                  />
                </li>
              );
            })}
          </ul>
        )}
        <p className="cp-apps-foot">
          <Link href="/connections">Manage connections</Link>
        </p>
      </Dialog>
    </>
  );
}
