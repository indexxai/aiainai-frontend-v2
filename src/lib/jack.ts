import type { Space } from './space';

/** One mascot picture in both themes: `dark` shows on the dark theme, `light` on the light one. */
export type JackArt = { dark: string; light: string };

/**
 * The two Jacks: Jack of all trades (Personal) and Captain Jack (Business).
 * Each has a white figure for the dark theme and a coloured one for the light theme
 * (Jack is blue, Captain Jack is green). Render them with <JackImg>, which swaps on theme.
 */
export const JACKS = {
  personal: {
    name: 'Jack of all trades',
    full: { dark: '/jack/jack-full-dark.png', light: '/jack/jack-full-light.png' },
    head: { dark: '/jack/jack-head-dark.png', light: '/jack/jack-head-light.png' },
  },
  business: {
    name: 'Captain Jack',
    full: { dark: '/jack/captain-full-dark.png', light: '/jack/captain-full-light.png' },
    head: { dark: '/jack/captain-head-dark.png', light: '/jack/captain-head-light.png' },
  },
} as const satisfies Record<Space, { name: string; full: JackArt; head: JackArt }>;
