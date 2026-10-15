import { Icon, cx } from '@/ui';
import { PASSWORD_RULES } from '@/lib/auth/password';

/** The three password rules from the designs, ticked as they're met. */
export function PasswordRules({ password, id }: { password: string; id?: string }) {
  const results = PASSWORD_RULES.map((r) => ({ ...r, ok: r.test(password) }));
  return (
    <div className="au-rules" id={id}>
      <div className="au-rules-meter" aria-hidden>
        {results.map((r) => (
          <i key={r.id} className={cx(r.ok && 'on')} />
        ))}
      </div>
      <ul aria-label="Password needs">
        {results.map((r) => (
          <li key={r.id} className={cx(r.ok && 'ok')}>
            <Icon name={r.ok ? 'check' : 'circle'} size={14} strokeWidth={2} />
            {r.label}
            <span className="sr-only">{r.ok ? ' (done)' : ' (not yet)'}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
