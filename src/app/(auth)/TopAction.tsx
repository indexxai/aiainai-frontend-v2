import Link from 'next/link';

/** "Already have an account? Sign in" in the top-right corner, as in the designs. */
export function TopAction({ text, label, href }: { text: string; label: string; href: string }) {
  return (
    <div className="au-topaction">
      <span>{text}</span>
      <Link href={href} className="as-btn secondary sm">
        {label}
      </Link>
    </div>
  );
}
