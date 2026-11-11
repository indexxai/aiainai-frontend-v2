'use client';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { ProductLauncher } from './ProductLauncher';

/** The nine-oval product switcher for the public top bar, following the page's light / dark mode. */
export function NavLauncher() {
  const { resolved } = useTheme();
  return <ProductLauncher icon="/launcher/zodiacLogo.png" theme={resolved} />;
}
