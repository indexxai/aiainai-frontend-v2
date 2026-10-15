import Image from 'next/image';
import Link from 'next/link';
import { Icon, type IconName } from '@/ui';
import './auth.css';

const FEATURES: { icon: IconName; title: string; text: string }[] = [
  {
    icon: 'message-square',
    title: 'Chat and research with sources',
    text: 'Answers you can check, with every source linked.',
  },
  {
    icon: 'file-text',
    title: 'Documents and images',
    text: 'Draft, edit and export proposals, reports and visuals.',
  },
  {
    icon: 'users',
    title: 'Your own AI Crews',
    text: 'Captain Jack runs specialist agents for your business.',
  },
  { icon: 'shield-check', title: 'You stay in control', text: 'Nothing important happens without your OK.' },
];

/** Split layout from the designs: brand panel on the left (desktop), form on the right. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="au-page">
      <aside className="au-brandpanel" aria-label="About Captain Jack's Bridge">
        <Link href="/" className="au-brand">
          <Image src="/brand/jacks-ai-mark.png" alt="" width={40} height={48} priority />
          <span>Captain Jack&rsquo;s Bridge</span>
        </Link>
        <div className="au-pitch">
          <h2 className="au-pitch-title">One workspace to chat, research, create and run your AI Crews.</h2>
          <ul className="au-features">
            {FEATURES.map((f) => (
              <li key={f.title}>
                <span className="au-feature-icon">
                  <Icon name={f.icon} size={18} />
                </span>
                <span>
                  <b>{f.title}</b>
                  <span>{f.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="au-brandpanel-foot">Jack Free includes 100 credits a month. No card needed.</p>
      </aside>

      <div className="au-side">
        <Link href="/" className="au-brand au-brand-compact" aria-label="Captain Jack's Bridge">
          <Image src="/brand/jacks-ai-mark.png" alt="" width={27} height={32} />
          <span>Captain Jack&rsquo;s Bridge</span>
        </Link>
        <main id="main" className="au-main">
          <div className="au-card">{children}</div>
        </main>
        <footer className="au-foot">
          <a href="/terms">Terms</a>
          <a href="/privacy">Privacy</a>
          <span>Jack&rsquo;s AI</span>
        </footer>
      </div>
    </div>
  );
}
