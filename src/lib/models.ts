import type { Schemas } from './api/client';

export type ModelMenu = Schemas['ModelMenuDto'];
export type ModelOption = Schemas['ModelOptionDto'];
export type AutoOption = Schemas['AutoOptionDto'];

export const AUTO = 'auto';

/** A row in the model menu: Auto, a provider heading, or a model. */
export type MenuRow =
  | { type: 'auto'; option: AutoOption }
  | { type: 'group'; label: string }
  | { type: 'model'; option: ModelOption };

/**
 * Menu order from the designs: Auto, then one group per provider with two or more models,
 * then "More models" for the rest. Image models are one group.
 */
export function menuRows(menu: Pick<ModelMenu, 'kind' | 'auto' | 'models'>, query = ''): MenuRow[] {
  const q = query.trim().toLowerCase();
  const match = (m: { name: string; tags: string[]; provider?: string; description: string }) =>
    !q || [m.name, m.provider ?? '', m.description, ...m.tags].join(' ').toLowerCase().includes(q);

  const rows: MenuRow[] = [];
  if (menu.auto && match({ ...menu.auto, provider: 'Recommended' }))
    rows.push({ type: 'auto', option: menu.auto });

  const models = menu.models.filter(match);
  if (menu.kind === 'image') {
    if (models.length) rows.push({ type: 'group', label: 'Image models' });
    for (const m of models) rows.push({ type: 'model', option: m });
    return rows;
  }
  const count = new Map<string, number>();
  for (const m of menu.models) count.set(m.provider, (count.get(m.provider) ?? 0) + 1);
  const groups = new Map<string, ModelOption[]>();
  for (const m of models) {
    const g = (count.get(m.provider) ?? 0) >= 2 ? m.provider : 'More models';
    groups.set(g, [...(groups.get(g) ?? []), m]);
  }
  const more = groups.get('More models');
  groups.delete('More models');
  if (more) groups.set('More models', more);
  for (const [label, list] of groups) {
    rows.push({ type: 'group', label });
    for (const m of list) rows.push({ type: 'model', option: m });
  }
  return rows;
}

/** "3× credits" for text (relative to the cheapest), "4 credits / image" for images. */
export function costLabel(m: Pick<ModelOption, 'credits'>, kind: 'text' | 'image'): string {
  return kind === 'image' ? `${m.credits} credits / image` : `${m.credits}× credits`;
}

export function nameOf(menu: Pick<ModelMenu, 'models'>, key: string): string {
  if (key === AUTO) return 'Auto';
  return menu.models.find((m) => m.key === key)?.name ?? 'Auto';
}
