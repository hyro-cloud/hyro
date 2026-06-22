import Link from 'next/link';
import { MANTRA, NAV_LINKS, SITE } from '@/lib/content';

export function SiteFooter() {
  return (
    <footer className="border-t border-hyro-line/70">
      <div className="shell px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <p className="font-mono text-lg text-hyro-blue term-glow">HYRO Cloud</p>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-hyro-mute">{SITE.description}</p>
            <p className="mt-4 font-mono text-xs text-hyro-dim">{MANTRA.join(' · ')}</p>
            <a
              href={SITE.url}
              className="mt-3 inline-block font-mono text-xs text-hyro-blue/80 transition hover:text-hyro-blue"
            >
              {SITE.domain}
            </a>
          </div>

          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-hyro-dim">Navigate</p>
            <ul className="mt-4 space-y-2">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-sm text-hyro-mute transition hover:text-hyro-blue"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-hyro-dim">Project</p>
            <ul className="mt-4 space-y-2 text-sm text-hyro-mute">
              <li>
                <a href={SITE.x} className="transition hover:text-hyro-blue" target="_blank" rel="noopener noreferrer">
                  X @HyroCloud
                </a>
              </li>
              <li>
                <a href={SITE.github} className="transition hover:text-hyro-blue" target="_blank" rel="noopener noreferrer">
                  GitHub
                </a>
              </li>
              <li>
                <Link href="/#cli" className="transition hover:text-hyro-blue">
                  Install CLI
                </Link>
              </li>
              <li>
                <Link href="/b20" className="font-bold text-hyro-blue transition hover:text-hyro-blue-hi">
                  B20
                </Link>
              </li>
              <li>
                <Link href="/#faq" className="transition hover:text-hyro-blue">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-hyro-line/70 pt-8 text-xs text-hyro-dim sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} HYRO Cloud · Apache-2.0</p>
          <p className="font-mono">v{SITE.version} · {SITE.domain}</p>
        </div>
      </div>
    </footer>
  );
}
