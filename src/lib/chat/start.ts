import { api } from '@/lib/api/client';
import { toApiError, type ApiError } from '@/lib/api/errors';
import { saveDraft } from '@/lib/draft';
import type { Attachment } from '@/lib/files/files';

/**
 * Starts a chat with a first message: creates the chat (in a project, if given), hands the
 * message to the chat page (which sends it and streams the answer) and returns where to go.
 */
export async function startChat(
  text: string,
  model: string,
  files: Attachment[] = [],
  projectId?: string,
  appsOff: string[] = [],
): Promise<{ href: string } | { error: ApiError }> {
  const { data, error } = await api.POST('/api/chats', {
    body: { model, ...(projectId && { projectId }), ...(appsOff.length && { appsOff }) },
  });
  if (!data) return { error: toApiError(error) };
  saveDraft({ chatId: data.id, text, model, files });
  return { href: `/chat/${data.id}` };
}
