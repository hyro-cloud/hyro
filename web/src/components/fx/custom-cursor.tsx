'use client';

import * as React from 'react';

/**
 * ZAPP-style custom cursor: a small dot + a lagging ring that grows over
 * interactive elements. The elements are always rendered (refs stay valid);
 * they're hidden via CSS unless `has-custom-cursor` is set, which only happens
 * on fine pointers without reduced-motion. Native cursor stays elsewhere.
 */
export function CustomCursor() {
  const dotRef = React.useRef<HTMLDivElement>(null);
  const ringRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const fine =
      window.matchMedia?.('(pointer: fine)').matches &&
      !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!fine) return;

    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    document.documentElement.classList.add('has-custom-cursor');

    let rx = window.innerWidth / 2;
    let ry = window.innerHeight / 2;
    let mx = rx;
    let my = ry;
    let raf = 0;
    let magnetized: HTMLElement | null = null;

    const onMove = (e: PointerEvent) => {
      mx = e.clientX;
      my = e.clientY;
      dot.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
      const t = e.target as HTMLElement | null;
      const interactive = !!t?.closest('a, button, [data-magnetic], input, [role="button"]');
      ring.classList.toggle('cursor-ring--active', interactive);

      // Magnetic pull on [data-magnetic] elements
      const mag = t?.closest('[data-magnetic]') as HTMLElement | null;
      if (mag !== magnetized && magnetized) {
        magnetized.style.transform = '';
        magnetized = null;
      }
      if (mag) {
        magnetized = mag;
        const r = mag.getBoundingClientRect();
        const dx = (mx - (r.left + r.width / 2)) * 0.25;
        const dy = (my - (r.top + r.height / 2)) * 0.35;
        mag.style.transform = `translate(${dx}px, ${dy}px)`;
      }
    };

    const loop = () => {
      const dx = mx - rx;
      const dy = my - ry;
      // Only write while the ring is meaningfully catching up — keeps the DOM
      // idle when the pointer is still (avoids per-frame style writes).
      if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
        rx += dx * 0.18;
        ry += dy * 0.18;
        ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      }
      raf = requestAnimationFrame(loop);
    };

    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) raf = requestAnimationFrame(loop);
    };

    window.addEventListener('pointermove', onMove);
    document.addEventListener('visibilitychange', onVisibility);
    raf = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('visibilitychange', onVisibility);
      cancelAnimationFrame(raf);
      document.documentElement.classList.remove('has-custom-cursor');
    };
  }, []);

  return (
    <>
      <div ref={dotRef} className="cursor-dot" aria-hidden />
      <div ref={ringRef} className="cursor-ring" aria-hidden />
    </>
  );
}
