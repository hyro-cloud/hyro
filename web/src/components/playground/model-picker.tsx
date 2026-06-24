'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import {
  DEFAULT_MODEL_ID,
  featuredMimoModels,
  getModel,
  modelsGrouped,
  modelShortLabel,
  PLAYGROUND_MODELS,
  providerLabel,
  tierLabel,
  type PlaygroundModel,
} from '@/lib/playground/models';
import { cn } from '@/lib/utils';

interface ModelPickerProps {
  value: string;
  onChange: (modelId: string) => void;
  className?: string;
  compact?: boolean;
  variant?: 'default' | 'inline';
}

export function ModelPicker({ value, onChange, className, compact, variant = 'default' }: ModelPickerProps) {
  const [open, setOpen] = useState(false);
  const selected = getModel(value) ?? getModel(DEFAULT_MODEL_ID)!;

  const pick = (id: string) => {
    onChange(id);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'inline-flex items-center gap-2 font-mono text-[11px] transition',
          variant === 'inline'
            ? 'rounded-lg border border-hyro-line/25 bg-hyro-panel/40 px-2.5 py-1.5 hover:border-hyro-blue/40'
            : 'w-full rounded-lg border border-hyro-line/25 bg-hyro-panel/40 px-3 py-2.5 hover:border-hyro-blue/40',
          compact && variant === 'inline' && 'min-w-0 max-w-full flex-1',
          className,
        )}
        aria-expanded={open}
      >
        <span className="text-hyro-faint">{variant === 'inline' ? 'Model' : 'Active model'}</span>
        <span className="truncate text-hyro-blue">{selected.label}</span>
        <span className={cn('text-hyro-faint', variant === 'default' && 'ml-auto')}>▾</span>
      </button>

      {open && (
        <ModelSelectPanel value={value} onPick={pick} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

function ModelSelectPanel({
  value,
  onPick,
  onClose,
}: {
  value: string;
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return PLAYGROUND_MODELS.filter(
      (m) =>
        m.label.toLowerCase().includes(q) ||
        m.id.includes(q) ||
        providerLabel(m.providerKey).toLowerCase().includes(q),
    );
  }, [query]);

  const mimoFeatured = featuredMimoModels();

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4">
      <div
        ref={panelRef}
        className="flex max-h-[92dvh] w-full max-w-lg flex-col border border-hyro-line/20 bg-hyro-panel shadow-[0_0_80px_-20px_rgba(59,140,255,0.35)] sm:rounded-[12px]"
        role="dialog"
        aria-label="Select model"
      >
        <header className="flex items-center gap-3 border-b border-hyro-line/20 px-4 py-3">
          <p className="font-mono text-[13px] font-medium text-hyro-ink">Select model</p>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto text-hyro-faint hover:text-hyro-ink"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="border-b border-hyro-line/20 px-4 py-3">
          <div className="flex items-center gap-2 rounded-lg border border-hyro-line/25 bg-hyro-bg/60 px-3 py-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-hyro-faint" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="search models…"
              className="min-w-0 flex-1 bg-transparent font-mono text-[12px] text-hyro-ink outline-none placeholder:text-hyro-faint"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2">
          {filtered ? (
            <ModelList models={filtered} selectedId={value} onPick={onPick} flat />
          ) : (
            <>
              <section className="mb-4 px-2">
                <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-hyro-blue">
                  MiMo — HYRO brain
                </p>
                <ModelList models={mimoFeatured} selectedId={value} onPick={onPick} featured />
              </section>

              {modelsGrouped()
                .filter((g) => g.provider.key !== 'mimo')
                .map((group) => (
                  <section key={group.provider.key} className="mb-3 px-2">
                    <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-hyro-faint">
                      {group.provider.label}
                    </p>
                    <ModelList models={group.models} selectedId={value} onPick={onPick} />
                  </section>
                ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ModelList({
  models,
  selectedId,
  onPick,
  featured,
  flat,
}: {
  models: PlaygroundModel[];
  selectedId: string;
  onPick: (id: string) => void;
  featured?: boolean;
  flat?: boolean;
}) {
  if (!models.length) {
    return <p className="px-2 py-4 font-mono text-[11px] text-hyro-faint">No models match.</p>;
  }

  return (
    <ul className={cn('divide-y divide-hyro-line/15', featured && 'rounded-lg border border-hyro-blue/25')}>
      {models.map((m) => {
        const active = m.id === selectedId;
        const tier = tierLabel(m.tier);
        return (
          <li key={m.id}>
            <button
              type="button"
              onClick={() => onPick(m.id)}
              className={cn(
                'flex w-full items-center gap-3 px-3 py-2.5 text-left font-mono transition',
                active
                  ? 'border-l-[3px] border-l-hyro-blue bg-hyro-blue/[0.07] pl-[calc(0.75rem-3px)]'
                  : 'border-l-[3px] border-l-transparent hover:bg-hyro-panel/40',
                featured && 'py-3',
              )}
            >
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    'block truncate text-hyro-ink',
                    featured ? 'text-[13px] font-medium' : 'text-[12px]',
                    active && 'text-hyro-blue',
                  )}
                >
                  {m.label}
                </span>
                <span className="mt-0.5 flex flex-wrap gap-2 text-[10px] text-hyro-faint">
                  {!flat && !featured && (
                    <span>{providerLabel(m.providerKey)}</span>
                  )}
                  {tier && <span>{tier}</span>}
                  {m.tag && <span className="text-hyro-cyan">{m.tag}</span>}
                </span>
              </span>
              {active && (
                <span className="shrink-0 font-mono text-[10px] text-hyro-green">active</span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** Full-page model browser for models command */
export function ModelCatalog({
  value,
  onChange,
  onDone,
}: {
  value: string;
  onChange: (id: string) => void;
  onDone?: () => void;
}) {
  const [query, setQuery] = useState('');

  const pick = (id: string) => {
    onChange(id);
    onDone?.();
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return PLAYGROUND_MODELS.filter(
      (m) =>
        m.label.toLowerCase().includes(q) ||
        providerLabel(m.providerKey).toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-lg border border-hyro-line/25 bg-hyro-bg/60 px-3 py-2 max-w-md">
        <Search className="h-3.5 w-3.5 text-hyro-faint" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="search all models…"
          className="flex-1 bg-transparent font-mono text-[12px] text-hyro-ink outline-none"
        />
      </div>

      {filtered ? (
        <ModelList models={filtered} selectedId={value} onPick={pick} flat />
      ) : (
        modelsGrouped().map((group) => (
          <section key={group.provider.key}>
            <p
              className={cn(
                'mb-2 font-mono text-[10px] uppercase tracking-[0.14em]',
                group.provider.key === 'mimo' ? 'text-hyro-blue' : 'text-hyro-faint',
              )}
            >
              {group.provider.label}
              {group.provider.blurb && (
                <span className="ml-2 normal-case tracking-normal text-hyro-dim">
                  — {group.provider.blurb}
                </span>
              )}
            </p>
            <ModelList
              models={group.models}
              selectedId={value}
              onPick={pick}
              featured={group.provider.key === 'mimo'}
            />
          </section>
        ))
      )}
    </div>
  );
}

export function ModelPickerSummary({ modelId }: { modelId: string }) {
  const m = getModel(modelId);
  if (!m) return null;
  return (
    <p className="font-mono text-[10px] text-hyro-faint">
      <span className="text-hyro-green">●</span> gateway ready ·{' '}
      <span className="text-hyro-dim">{providerLabel(m.providerKey)}</span>
      <span className="text-hyro-faint"> / </span>
      <span className="text-hyro-ink">{modelShortLabel(modelId)}</span>
    </p>
  );
}
