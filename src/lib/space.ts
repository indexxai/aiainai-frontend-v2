/** Personal or Business. The backend reads this cookie on every request (via the /api proxy). */
export type Space = 'personal' | 'business';

export const SPACE_COOKIE = 'aiainai_space';

/** Remember the chosen space in this browser (read again by the server on the next request). */
export function saveSpace(space: Space): void {
  document.cookie = `${SPACE_COOKIE}=${space}; path=/; max-age=31536000; samesite=lax`;
}

export const SPACE_ITEMS = [
  { value: 'personal', label: 'Personal', icon: 'user' },
  { value: 'business', label: 'Business', icon: 'briefcase' },
] as const;

/**
 * After the space changes, load the page fresh in the new space. A full page load (not a client
 * navigation) so the header, the sidebar and every cached page are rendered again for that
 * space — like switching accounts.
 */
export function openInSpace(href = '/'): void {
  window.location.assign(href);
}
