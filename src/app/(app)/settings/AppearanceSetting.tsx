'use client';
import { Tabs } from '@/ui';
import { isThemePreference } from '@/lib/theme/theme';
import { useTheme } from '@/lib/theme/ThemeProvider';

export function AppearanceSetting() {
  const { preference, setPreference } = useTheme();
  return (
    <Tabs
      variant="segmented"
      label="Theme"
      value={preference}
      onChange={(v) => isThemePreference(v) && setPreference(v)}
      items={[
        { value: 'system', label: 'System', icon: 'monitor' },
        { value: 'dark', label: 'Dark' },
        { value: 'light', label: 'Light' },
      ]}
    />
  );
}
