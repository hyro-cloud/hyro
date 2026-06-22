import { TICKER } from '@/lib/content';

export function TickerBar() {
  const items = [...TICKER, ...TICKER];

  return (
    <div className="border-y border-hyro-line bg-hyro-panel/40" aria-hidden>
      <div className="overflow-hidden py-3">
        <div className="flex w-max animate-marquee gap-8">
          {items.map((item, i) => (
            <span
              key={`${item}-${i}`}
              className="flex shrink-0 items-center gap-3 font-mono text-[11px] uppercase tracking-[0.18em] text-hyro-dim"
            >
              <span className="text-hyro-blue">◆</span>
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
