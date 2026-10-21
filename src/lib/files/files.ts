import type { Schemas } from '@/lib/api/client';
import { toApiError } from '@/lib/api/errors';
import type { IconName } from '@/ui';

export type FileInfo = Schemas['FileDto'];
export type FileKind = FileInfo['kind'];
export type Attachment = Schemas['AttachmentDto'];

export const MAX_FILE_BYTES = 20 * 1024 * 1024;
export const MAX_FILES = 5;

/** What the file picker offers (the server checks again). */
export const ACCEPT =
  '.pdf,.docx,.xlsx,.csv,.txt,.md,.markdown,.json,.jpg,.jpeg,.png,.webp,.gif,application/pdf,image/*,text/plain,text/csv,text/markdown';

const TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv',
  txt: 'text/plain',
  md: 'text/markdown',
  markdown: 'text/markdown',
  json: 'application/json',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};

export const KIND_ICON: Record<FileKind, IconName> = {
  pdf: 'file-text',
  word: 'file-text',
  sheet: 'table',
  text: 'file-text',
  image: 'image',
};
export const KIND_LABEL: Record<FileKind, string> = {
  pdf: 'PDF',
  word: 'Word',
  sheet: 'Spreadsheet',
  text: 'Text',
  image: 'Image',
};

export function kindOf(name: string): FileKind | null {
  const ext = name.toLowerCase().split('.').pop() ?? '';
  if (ext === 'pdf') return 'pdf';
  if (ext === 'docx') return 'word';
  if (ext === 'xlsx' || ext === 'csv') return 'sheet';
  if (['txt', 'md', 'markdown', 'json'].includes(ext)) return 'text';
  if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) return 'image';
  return null;
}

export const fileSize = (n: number) =>
  n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;

/** A quick check before uploading, so obvious problems are said at once. Null when it looks fine. */
export function problemWith(file: File): string | null {
  const ext = file.name.toLowerCase().split('.').pop() ?? '';
  if (ext === 'doc') return `${file.name}: old Word files (.doc) can’t be read. Save it as .docx or PDF.`;
  if (ext === 'xls') return `${file.name}: old Excel files (.xls) can’t be read. Save it as .xlsx or CSV.`;
  if (!kindOf(file.name)) return `${file.name}: only PDF, Word, Excel, CSV, text and images can be read.`;
  if (file.size === 0) return `${file.name} is empty.`;
  if (file.size > MAX_FILE_BYTES)
    return `${file.name} is too large (${fileSize(file.size)}). Use files under 20 MB.`;
  return null;
}

/** Upload one file; the server reads its text. Returns the saved file or a message to show. */
export async function uploadFile(
  file: File,
  signal?: AbortSignal,
): Promise<{ file: FileInfo } | { error: string }> {
  const problem = problemWith(file);
  if (problem) return { error: problem };
  const ext = file.name.toLowerCase().split('.').pop() ?? '';
  try {
    const res = await fetch(`/api/files?name=${encodeURIComponent(file.name)}`, {
      method: 'POST',
      headers: { 'content-type': file.type || TYPES[ext] || 'application/octet-stream' },
      body: file,
      credentials: 'include',
      signal,
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) return { error: toApiError(body).message };
    return { file: body as FileInfo };
  } catch {
    return {
      error: signal?.aborted
        ? 'Cancelled'
        : `${file.name} didn’t upload. Check your connection and try again.`,
    };
  }
}

/** Where to open (or, with download, save) a file. */
export const fileUrl = (id: string, download = false) =>
  `/api/files/${id}/content${download ? '?download=1' : ''}`;
