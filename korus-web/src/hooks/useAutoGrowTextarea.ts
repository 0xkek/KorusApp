import { useEffect, type RefObject } from 'react';

/**
 * Grows a textarea to fit its content.
 *
 * Composers were fixed at their `rows` height, so a long post scrolled inside a
 * one-line box and hid what was being typed. Past `maxHeight` the field scrolls
 * instead of growing, so the toolbar below it stays reachable.
 */
export function useAutoGrowTextarea(
  ref: RefObject<HTMLTextAreaElement | null>,
  value: string,
  maxHeight = 320
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    const next = Math.min(el.scrollHeight, maxHeight);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, [ref, value, maxHeight]);
}
