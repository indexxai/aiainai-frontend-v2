export type ThemePreference = 'system' | 'dark' | 'light';
export type ResolvedTheme = 'dark' | 'light';

export const THEME_STORAGE_KEY = 'aiainai-theme';
/** Product default: the dark workspace look from the designs. */
export const DEFAULT_THEME: ThemePreference = 'dark';

export function resolveTheme(pref: ThemePreference, systemPrefersDark: boolean): ResolvedTheme {
  if (pref === 'system') return systemPrefersDark ? 'dark' : 'light';
  return pref;
}

export function isThemePreference(v: unknown): v is ThemePreference {
  return v === 'system' || v === 'dark' || v === 'light';
}

/**
 * Inline script for <head>: applies the saved theme before the first paint so the page
 * never flashes the wrong colours. Kept tiny and dependency-free on purpose.
 */
export const themeBootScript = `(function(){try{var p=localStorage.getItem('${THEME_STORAGE_KEY}');if(p!=='system'&&p!=='dark'&&p!=='light')p='${DEFAULT_THEME}';var t=p==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):p;document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t;}catch(e){}})();`;
