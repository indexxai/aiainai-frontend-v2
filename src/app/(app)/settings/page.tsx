import type { Metadata } from 'next';
import Link from 'next/link';
import { Page } from '@/components/page/Page';
import { SignOutButton } from '@/components/account/SignOutButton';
import { getMe, getModelMenu } from '@/lib/session';
import { DefaultModelSetting } from './DefaultModelSetting';
import { AppearanceSetting } from './AppearanceSetting';
import { AssistantNameSetting } from './AssistantNameSetting';
import './settings.css';

export const metadata: Metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const [me, menu] = await Promise.all([getMe(), getModelMenu('text')]);
  return (
    <Page title="Settings" width={760}>
      <section className="st-card" aria-labelledby="st-account">
        <div className="st-row">
          <div className="st-l">
            <h2 id="st-account" className="st-t">
              {me?.user.name || 'Account'}
            </h2>
            <p className="st-d">{me?.user.email}</p>
          </div>
          <SignOutButton />
        </div>
      </section>
      <section className="st-card" aria-labelledby="st-assistant">
        <div className="st-row">
          <div className="st-l">
            <h2 id="st-assistant" className="st-t">
              Your assistant’s name
            </h2>
            <p className="st-d">
              Give Jack a name of your own. He’ll use it in chats, approvals and everywhere he works for you
              in your Personal space.
            </p>
          </div>
          <AssistantNameSetting
            initial={me?.assistant ?? { name: 'Jack', title: 'Jack of all trades', custom: false }}
          />
        </div>
      </section>
      <section className="st-card" aria-labelledby="st-appearance">
        <div className="st-row">
          <div className="st-l">
            <h2 id="st-appearance" className="st-t">
              Appearance
            </h2>
            <p className="st-d">System follows your device’s light or dark setting.</p>
          </div>
          <AppearanceSetting />
        </div>
        <div className="st-row">
          <div className="st-l">
            <h3 className="st-t">Plan and billing</h3>
            <p className="st-d">Credits, plan and invoices.</p>
          </div>
          <Link href="/settings/billing" className="as-btn secondary sm">
            Open
          </Link>
        </div>
      </section>
      <section className="st-card" aria-labelledby="st-models">
        <div className="st-row">
          <div className="st-l">
            <h2 id="st-models" className="st-t">
              Default model
            </h2>
            <p className="st-d">
              Used for chat, research and documents when you start something new. You can switch in any prompt
              box.
            </p>
          </div>
          <DefaultModelSetting menu={menu} />
        </div>
      </section>
      <p className="st-note">
        Profile, password and notification settings are coming soon. To change your password now, use “Forgot
        password” on the sign-in page. Apps you connect are in <Link href="/connections">Connections</Link>.
      </p>
    </Page>
  );
}
