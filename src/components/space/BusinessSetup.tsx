'use client';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { AgentAvatar } from '@/components/team/AgentAvatar';
import { Button, Chip, Field, Icon, cx, type IconName } from '@/ui';
import { api, type Schemas } from '@/lib/api/client';
import { toApiError } from '@/lib/api/errors';
import { openInSpace, saveSpace } from '@/lib/space';
import { SpaceContext } from '@/lib/space-context';
import './business.css';

const HELP: { id: string; label: string; icon: IconName }[] = [
  { id: 'leads', label: 'Replying to leads', icon: 'mail' },
  { id: 'social', label: 'Social media posts', icon: 'megaphone' },
  { id: 'crm', label: 'Keeping the CRM tidy', icon: 'contact' },
  { id: 'invoices', label: 'Invoices and payments', icon: 'receipt' },
  { id: 'reports', label: 'Reports', icon: 'chart-column' },
  { id: 'meetings', label: 'Meetings', icon: 'calendar' },
];

const STEPS = [
  { title: 'About the business', detail: 'Name, what you do, who you sell to' },
  { title: 'Connect business apps', detail: 'Work email, CRM, social pages' },
  { title: 'Pick your team', detail: 'Agents Jack hands work to' },
];

/** Sign-up's "What should Captain Jack help with first?" answers that match a choice here. */
const FROM_SIGNUP: Record<string, string> = {
  'Replying to leads': 'leads',
  'Social media posts': 'social',
  'Keeping the CRM tidy': 'crm',
  'Invoices and payments': 'invoices',
  'Marketing reports': 'reports',
  Meetings: 'meetings',
};

/**
 * Business set-up in three steps. Step 1 creates the Business space (or updates it); apps and
 * the team follow. Nothing from the Personal space is used here.
 */
