'use client';

import * as React from 'react';

/**
 * Global 3D tilt for any element marked [data-tilt]. The card rotates toward
 * the pointer and resets on leave. No-op on coarse pointers / reduced motion.
 */
export function Tilt() {
  React.useEffect(() => {
    const fine =
      window.matchMedia?.('(pointer: fine)').matches &&
      !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!fine) return;

    let active: HTMLElement | null = null;

    const onMove = (e: PointerEvent) => {
      const t = (e.target as HTMLElement | null)?.closest('[data-tilt]') as HTMLElement | null;
      if (t !== active && active) {
        active.style.transform = '';
        active = null;
      }
      if (!t) return;
      active = t;
      const r = t.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width;
      const ny = (e.clientY - r.top) / r.height;
      // cursor-tracked glow position (z-card uses --mx/--my)
      t.style.setProperty('--mx', `${nx * 100}%`);
      t.style.setProperty('--my', `${ny * 100}%`);
      const max = 6;
      t.style.transform = `perspective(900px) rotateY(${(nx - 0.5) * max}deg) rotateX(${-(ny - 0.5) * max}deg) translateZ(0)`;
    };

    const onLeave = () => {
      if (active) {
        active.style.transform = '';
        active = null;
      }
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return null;
}
