'use client';

import * as React from 'react';
import Link from 'next/link';
import { HeroCanvas } from '@/components/fx/hero-canvas';
import { SITE } from '@/lib/content';

export function HeroSection() {
  const heroRef = React.useRef<HTMLElement>(null);

  // Spark discharge on click anywhere in the hero (ZAPP signature).
  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('a, button, input')) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const n = 14;
    for (let i = 0; i < n; i++) {
      const s = document.createElement('span');
      s.className = 'spark';
      s.style.left = `${e.clientX}px`;
      s.style.top = `${e.clientY}px`;
      document.body.appendChild(s);
      const ang = (Math.PI * 2 * i) / n + Math.random() * 0.6;
      const dist = 50 + Math.random() * 90;
      const dx = Math.cos(ang) * dist;
      const dy = Math.sin(ang) * dist;
      s.animate(
        [
          { transform: 'translate(0,0) scale(1)', opacity: 1 },
          { transform: `translate(${dx}px, ${dy}px) scale(${Math.random() * 1.6 + 0.3})`, opacity: 0 },
        ],
        { duration: 600 + Math.random() * 400, easing: 'cubic-bezier(0.16,1,0.3,1)' },
      ).onfinish = () => s.remove();
    }
    window.dispatchEvent(
      new CustomEvent('hyro:discharge', { detail: { nx: (e.clientX / window.innerWidth) * 2 - 1 } }),
    );
  };

  return (
    <section ref={heroRef} id="home" className="z-hero" onPointerDown={onPointerDown}>
      <HeroCanvas />
      <div className="z-hero__grid" aria-hidden />

      <div className="z-hero__content">
        <p className="z-hero__eyebrow">
          <span className="dot dot--live" /> System online&nbsp;//&nbsp;v{SITE.version}&nbsp;//&nbsp;Agent OS
        </p>

        <h1 className="z-hero__title" aria-label={SITE.name}>
          {'HYRO'.split('').map((ch, i) => (
            <span key={`${ch}-${i}`} className="z-hero__char">
              {ch}
            </span>
          ))}
        </h1>

        <p className="z-hero__sub">
          The Operating System for — <span className="zaccent">Autonomous Agents.</span>
        </p>

        <p className="z-hero__copy">{SITE.description}</p>

        <div className="z-hero__actions">
          <Link href="/app" className="z-btn z-btn--primary" data-magnetic>
            <span>Launch App</span>
            <span className="z-btn__icon">❯_</span>
          </Link>
          <a href="#cli" className="z-btn z-btn--ghost" data-magnetic>
            <span>Install CLI</span>
          </a>
        </div>

        <p className="z-hero__hint">⌁ click anywhere to discharge</p>
      </div>

      <div className="z-hero__scroll" aria-hidden>
        <span>SCROLL</span>
        <span className="z-hero__scroll-line" />
      </div>
    </section>
  );
}
