import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/shell/AppShell';
import { SIDEBAR_COOKIE } from '@/components/shell/nav';
import { PATH_HEADER } from '@/lib/auth/redirect';
import { ServiceDown } from '@/components/system/ServiceDown';
import { getMe, toShellSession } from '@/lib/session';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let me: Awaited<ReturnType<typeof getMe>>;
  try {
    me = await getMe();
  } catch {
    // Backend unreachable or failing: a proper page instead of the framework's bare error.
    return <ServiceDown />;
  }
  // The proxy already sends people without a cookie to sign-in; this catches expired sessions.
  // `expired` tells the proxy to clear the dead cookie (otherwise it would send us back here).
  if (!me) redirect('/signin?expired=1');
  // A new account answers "What will you use Jack for?" first, then carries on to where it was going.
  if (me.onboarding.askUse) {
    const path = (await headers()).get(PATH_HEADER);
    redirect(path && path !== '/' ? `/welcome?next=${encodeURIComponent(path)}` : '/welcome');
  }
  const collapsed = (await cookies()).get(SIDEBAR_COOKIE)?.value === 'collapsed';
  return (
    <AppShell session={toShellSession(me)} initialCollapsed={collapsed}>
      {children}
    </AppShell>
  );
}
