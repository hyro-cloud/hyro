'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { XIcon } from '@/components/ui/x-icon';
import { NAV_LINKS, SITE, type NavLink } from '@/lib/content';
import { cn } from '@/lib/utils';

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 border-b transition-colors duration-300',
        scrolled
          ? 'border-hyro-line/70 bg-hyro-bg/90 backdrop-blur-xl'
          : 'border-transparent bg-transparent',
      )}
    >
      <div className="shell flex h-16 items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-2.5 font-mono text-sm">
          <span className="text-hyro-blue term-glow transition group-hover:text-hyro-blue-hi">
            HYRO
          </span>
          <span className="hidden text-hyro-faint sm:inline">/</span>
          <span className="hidden text-hyro-dim sm:inline">hyrocloud.lol</span>
        </Link>

        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <NavItem key={link.href} link={link} />
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
            <a href={SITE.x} target="_blank" rel="noopener noreferrer" aria-label="X @HyroCloud">
              <XIcon className="h-3.5 w-3.5" />
            </a>
          </Button>
          <Button variant="ghost" size="sm" className="hidden lg:inline-flex" asChild>
            <a href={SITE.github} target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
          </Button>
          <Button size="sm" asChild>
            <Link href="/app">Launch App</Link>
          </Button>
        </div>

        <button
          type="button"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-hyro-line/80 text-hyro-mute md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-hyro-line/70 bg-hyro-bg/95 backdrop-blur-xl md:hidden">
          <nav className="shell flex flex-col gap-0.5 px-4 py-4" aria-label="Mobile">
            {NAV_LINKS.map((link) => (
              <NavItem key={link.href} link={link} mobile onNavigate={() => setOpen(false)} />
            ))}
            <div className="mt-3 flex flex-col gap-2 border-t border-hyro-line/70 pt-4">
              <Button variant="outline" asChild>
                <a href={SITE.x} target="_blank" rel="noopener noreferrer">
                  <XIcon className="h-4 w-4" />
                  @HyroCloud
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href={SITE.github} target="_blank" rel="noopener noreferrer">
                  GitHub
                </a>
              </Button>
              <Button asChild>
                <Link href="/app" onClick={() => setOpen(false)}>
                  Launch App
                </Link>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

function NavItem({
  link,
  mobile,
  onNavigate,
}: {
  link: NavLink;
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  const base = mobile
    ? 'rounded-md px-3 py-2.5 font-mono text-xs uppercase tracking-[0.12em]'
    : 'rounded-md px-2.5 py-2 font-mono text-[10px] uppercase tracking-[0.14em]';

  if (link.highlight) {
    return (
      <a
        href={link.href}
        onClick={onNavigate}
        className={cn(
          base,
          'font-bold text-hyro-blue term-glow transition hover:text-hyro-blue-hi',
        )}
      >
        {link.label}
      </a>
    );
  }

  return (
    <a
      href={link.href}
      onClick={onNavigate}
      className={cn(base, 'text-hyro-mute transition hover:text-hyro-blue')}
    >
      {link.label}
    </a>
  );
}
