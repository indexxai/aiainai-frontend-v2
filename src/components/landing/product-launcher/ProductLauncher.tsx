"use client";

import React, { useEffect, useRef, useState } from "react";
import "./style.css";
import { LAUNCHER_PRODUCTS, ZODIAC_URL, type LauncherProduct } from "./products";

const STORE_KEY = "indexxLauncherLayout";
const MAX_FAV = 9;
const COLS = 3;

type ListName = "fav" | "rest";
type Layout = { fav: string[]; rest: string[] };

const allIds = () => LAUNCHER_PRODUCTS.map((p) => p.id);
const defaultLayout = (): Layout => ({
  fav: allIds().slice(0, MAX_FAV),
  rest: allIds().slice(MAX_FAV),
});

// Saved layout, dropping unknown products and adding new ones to the bottom list.
const loadLayout = (): Layout => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
    if (saved && Array.isArray(saved.fav) && Array.isArray(saved.rest)) {
      const known = new Set(allIds());
      const seen = new Set<string>();
      const clean = (l: string[]) =>
        l.filter((id) => known.has(id) && !seen.has(id) && seen.add(id));
      const fav = clean(saved.fav).slice(0, MAX_FAV);
      const rest = clean(saved.rest);
      const missing = allIds().filter((id) => !seen.has(id));
      return { fav, rest: [...rest, ...missing] };
    }
  } catch (e) {}
  return defaultLayout();
};

const saveLayout = (l: Layout) => {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(l));
  } catch (e) {}
};

// Jack's AI signs in with its own accounts, so there is no Indexx session to
// hand over: just go to the product.
const openProduct = (url: string) => {
  if (!url) return;
  window.location.href = url;
};

/**
 * Apply a drop. `to.index` is the tile dropped on, or null for the empty
 * part of a section (append).
 *  - same section: reorder
 *  - bottom -> favorites: insert if there is room, otherwise swap with the
 *    favorite it was dropped on (that one goes down to the dragged spot)
 *  - favorites -> bottom tile: swap; favorites -> empty bottom area: remove
 */
const applyDrop = (
  layout: Layout,
  from: { list: ListName; index: number },
  to: { list: ListName; index: number | null }
): Layout => {
  const fav = [...layout.fav];
  const rest = [...layout.rest];
  const lists = { fav, rest };
  const src = lists[from.list];
  const dst = lists[to.list];
  const id = src[from.index];
  if (id === undefined) return layout;

  if (from.list === to.list) {
    const target = to.index === null ? src.length - 1 : to.index;
    if (target === from.index) return layout;
    src.splice(from.index, 1);
    src.splice(target, 0, id);
    return { fav, rest };
  }

  const roomInFav = from.list === "rest" && fav.length < MAX_FAV;
  if (to.index === null || roomInFav) {
    src.splice(from.index, 1);
    if (to.index === null) dst.push(id);
    else dst.splice(to.index, 0, id);
    return { fav, rest };
  }

  // Swap the two products between the sections.
  const displaced = dst[to.index];
  if (displaced === undefined) return { fav, rest };
  dst[to.index] = id;
  src[from.index] = displaced;
  return { fav, rest };
};

type Props = {
  icon: string | { src: string };
  theme: "dark" | "light" | string;
};

type Drag = {
  id: string;
  from: { list: ListName; index: number };
  x: number;
  y: number;
  startX: number;
  startY: number;
  moved: boolean;
};

