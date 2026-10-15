'use client';
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Badge, Dialog, Icon, cx } from '@/ui';
import { AUTO, costLabel, menuRows, type MenuRow, type ModelMenu, type ModelOption } from '@/lib/models';
import { PHONE_QUERY, useMediaQuery } from '@/lib/useMediaQuery';
import { CompareModelsDialog, UpgradeDialog } from './ModelDialogs';
import './models.css';

export interface ModelPickerProps {
  menu: ModelMenu;
  value: string;
  onChange: (key: string) => void;
  /** Which edge of the button the menu lines up with. */
  align?: 'start' | 'end';
  /** Note at the bottom of the desktop menu. */
  footNote?: string;
  className?: string;
}

type Selectable = Extract<MenuRow, { type: 'auto' | 'model' }>;
const keyOf = (r: Selectable) => r.option.key;

/**
 * The model menu from the designs: search, Auto first, models grouped by provider with their
 * cost, and a Pro badge on models outside the plan (picking one explains the upgrade).
 * Desktop: a popover (combobox + listbox, full keyboard support). Phone: a bottom sheet.
 */
export function ModelPicker({ menu, value, onChange, align = 'end', footNote, className }: ModelPickerProps) {
  const phone = useMediaQuery(PHONE_QUERY);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [place, setPlace] = useState<{ below: boolean; maxH: number }>({ below: true, maxH: 460 });
  const [locked, setLocked] = useState<ModelOption | null>(null);
  const [comparing, setComparing] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const listId = useId();
  const optId = (i: number) => `${listId}-o${i}`;

  const rows = useMemo(() => menuRows(menu, phone ? '' : query), [menu, query, phone]);
  const selectable = rows.filter((r): r is Selectable => r.type !== 'group');
  /** Position of each selectable row among the options, for keyboard focus. */
  const optionIndex = new Map(selectable.map((r, i) => [r, i]));
  const current = value === AUTO ? null : menu.models.find((m) => m.key === value);
  const label = current?.name ?? 'Auto';

  const close = (refocus = true) => {
    setOpen(false);
    setQuery('');
    if (refocus) btn.current?.focus();
  };

  const pick = (r: Selectable) => {
    if (r.type === 'model' && r.option.locked) {
      close(false);
      setLocked(r.option);
      return;
    }
    onChange(keyOf(r));
    close();
  };

  const openMenu = () => {
    const i = selectable.findIndex((r) => keyOf(r) === value);
    setActive(Math.max(0, i));
    setOpen(true);
  };

  // Desktop: open below the button when there is room, otherwise above.
  useLayoutEffect(() => {
    if (!open || phone || !btn.current) return;
    const r = btn.current.getBoundingClientRect();
    const below = window.innerHeight - r.bottom - 16;
    const above = r.top - 16;
    const useBelow = below >= 360 || below >= above;
    setPlace({ below: useBelow, maxH: Math.max(220, Math.min(460, (useBelow ? below : above) - 8)) });
  }, [open, phone]);

  // Keep the highlighted option in view.
  useEffect(() => {
    if (!open || phone) return;
    document.getElementById(optId(active))?.scrollIntoView({ block: 'nearest' });
    // optId is stable for this instance
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, open, phone]);

  // Desktop: close on a click outside.
  useEffect(() => {
    if (!open || phone) return;
    const down = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btn.current?.contains(t) || pop.current?.contains(t)) return;
      close(false);
    };
    document.addEventListener('mousedown', down);
    return () => document.removeEventListener('mousedown', down);
  });

  const onSearchKey = (e: KeyboardEvent<HTMLInputElement>) => {
    const n = selectable.length;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (n) setActive((a) => (a + 1) % n);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (n) setActive((a) => (a - 1 + n) % n);
    } else if (e.key === 'Home' && !query) {
      e.preventDefault();
      setActive(0);
    } else if (e.key === 'End' && !query) {
      e.preventDefault();
      setActive(n - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const r = selectable[active];
      if (r) pick(r);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      close();
    } else if (e.key === 'Tab') {
      close(false);
    }
  };

  const desktopMenu = open && !phone && (
    <div
      ref={pop}
      className={cx('as-model-menu', align === 'end' && 'end', place.below && 'below')}
      style={{ maxHeight: place.maxH }}
    >
      <div className="as-model-search">
        <Icon name="search" size={16} />
        <input
          autoFocus
          role="combobox"
          aria-label="Search models"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={selectable.length ? optId(active) : undefined}
          aria-autocomplete="list"
          placeholder="Search models"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={onSearchKey}
        />
      </div>
      <div
        className="as-model-list"
        role="listbox"
        id={listId}
        aria-label={menu.kind === 'image' ? 'Image model' : 'Model'}
      >
        {rows.length === 0 && <div className="as-model-empty">No model matches “{query}”</div>}
        {rows.map((r) => {
          if (r.type === 'group')
            return (
              <div key={`g-${r.label}`} className="as-model-group" role="presentation">
                {r.label}
              </div>
            );
          const i = optionIndex.get(r) ?? -1;
          const isAuto = r.type === 'auto';
          const o = r.option;
          const sel = o.key === value;
          const isLocked = !isAuto && (o as ModelOption).locked;
          return (
            <div
              key={o.key}
              id={optId(i)}
              role="option"
              aria-selected={sel}
              aria-label={isLocked ? `${o.name}, needs Jack Personal` : undefined}
              className={cx('as-model-item', sel && 'sel', i === active && 'active', isLocked && 'dim')}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(r)}
            >
              <span className="as-model-ic">
                <Icon name={isAuto ? 'wand-sparkles' : 'bot'} size={16} />
              </span>
              <span className="as-model-txt">
                <span className="nm">
                  {o.name}
                  <span className="pv">{isAuto ? 'Recommended' : (o as ModelOption).provider}</span>
                </span>
                <span className="ds">{o.description}</span>
                <span className="tg">
                  {o.tags
                    .filter((t) => !(isAuto && t === 'Credits vary'))
                    .map((t) => (
                      <span key={t} className="as-model-tag">
                        {t}
                      </span>
                    ))}
                  <span className="as-model-cost">
                    {isAuto ? 'Credits vary' : costLabel(o as ModelOption, menu.kind)}
                  </span>
                </span>
              </span>
              {isLocked ? (
                <Badge tone="brand" icon="lock">
                  Personal
                </Badge>
              ) : sel ? (
                <Icon name="check" size={16} className="as-model-check" />
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="as-model-foot">
        <span>{footNote ?? 'Your default model is set in Settings.'}</span>
        <button
          type="button"
          className="mp-link"
          onClick={() => {
            close(false);
            setComparing(true);
          }}
        >
          Compare models
        </button>
      </div>
    </div>
  );

  return (
    <span className={cx('as-model', className)}>
      <button
        ref={btn}
        type="button"
        className="as-chip as-model-btn"
        aria-haspopup={phone ? 'dialog' : 'listbox'}
        aria-expanded={open}
        aria-label={`Model: ${label}`}
        title="Choose model"
        onClick={() => (open ? close(false) : openMenu())}
      >
        <Icon name={menu.kind === 'image' ? 'image' : current ? 'bot' : 'sparkles'} size={16} />
        <span className="lbl">{label}</span>
        <Icon name={open && !phone ? 'chevron-up' : 'chevron-down'} size={14} className="as-caret" />
      </button>
      {desktopMenu}

      {phone && (
        <Dialog open={open} sheet title="Choose a model" className="flush" onClose={() => close()}>
          <div role="listbox" aria-label="Model" className="mp-sheet-list">
            {rows.map((r) =>
              r.type === 'group' ? (
                <div key={`g-${r.label}`} className="mp-sheet-group" role="presentation">
                  {r.label}
                </div>
              ) : (
                <button
                  key={r.option.key}
                  type="button"
                  role="option"
                  aria-selected={r.option.key === value}
                  className={cx('mp-opt', r.option.key === value && 'on')}
                  onClick={() => pick(r)}
                >
                  <span className="tx">
                    <span className="a">
                      {r.option.name}
                      {r.type === 'model' && r.option.requiredPlan === 'pro' ? ' · Jack Personal' : ''}
                    </span>
                    <span className="b">{r.option.description}</span>
                  </span>
                  {r.type === 'model' && (
                    <span className="c">
                      {menu.kind === 'image' ? `${r.option.credits}/img` : `${r.option.credits}×`}
                    </span>
                  )}
                  {r.option.key === value && <Icon name="check" size={18} />}
                </button>
              ),
            )}
          </div>
          <div className="mp-sheet-foot">
            <span>{menu.kind === 'image' ? 'Credits per image' : '1× = 1 credit a message'}</span>
            <button
              type="button"
              className="mp-link"
              onClick={() => {
                close(false);
                setComparing(true);
              }}
            >
              Compare models
            </button>
          </div>
        </Dialog>
      )}

      <UpgradeDialog
        model={locked}
        onClose={() => setLocked(null)}
        onUseAuto={() => {
          setLocked(null);
          onChange(AUTO);
        }}
      />
      <CompareModelsDialog menu={menu} open={comparing} onClose={() => setComparing(false)} />
    </span>
  );
}