export function BusinessSetup({
  business,
  signup,
}: {
  business: Schemas['SpaceBusinessDto'] | null;
  /** What they told Captain Jack at sign-up, to start from (new Business spaces only). */
  signup?: { goals: string[]; note: string };
}) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(business?.name ?? '');
  const [website, setWebsite] = useState(business?.website ?? '');
  const [about, setAbout] = useState(business?.about ?? signup?.note ?? '');
  const [help, setHelp] = useState<string[]>(
    business?.helpWith ?? (signup?.goals ?? []).flatMap((g) => (FROM_SIGNUP[g] ? [FROM_SIGNUP[g]] : [])),
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const editing = !!business;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Give the business a name.');
      return;
    }
    setError('');
    setSaving(true);
    const { data, error: err } = await api.PUT('/api/spaces/business', {
      body: { name: name.trim(), website: website.trim(), about: about.trim(), helpWith: help },
    });
    setSaving(false);
    if (!data) {
      setError(toApiError(err).message);
      return;
    }
    saveSpace('business');
    if (editing) openInSpace();
    else setStep(1);
  };

  return (
    // Set-up is Captain Jack's, even before the Business space exists.
    <SpaceContext.Provider value="business">
      <div className="biz">
        <div className="biz-steps">
          <div className="biz-who">
            <AgentAvatar captain size={40} name="Captain Jack" />
            <div>
              <div className="biz-who-title">
                {editing ? 'Business details' : 'Set up your Business space'}
              </div>
              <div className="biz-muted">{editing ? business.name : 'About 3 minutes'}</div>
            </div>
          </div>
          {!editing && (
            <ol className="biz-list">
              {STEPS.map((s, i) => (
                <li key={s.title} className={cx('biz-step', i === step && 'on', i < step && 'done')}>
                  <span className="biz-num" aria-hidden>
                    {i < step ? <Icon name="check" size={14} /> : i + 1}
                  </span>
                  <div>
                    <div className="biz-step-title">
                      {s.title}
                      {i === step && <span className="sr-only"> (current step)</span>}
                    </div>
                    <div className="biz-muted">{s.detail}</div>
                  </div>
                </li>
              ))}
            </ol>
          )}
          <p className="biz-muted biz-note">
            Your Personal space is untouched. You can switch back any time.
          </p>
        </div>

        {step === 0 && (
          <form className="biz-card" onSubmit={save} aria-labelledby="biz-h" noValidate>
            <h1 id="biz-h" className="sr-only">
              About the business
            </h1>
            <div className="biz-intro">
              <AgentAvatar captain size={36} />
              <p>
                I’m Captain Jack, the Jack for your business. Tell me about it and I’ll keep it separate from
                your personal life: its own memory, apps, card and team.
              </p>
            </div>
            <div className="biz-grid">
              <Field
                label="Business name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError('');
                }}
                maxLength={80}
                autoComplete="organization"
                error={error && !name.trim() ? error : undefined}
                required
              />
              <Field
                label="Website"
                hint="Optional. Jack reads it to learn your products and tone."
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                maxLength={200}
                inputMode="url"
                autoComplete="url"
              />
            </div>
            <div className="as-field">
              <label htmlFor="biz-about" className="as-field-label">
                What does the business do?
              </label>
              <textarea
                id="biz-about"
                className="biz-textarea"
                rows={3}
                maxLength={1000}
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                placeholder="What you sell, who you sell to, and where"
              />
            </div>
            <fieldset className="biz-help">
              <legend className="as-field-label">What should Captain Jack help with first?</legend>
              <div className="biz-chips">
                {HELP.map((h) => (
                  <Chip
                    key={h.id}
                    icon={h.icon}
                    selected={help.includes(h.id)}
                    onClick={() =>
                      setHelp((cur) => (cur.includes(h.id) ? cur.filter((x) => x !== h.id) : [...cur, h.id]))
                    }
                  >
                    {h.label}
                  </Chip>
                ))}
              </div>
            </fieldset>
            <div className="biz-safe">
              <Icon name="shield-check" size={16} />
              <span>Nothing from your Personal memory, apps or card is used here.</span>
            </div>
            {error && name.trim() && (
              <p className="biz-error" role="alert">
                {error}
              </p>
            )}
            <div className="biz-actions">
              <Button
                type="submit"
                variant="primary"
                icon={editing ? 'check' : 'arrow-right'}
                loading={saving}
              >
                {editing ? 'Save' : 'Continue'}
              </Button>
              <Link href="/" className="as-btn ghost">
                {editing ? 'Cancel' : 'Not now'}
              </Link>
              {!editing && <span className="biz-muted biz-count">Step 1 of 3</span>}
            </div>
          </form>
        )}

        {step === 1 && (
          <section className="biz-card" aria-labelledby="biz-apps">
            <h1 id="biz-apps" className="biz-h">
              Connect business apps
            </h1>
            <p className="biz-text">
              {name} is set up. Next, Jack will connect to your work email, calendar, CRM and social pages, so
              he and your team can act for the business. Connections arrive later this week; you’ll find them
              under <b>Connections</b>.
            </p>
            <div className="biz-actions">
              <Button variant="primary" icon="arrow-right" onClick={() => setStep(2)}>
                Continue
              </Button>
              <span className="biz-muted biz-count">Step 2 of 3</span>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="biz-card" aria-labelledby="biz-team">
            <h1 id="biz-team" className="biz-h">
              Pick your team
            </h1>
            <p className="biz-text">
              Jack hands work to agents that each do one job well: replying to leads, posting on social media,
              keeping the CRM tidy. He’ll suggest a team for {name} from what you told him.
            </p>
            <div className="biz-actions">
              <Button variant="primary" icon="users" onClick={() => openInSpace('/team')}>
                Set up my team
              </Button>
              <Button variant="ghost" onClick={() => openInSpace()}>
                Go to Jack
              </Button>
              <span className="biz-muted biz-count">Step 3 of 3</span>
            </div>
          </section>
        )}
      </div>
    </SpaceContext.Provider>
  );
}