export const ProductLauncher: React.FC<Props> = ({ icon, theme }) => {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [layout, setLayout] = useState<Layout>(loadLayout);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [over, setOver] = useState<{ list: ListName; index: number | null } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const isLight = theme === "light";

  const byId: Record<string, LauncherProduct> = {};
  LAUNCHER_PRODUCTS.forEach((p) => (byId[p.id] = p));

  const update = (next: Layout) => {
    setLayout(next);
    saveLayout(next);
  };

  const close = () => {
    setOpen(false);
    setEditing(false);
    setDrag(null);
    setOver(null);
  };

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // What is under the pointer: a tile, or the empty part of a section.
  const hitTest = (x: number, y: number) => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    const tile = el?.closest("[data-zl-tile]") as HTMLElement | null;
    if (tile) {
      return {
        list: tile.dataset.zlList as ListName,
        index: Number(tile.dataset.zlIndex),
      };
    }
    const section = el?.closest("[data-zl-section]") as HTMLElement | null;
    if (section) return { list: section.dataset.zlSection as ListName, index: null };
    return null;
  };

  const onPointerDown = (
    e: React.PointerEvent,
    id: string,
    list: ListName,
    index: number
  ) => {
    if (!editing || e.button > 0) return;
    e.preventDefault();
    setDrag({
      id,
      from: { list, index },
      x: e.clientX,
      y: e.clientY,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
    });
  };

  useEffect(() => {
    if (!drag) return;
    const onMove = (e: PointerEvent) => {
      setDrag((d) =>
        d
          ? {
              ...d,
              x: e.clientX,
              y: e.clientY,
              moved:
                d.moved ||
                Math.abs(e.clientX - d.startX) + Math.abs(e.clientY - d.startY) > 4,
            }
          : d
      );
      setOver(hitTest(e.clientX, e.clientY));
    };
    const onUp = (e: PointerEvent) => {
      const target = hitTest(e.clientX, e.clientY);
      const moved =
        Math.abs(e.clientX - drag.startX) + Math.abs(e.clientY - drag.startY) > 4;
      if (target && moved) {
        setLayout((prev) => {
          const next = applyDrop(prev, drag.from, target);
          saveLayout(next);
          return next;
        });
      }
      setDrag(null);
      setOver(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag?.id]);

  // Keyboard while arranging: arrows move within a section,
  // Enter/Space moves a product between favorites and the list below.
  const onTileKey = (e: React.KeyboardEvent, id: string, list: ListName, index: number) => {
    if (!editing) return;
    const len = layout[list].length;
    const delta: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -COLS,
      ArrowDown: COLS,
    };
    let next: Layout | null = null;
    const step = delta[e.key];
    if (step !== undefined) {
      const to = index + step;
      if (to >= 0 && to < len) next = applyDrop(layout, { list, index }, { list, index: to });
    } else if (e.key === "Enter" || e.key === " ") {
      const other: ListName = list === "fav" ? "rest" : "fav";
      if (other === "fav" && layout.fav.length >= MAX_FAV) {
        next = applyDrop(layout, { list, index }, { list: "fav", index: MAX_FAV - 1 });
      } else {
        next = applyDrop(layout, { list, index }, { list: other, index: null });
      }
    }
    if (!next) return;
    e.preventDefault();
    update(next);
    requestAnimationFrame(() => {
      (wrapRef.current?.querySelector(`[data-zl-id="${id}"]`) as HTMLElement | null)?.focus();
    });
  };

  const renderTile = (id: string, list: ListName, index: number) => {
    const p = byId[id];
    if (!p) return null;
    const isOver = over && over.list === list && over.index === index && drag?.id !== id;
    return (
      <button
        type="button"
        key={id}
        data-zl-tile=""
        data-zl-id={id}
        data-zl-list={list}
        data-zl-index={index}
        className={`zl-tile ${drag?.id === id ? "zl-dragging" : ""} ${isOver ? "zl-over" : ""}`}
        onPointerDown={(e) => onPointerDown(e, id, list, index)}
        onKeyDown={(e) => onTileKey(e, id, list, index)}
        onClick={() => {
          if (!editing) openProduct(p.url());
        }}
        title={p.name}
      >
        <img
          src={isLight ? p.light : p.dark}
          alt=""
          draggable={false}
          style={isLight && p.lightFilter ? { filter: p.lightFilter } : undefined}
        />
        <div className="zl-label">{p.name}</div>
      </button>
    );
  };

  const dragged = drag ? byId[drag.id] : null;
  const sectionOver = (list: ListName) =>
    drag && over && over.list === list && over.index === null ? "zl-section-over" : "";

  return (
    <div className="zl-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`zl-trigger ${isLight ? "zl-light" : ""} ${open ? "zl-trigger-open" : ""}`}
        aria-label="Indexx products"
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
      >
        <img src={typeof icon === "string" ? icon : icon.src} alt="" />
      </button>

      {open && (
        <div
          className={`zl-panel ${isLight ? "zl-light" : ""} ${editing ? "zl-editing" : ""} ${drag ? "zl-is-dragging" : ""}`}
          role="dialog"
          aria-label="Indexx products"
        >
          <div className={`zl-card ${sectionOver("fav")}`} data-zl-section="fav">
            <div className="zl-head">
              <div className="zl-title">Your favorites</div>
              <div className="zl-actions">
                {editing && (
                  <button
                    type="button"
                    className="zl-text-btn zl-reset"
                    onClick={() => update(defaultLayout())}
                  >
                    Reset
                  </button>
                )}
                <button
                  type="button"
                  className={editing ? "zl-text-btn zl-done" : "zl-edit"}
                  aria-label={editing ? "Done" : "Edit favorites"}
                  title={editing ? "Done" : "Edit favorites"}
                  onClick={() => setEditing((v) => !v)}
                >
                  {editing ? (
                    "Done"
                  ) : (
                    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                      <path
                        fill="currentColor"
                        d="M3 17.25V21h3.75L17.8 9.94l-3.75-3.75L3 17.25zM20.7 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            {editing && (
              <div className="zl-hint">Drag to rearrange · up to {MAX_FAV} favorites</div>
            )}
            <div className="zl-grid">
              {layout.fav.map((id, i) => renderTile(id, "fav", i))}
              {editing && layout.fav.length === 0 && (
                <div className="zl-empty">Drag products here</div>
              )}
            </div>
          </div>

          <div className={`zl-rest ${sectionOver("rest")}`} data-zl-section="rest">
            <div className="zl-grid">
              {layout.rest.map((id, i) => renderTile(id, "rest", i))}
              {editing && layout.rest.length === 0 && (
                <div className="zl-empty">Drag here to remove from favorites</div>
              )}
            </div>
          </div>

          <a
            className="zl-explore"
            href={ZODIAC_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Explore Zodiac
          </a>

          {drag && drag.moved && dragged && (
            <div className="zl-ghost" style={{ left: drag.x, top: drag.y }}>
              <img
                src={isLight ? dragged.light : dragged.dark}
                alt=""
                style={isLight && dragged.lightFilter ? { filter: dragged.lightFilter } : undefined}
              />
              <div className="zl-label">{dragged.name}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductLauncher;
