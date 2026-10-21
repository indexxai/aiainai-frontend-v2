import { redirect } from 'next/navigation';
import { CreditsBanner } from '@/components/billing/CreditsBanner';
import { JackHome } from '@/components/jack/JackHome';
import { getHome, getMe, getModelMenu } from '@/lib/session';

/** Jack's home (v2): the main screen, in the Personal or Business space. */
export default async function HomePage() {
  const me = await getMe();
  if (!me) redirect('/signin?expired=1');
  const space = me.space.active;
  const [menu, home] = await Promise.all([getModelMenu('text'), getHome(space)]);
  return (
    <JackHome
      menu={menu}
      home={home}
      business={space === 'business' ? (me.space.business ?? null) : null}
      banner={<CreditsBanner credits={me.credits} plan={me.workspace.plan} className="jack-banner" />}
    />
  );
}
