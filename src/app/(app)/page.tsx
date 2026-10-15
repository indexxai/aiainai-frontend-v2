import { redirect } from 'next/navigation';
import { CreditsBanner } from '@/components/billing/CreditsBanner';
import { JackHome } from '@/components/jack/JackHome';
import { getHome, getMe, getModelMenu, getTeam } from '@/lib/session';

/** Jack's home (v2): the main screen, in the Personal or Business space. */
export default async function HomePage() {
  const me = await getMe();
  if (!me) redirect('/signin?expired=1');
  const space = me.space.active;
  const [menu, home, team] = await Promise.all([
    getModelMenu('text'),
    getHome(space),
    space === 'business' ? getTeam() : Promise.resolve(null),
  ]);
  return (
    <JackHome
      menu={menu}
      home={home}
      business={space === 'business' ? (me.space.business ?? null) : null}
      team={team}
      banner={<CreditsBanner credits={me.credits} plan={me.workspace.plan} className="jack-banner" />}
    />
  );
}
