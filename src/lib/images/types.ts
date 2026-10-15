import type { IconName } from '@/ui';
import type { Schemas } from '@/lib/api/client';
import type { ModelMenu, ModelOption } from '@/lib/models';

export type ImageBatch = Schemas['ImageGenerationDto'];
export type ImageItem = Schemas['ImageItemDto'];
export type ImageRatio = ImageBatch['ratio'];
export type ImageStyle = ImageBatch['style'];

export const RATIOS: { value: ImageRatio; label: string; w: number; h: number }[] = [
  { value: '1:1', label: '1:1', w: 14, h: 14 },
  { value: '16:9', label: '16:9', w: 20, h: 12 },
  { value: '9:16', label: '9:16', w: 11, h: 18 },
  { value: '4:3', label: '4:3', w: 17, h: 13 },
  { value: '3:2', label: '3:2', w: 18, h: 12 },
];

export const STYLES: { value: ImageStyle; label: string }[] = [
  { value: 'photo', label: 'Photo' },
  { value: 'illustration', label: 'Illustration' },
  { value: '3d', label: '3D render' },
  { value: 'flat', label: 'Flat vector' },
  { value: 'none', label: 'None' },
];

export const COUNTS = [1, 2, 4] as const;

export const SUGGESTIONS: { icon: IconName; text: string; style: ImageStyle }[] = [
  { icon: 'store', text: 'A product photo of a coffee bag on a marble counter', style: 'photo' },
  { icon: 'megaphone', text: 'A bright poster for a summer sale', style: 'flat' },
  { icon: 'users', text: 'A friendly team photo for an About page', style: 'photo' },
  { icon: 'image', text: 'A calm desk by a window at sunrise', style: 'photo' },
];

export const MAX_PROMPT = 1000;

/**
 * Which model Auto will use for a style — the same rule as the backend
 * (aiainai-backend src/models/models.logic.ts, AUTO_IMAGE_PREFERENCE), for the cost line.
 */
const AUTO_PREFERENCE: Record<ImageStyle, string[]> = {
  photo: ['imagen', 'gpt-image', 'flux', 'seedream'],
  illustration: ['flux', 'gpt-image', 'seedream', 'imagen'],
  '3d': ['flux', 'gpt-image', 'imagen', 'seedream'],
  flat: ['flux', 'gpt-image', 'seedream', 'imagen'],
  none: ['gpt-image', 'imagen', 'flux', 'seedream'],
};

export function modelFor(menu: ModelMenu, key: string, style: ImageStyle): ModelOption | null {
  const usable = menu.models.filter((m) => !m.locked);
  if (key !== 'auto') return menu.models.find((m) => m.key === key) ?? null;
  for (const k of AUTO_PREFERENCE[style]) {
    const hit = usable.find((m) => m.key === k);
    if (hit) return hit;
  }
  return usable[0] ?? null;
}
