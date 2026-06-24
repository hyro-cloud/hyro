import { TICKER } from '@/lib/content';

export function TickerBar() {
  const items = [...TICKER, ...TICKER];

  return (
    <div className="z-marquee" aria-hidden>
      <div className="z-marquee__track">
        {items.map((item, i) => (
          <span key={`${item}-${i}`} className="flex shrink-0 items-center gap-3 pr-8">
            <span className="zaccent" style={{ textShadow: '0 0 12px rgba(59,140,255,0.6)' }}>
              ⚡
            </span>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
