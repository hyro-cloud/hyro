'use client';

import { cn } from '@/lib/utils';

interface DiagramNodeProps {
  title: string;
  lines: string[];
  className?: string;
  accent?: 'blue' | 'cyan' | 'green';
}

const ACCENT_BORDER = {
  blue: 'border-hyro-blue/40',
  cyan: 'border-hyro-cyan/40',
  green: 'border-hyro-green/40',
} as const;

const ACCENT_TITLE = {
  blue: 'text-hyro-blue',
  cyan: 'text-hyro-cyan',
  green: 'text-hyro-green',
} as const;

function DiagramNode({ title, lines, className, accent = 'blue' }: DiagramNodeProps) {
  return (
    <div
      className={cn(
        'w-full rounded-md border bg-[#0a0e18] px-4 py-3 text-center font-mono',
        ACCENT_BORDER[accent],
        className,
      )}
    >
      <p className={cn('text-xs font-semibold tracking-wide', ACCENT_TITLE[accent])}>{title}</p>
      {lines.map((line) => (
        <p key={line} className="mt-0.5 text-[11px] leading-snug text-hyro-dim">
          {line}
        </p>
      ))}
    </div>
  );
}

function FlowArrow({
  vertical,
  labels,
  bidirectional,
  className,
}: {
  vertical?: boolean;
  labels?: string[];
  bidirectional?: boolean;
  className?: string;
}) {
  if (vertical) {
    return (
      <div className={cn('flex flex-col items-center py-1', className)}>
        {bidirectional && (
          <span className="font-mono text-[9px] text-hyro-faint" aria-hidden>
            ↕
          </span>
        )}
        <svg width="12" height="28" viewBox="0 0 12 28" className="text-hyro-blue/60" aria-hidden>
          <line x1="6" y1="0" x2="6" y2="22" stroke="currentColor" strokeWidth="1.5" />
          <path d="M2 18 L6 26 L10 18" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        {labels && labels.length > 0 && (
          <div className="mt-1 flex flex-col items-center gap-0.5">
            {labels.map((label) => (
              <span key={label} className="font-mono text-[9px] uppercase tracking-wider text-hyro-dim">
                {label}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col items-center justify-center px-1', className)}>
      {bidirectional && (
        <span className="mb-0.5 font-mono text-[9px] text-hyro-faint" aria-hidden>
          ↔
        </span>
      )}
      <svg width="48" height="24" viewBox="0 0 48 24" className="text-hyro-blue/60" aria-hidden>
        {bidirectional ? (
          <>
            <line x1="4" y1="9" x2="44" y2="9" stroke="currentColor" strokeWidth="1.5" markerEnd="url(#arr)" />
            <line x1="44" y1="15" x2="4" y2="15" stroke="currentColor" strokeWidth="1.5" markerEnd="url(#arr)" />
          </>
        ) : (
          <>
            <line x1="2" y1="12" x2="40" y2="12" stroke="currentColor" strokeWidth="1.5" />
            <path d="M36 8 L44 12 L36 16" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </>
        )}
      </svg>
      {labels && labels.length > 0 && (
        <div className="mt-0.5 flex flex-col items-center gap-0.5">
          {labels.map((label) => (
            <span key={label} className="whitespace-nowrap font-mono text-[8px] uppercase tracking-wider text-hyro-dim sm:text-[9px]">
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Stacked layout — mobile & small screens */
function ArchitectureDiagramStacked() {
  return (
    <div className="flex flex-col items-stretch gap-0 md:hidden">
      <DiagramNode title="HYRO CLI" lines={['+ SDK']} />
      <FlowArrow vertical labels={['SSE', 'REST API']} />
      <DiagramNode title="Runtime" lines={['Orchestrator', 'tools/call']} accent="cyan" />
      <FlowArrow vertical labels={['MCP', 'tools/call']} bidirectional />
      <DiagramNode title="MCP Hub" lines={['Registry']} accent="green" />
      <FlowArrow vertical />
      <DiagramNode title="PostgreSQL" lines={['+ pgvector', '+ Redis']} />
      <p className="mt-3 text-center font-mono text-[10px] text-hyro-faint">
        CLI + Runtime → persistent store
      </p>
    </div>
  );
}

/** SVG — tablet & desktop */
function ArchitectureDiagramSvg() {
  const stroke = 'rgba(59,140,255,0.5)';
  const strokeDim = 'rgba(136,153,170,0.4)';
  const boxFill = '#0a0e18';

  return (
    <svg
      viewBox="0 0 820 210"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="hidden w-full md:block"
      aria-label="HYRO architecture diagram"
      role="img"
    >
      <defs>
        <marker id="arch-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <path d="M0 0 L7 3.5 L0 7 Z" fill="rgba(59,140,255,0.6)" />
        </marker>
        <marker id="arch-arrow-dim" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <path d="M0 0 L7 3.5 L0 7 Z" fill="rgba(136,153,170,0.5)" />
        </marker>
      </defs>

      <rect x="24" y="52" width="132" height="72" rx="6" fill={boxFill} stroke="rgba(59,140,255,0.35)" strokeWidth="1" />
      <text x="90" y="84" textAnchor="middle" fill="#3b8cff" fontSize="12" fontFamily="ui-monospace, monospace" fontWeight="600">
        HYRO CLI
      </text>
      <text x="90" y="102" textAnchor="middle" fill="#8899aa" fontSize="11" fontFamily="ui-monospace, monospace">
        + SDK
      </text>

      <rect x="310" y="42" width="148" height="92" rx="6" fill={boxFill} stroke="rgba(34,211,238,0.35)" strokeWidth="1" />
      <text x="384" y="78" textAnchor="middle" fill="#22d3ee" fontSize="12" fontFamily="ui-monospace, monospace" fontWeight="600">
        Runtime
      </text>
      <text x="384" y="96" textAnchor="middle" fill="#8899aa" fontSize="11" fontFamily="ui-monospace, monospace">
        Orchestrator
      </text>
      <text x="384" y="114" textAnchor="middle" fill="#8899aa" fontSize="11" fontFamily="ui-monospace, monospace">
        tools/call
      </text>

      <rect x="612" y="52" width="132" height="72" rx="6" fill={boxFill} stroke="rgba(52,211,153,0.35)" strokeWidth="1" />
      <text x="678" y="84" textAnchor="middle" fill="#34d399" fontSize="12" fontFamily="ui-monospace, monospace" fontWeight="600">
        MCP Hub
      </text>
      <text x="678" y="102" textAnchor="middle" fill="#8899aa" fontSize="11" fontFamily="ui-monospace, monospace">
        Registry
      </text>

      <rect x="310" y="152" width="148" height="52" rx="6" fill={boxFill} stroke="rgba(59,140,255,0.35)" strokeWidth="1" />
      <text x="384" y="176" textAnchor="middle" fill="#3b8cff" fontSize="12" fontFamily="ui-monospace, monospace" fontWeight="600">
        PostgreSQL
      </text>
      <text x="384" y="192" textAnchor="middle" fill="#8899aa" fontSize="10" fontFamily="ui-monospace, monospace">
        + pgvector · + Redis
      </text>

      <line x1="156" y1="76" x2="308" y2="76" stroke={stroke} strokeWidth="1.25" markerEnd="url(#arch-arrow)" />
      <text x="232" y="68" textAnchor="middle" fill="#8899aa" fontSize="9" fontFamily="ui-monospace, monospace">
        SSE
      </text>

      <line x1="156" y1="100" x2="308" y2="100" stroke={stroke} strokeWidth="1.25" markerEnd="url(#arch-arrow)" />
      <text x="232" y="112" textAnchor="middle" fill="#8899aa" fontSize="9" fontFamily="ui-monospace, monospace">
        REST API
      </text>

      <line x1="458" y1="78" x2="610" y2="78" stroke={stroke} strokeWidth="1.25" markerEnd="url(#arch-arrow)" />
      <line x1="610" y1="98" x2="458" y2="98" stroke={stroke} strokeWidth="1.25" markerEnd="url(#arch-arrow)" />
      <text x="534" y="70" textAnchor="middle" fill="#8899aa" fontSize="9" fontFamily="ui-monospace, monospace">
        MCP
      </text>
      <text x="534" y="112" textAnchor="middle" fill="#8899aa" fontSize="9" fontFamily="ui-monospace, monospace">
        tools/call
      </text>

      <line x1="384" y1="134" x2="384" y2="150" stroke={stroke} strokeWidth="1.25" markerEnd="url(#arch-arrow)" />

      <path
        d="M 90 124 C 90 168, 250 168, 310 176"
        stroke={strokeDim}
        strokeWidth="1"
        strokeDasharray="4 3"
        fill="none"
        markerEnd="url(#arch-arrow-dim)"
      />
    </svg>
  );
}

export function ArchitectureDiagram() {
  return (
    <div className="rounded-lg border border-hyro-line/80 bg-[#050408] px-4 py-6 sm:px-6 sm:py-8">
      <ArchitectureDiagramStacked />
      <ArchitectureDiagramSvg />
    </div>
  );
}
