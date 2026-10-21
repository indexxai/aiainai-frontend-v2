import { Extension, type Editor } from '@tiptap/core';
import { Plugin, PluginKey, type EditorState } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

/**
 * What AI editing shows inside the document, as editor decorations (nothing is written into the
 * document until the person accepts):
 * - `range`: the text being worked on — highlighted (`sel`) while asking, struck through (`old`)
 *   while a suggested replacement is shown;
 * - `widget`: one DOM element placed after a block, which React fills with the Ask AI popover,
 *   the suggestion card or the assistant's proposed section (via a portal).
 * Positions follow edits made meanwhile.
 */
export interface AiMarksState {
  range: { from: number; to: number } | null;
  mode: 'sel' | 'old';
  widget: number | null;
}

export const aiMarksKey = new PluginKey<AiMarksState>('aiMarks');

const EMPTY: AiMarksState = { range: null, mode: 'sel', widget: null };

export function createAiMarks(widgetEl: HTMLElement) {
  return Extension.create({
    name: 'aiMarks',
    addProseMirrorPlugins() {
      return [
        new Plugin<AiMarksState>({
          key: aiMarksKey,
          state: {
            init: () => EMPTY,
            apply(tr, prev) {
              const meta = tr.getMeta(aiMarksKey) as Partial<AiMarksState> | null | undefined;
              if (meta === null) return EMPTY;
              let next = prev;
              if (tr.docChanged) {
                next = {
                  ...prev,
                  range: prev.range
                    ? { from: tr.mapping.map(prev.range.from, 1), to: tr.mapping.map(prev.range.to, -1) }
                    : null,
                  widget: prev.widget === null ? null : tr.mapping.map(prev.widget, 1),
                };
                if (next.range && next.range.from >= next.range.to) next = { ...next, range: null };
              }
              return meta ? { ...next, ...meta } : next;
            },
          },
          props: {
            decorations(state) {
              const s = aiMarksKey.getState(state);
              if (!s) return null;
              const decos: Decoration[] = [];
              if (s.range)
                decos.push(Decoration.inline(s.range.from, s.range.to, { class: `de-ai-${s.mode}` }));
              if (s.widget !== null)
                decos.push(
                  Decoration.widget(s.widget, () => widgetEl, {
                    key: 'ai-widget',
                    side: 1,
                    ignoreSelection: true,
                    // Typing and clicks inside the card belong to the card, not the editor.
                    stopEvent: () => true,
                  }),
                );
              return DecorationSet.create(state.doc, decos);
            },
          },
        }),
      ];
    },
  });
}

export function setAiMarks(editor: Editor, next: Partial<AiMarksState> | null) {
  editor.view.dispatch(editor.state.tr.setMeta(aiMarksKey, next).setMeta('addToHistory', false));
}

export function aiMarks(state: EditorState): AiMarksState {
  return aiMarksKey.getState(state) ?? EMPTY;
}

/** The end of the top-level block that contains `pos` (where a card below it goes). */
export function afterBlock(state: EditorState, pos: number): number {
  const $p = state.doc.resolve(Math.min(pos, state.doc.content.size));
  return $p.depth >= 1 ? $p.after(1) : state.doc.content.size;
}

/** Sections are "# " / "## " headings: the range of the one with this heading, or null. */
export function sectionRange(state: EditorState, heading: string): { from: number; to: number } | null {
  const want = heading.trim().toLowerCase();
  let from = -1;
  let to = state.doc.content.size;
  let level = 0;
  state.doc.forEach((node, offset) => {
    if (node.type.name !== 'heading' || Number(node.attrs.level) > 2) return;
    if (from < 0) {
      if (node.textContent.trim().toLowerCase() === want) {
        from = offset;
        level = Number(node.attrs.level);
      }
    } else if (to === state.doc.content.size && Number(node.attrs.level) <= level) {
      to = offset;
    }
  });
  return from < 0 ? null : { from, to };
}
