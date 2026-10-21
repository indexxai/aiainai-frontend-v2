'use client';
import { useEffect } from 'react';

/** Sections below the hero, and the items inside them that come in one after another. */
const SECTIONS = '.ml main > section:not(.ml-hero)';
const ITEMS = [
  '.ml-feats > li',
  '.ml-flow > li',
  '.ml-plans > *',
  '.ml-pains > li',
  '.ml-points > li',
  '.ml-mem .ml-tag',
  '.ml-card .ml-row',
  '.ml-modes > *',
  '.ml-switches > li',
  '.ml-faq details',
].join(', ');

/**
 * Slides each section up as it scrolls into view. Renders nothing; without JavaScript (or with
 * reduced motion) every section simply shows, because nothing is hidden until this runs.
 */
export function Reveal() {
  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>(SECTIONS));
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (still || !('IntersectionObserver' in window)) return;

    for (const s of sections) {
      s.dataset.reveal = '';
      s.querySelectorAll<HTMLElement>(ITEMS).forEach((el, i) => {
        el.dataset.revealItem = '';
        el.style.setProperty('--ri', String(Math.min(i, 10)));
      });
    }
    const timers: number[] = [];
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const s = e.target as HTMLElement;
          s.classList.add('is-in');
          io.unobserve(s);
          // Once in place, drop the reveal styles so hover effects run without the stagger delay.
          timers.push(
            window.setTimeout(() => {
              s.querySelectorAll<HTMLElement>('[data-reveal-item]').forEach((el) => {
                delete el.dataset.revealItem;
              });
              delete s.dataset.reveal;
              s.classList.remove('is-in');
            }, 1800),
          );
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.08 },
    );
    sections.forEach((s) => io.observe(s));
    return () => {
      io.disconnect();
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, []);
  return null;
}
