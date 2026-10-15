/**
 * The first message of a new chat, carried from Home or the new-chat screen to the chat page,
 * which sends it. Kept in this tab's session storage only.
 */
export interface Draft {
  chatId: string;
  text: string;
  model: string;
  at: number;
}

const KEY = 'aiainai:draft';
const MAX_AGE_MS = 5 * 60 * 1000;

export function saveDraft(d: Omit<Draft, 'at'>): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...d, at: Date.now() }));
  } catch {
    // storage unavailable (private mode): the chat opens empty and the text is lost
  }
}

/** Returns the draft for this chat and removes it, so it is sent only once. */
export function takeDraft(chatId: string): Draft | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Draft;
    if (d.chatId !== chatId) return null;
    sessionStorage.removeItem(KEY);
    if (typeof d.text !== 'string' || Date.now() - d.at > MAX_AGE_MS) return null;
    return d;
  } catch {
    return null;
  }
}
