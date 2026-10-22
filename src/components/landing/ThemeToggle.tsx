'use client';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { Icon } from '@/ui';

/** Light / dark switch for the public pages (saved on this device, same as the app's setting). */
export function ThemeToggle() {
  const { resolved, setPreference } = useTheme();
  const next = resolved === 'dark' ? 'light' : 'dark';
  return (
    <button
      type="button"
      className="ml-theme"
      onClick={() => setPreference(next)}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
    >
      <Icon name={resolved === 'dark' ? 'sun' : 'moon'} size={18} />
    </button>
  );
}
