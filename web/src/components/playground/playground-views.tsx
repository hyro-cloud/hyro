'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Plus, Trash2 } from 'lucide-react';
import { SITE } from '@/lib/content';
import { ModelCatalog } from '@/components/playground/model-picker';
import { HYRO_AGENTS } from '@/lib/playground/hyro-seed';
import { runPlaygroundSkill } from '@/lib/playground/hyro-api-client';
import { studioCard, studioInput, StudioField, StudioPanel } from '@/components/playground/studio-primitives';
import { PLAYGROUND_MODELS } from '@/lib/playground/models';
import { usePlayground } from '@/lib/playground/store';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function PlaygroundOverview() {
  const { state } = usePlayground();
  const stats = [
    { label: 'Chats', value: state.sessions.length },
    { label: 'Memory', value: state.memory.length },
    { label: 'Goals open', value: state.goals.filter((g) => !g.done).length },
    { label: 'Policies on', value: state.policies.filter((p) => p.enabled).length },
    { label: 'Audit events', value: state.audit.length },
    { label: 'MCP sources', value: '6/8' },
  ];
  return (
    <Panel>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-[10px] border border-hyro-line/20 bg-hyro-panel/40 p-4">
            <p className="font-mono text-[10px] uppercase tracking-wider text-hyro-dim">{s.label}</p>
            <p className="mt-1 font-mono text-2xl font-semibold text-hyro-blue">{s.value}</p>
          </div>
        ))}
      </div>
      <p className="mt-6 font-mono text-[12px] leading-relaxed text-hyro-mute">
        API brain: <span className="text-hyro-blue">{SITE.apiUrl}</span> · Base Sepolia · x402 · B20 · Bankr-ready
      </p>
    </Panel>
  );
}

export function PlaygroundMemoryView() {
  const { state, addMemory, deleteMemory } = usePlayground();
  const [type, setType] = useState<typeof state.memory[0]['type']>('fact');
  const [content, setContent] = useState('');

  const submit = () => {
    if (!content.trim()) return;
    addMemory(type, content.trim());
    setContent('');
  };

  return (
    <Panel>
      <div className="mb-4 grid gap-3 sm:grid-cols-[140px_1fr_auto]">
        <StudioField label="Type">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as typeof type)}
            className={studioInput}
          >
            {['fact', 'goal', 'preference', 'conversation', 'state'].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </StudioField>
        <StudioField label="Content">
          <input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Add memory…"
            className={studioInput}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </StudioField>
        <div className="flex items-end">
          <Button size="sm" onClick={submit}>
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        </div>
      </div>
      <ItemList
        empty="No memory items"
        items={state.memory.map((m) => ({
          id: m.id,
          primary: `[${m.type}] ${m.content}`,
          onDelete: () => deleteMemory(m.id),
        }))}
      />
    </Panel>
  );
}

export function PlaygroundGoalsView() {
  const { state, addGoal, toggleGoal, deleteGoal } = usePlayground();
  const [title, setTitle] = useState('');
  const [deadline, setDeadline] = useState('');

  return (
    <Panel>
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto]">
        <StudioField label="Goal title">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Goal title…"
            className={studioInput}
          />
        </StudioField>
        <StudioField label="Deadline">
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className={studioInput}
          />
        </StudioField>
        <div className="flex items-end">
          <Button
            size="sm"
            onClick={() => {
              if (!title.trim()) return;
              addGoal(title.trim(), deadline || undefined);
              setTitle('');
              setDeadline('');
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            Add goal
          </Button>
        </div>
      </div>
      <ul className="space-y-2">
        {state.goals.map((g) => (
          <li
            key={g.id}
            className="flex items-center gap-3 rounded-[10px] border border-hyro-line/20 bg-hyro-panel/40 px-3 py-2.5"
          >
            <button
              type="button"
              onClick={() => toggleGoal(g.id)}
              className={cn(
                'flex h-5 w-5 items-center justify-center rounded border',
                g.done ? 'border-hyro-green bg-hyro-green/20 text-hyro-green' : 'border-hyro-line text-transparent',
              )}
            >
              <Check className="h-3 w-3" />
            </button>
            <span className={cn('flex-1 font-mono text-[12px]', g.done && 'text-hyro-dim line-through')}>
              {g.title}
              {g.deadline && <span className="ml-2 text-hyro-faint">· {g.deadline}</span>}
            </span>
            <button type="button" onClick={() => deleteGoal(g.id)} className="text-hyro-faint hover:text-hyro-red">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export function PlaygroundPoliciesView() {
  const { state, togglePolicy } = usePlayground();
  return (
    <Panel>
      <ul className="space-y-2">
        {state.policies.map((p) => (
          <li
            key={p.id}
            className="flex items-start justify-between gap-4 rounded-[10px] border border-hyro-line/20 bg-hyro-panel/40 px-4 py-3"
          >
            <div>
              <p className="font-mono text-[12px] font-medium text-hyro-ink">{p.name}</p>
              <p className="mt-1 font-mono text-[11px] text-hyro-dim">{p.rule}</p>
            </div>
            <button
              type="button"
              onClick={() => togglePolicy(p.id)}
              className={cn(
                'shrink-0 rounded-full px-3 py-1 font-mono text-[10px] uppercase',
                p.enabled ? 'bg-hyro-green/15 text-hyro-green' : 'bg-hyro-panel/50 text-hyro-dim',
              )}
            >
              {p.enabled ? 'on' : 'off'}
            </button>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export function PlaygroundAuditView() {
  const { state } = usePlayground();
  return (
    <Panel>
      <ul className="max-h-[60vh] space-y-1 overflow-y-auto font-mono text-[11px]">
        {[...state.audit].reverse().map((a) => (
          <li key={a.id} className="flex gap-3 border-b border-hyro-line/15 py-2 text-hyro-dim">
            <span className="shrink-0 text-hyro-faint">{new Date(a.ts).toLocaleTimeString()}</span>
            <span className="text-hyro-blue">{a.action}</span>
            <span className="truncate text-hyro-mute">{a.detail}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export function PlaygroundModelsView() {
  const { state, setSessionModel, setView } = usePlayground();
  return (
    <Panel>
      <ModelCatalog
        value={state.settings.defaultModelId}
        onChange={setSessionModel}
        onDone={() => setView('playground')}
      />
    </Panel>
  );
}

export function PlaygroundAgentsView() {
  const { setView, setSessionModel, logAudit } = usePlayground();
  return (
    <Panel>
      <ul className="space-y-2">
        {HYRO_AGENTS.map((a) => (
          <li
            key={a.slug}
            className="flex flex-col gap-3 rounded-[10px] border border-hyro-line/20 bg-hyro-panel/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-mono text-[13px] font-medium text-hyro-ink">{a.name}</p>
              <p className="mt-0.5 font-mono text-[11px] text-hyro-blue">{a.model}</p>
              <p className="mt-1 text-[12px] text-hyro-mute">{a.description}</p>
              <span className="mt-2 inline-block rounded border border-hyro-line/25 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-hyro-dim">
                {a.mcp.join(' · ')}
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0"
              onClick={() => {
                setSessionModel(a.modelId);
                logAudit('agent.open', a.slug);
                setView('playground');
              }}
            >
              Open chat
            </Button>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export function PlaygroundMemoryHubView() {
  const { state, setView } = usePlayground();
  return (
    <Panel>
      <p className="mb-4 font-mono text-[12px] text-hyro-mute">
        {state.memory.length} items in local store. CLI: <code className="text-hyro-blue">hyro memory</code>
      </p>
      <Button onClick={() => setView('memory')}>Open memory panel</Button>
      <Button variant="outline" className="ml-2" asChild>
        <Link href="/#memory">Landing docs</Link>
      </Button>
    </Panel>
  );
}

export function PlaygroundSettingsView() {
  const { state, updateSettings, resetAll } = usePlayground();
  return (
    <Panel>
      <div className="space-y-4 max-w-md">
        <label className="block font-mono text-[11px] text-hyro-dim">
          Gateway label
          <input
            value={state.settings.gatewayLabel}
            onChange={(e) => updateSettings({ gatewayLabel: e.target.value })}
            className="mt-1 w-full rounded-lg border border-hyro-line/25 bg-hyro-bg/60 px-3 py-2 text-[12px] text-hyro-ink"
          />
        </label>
        <label className="block font-mono text-[11px] text-hyro-dim">
          Builder code (ERC-8021)
          <input
            value={state.settings.builderCode}
            onChange={(e) => updateSettings({ builderCode: e.target.value })}
            className="mt-1 w-full rounded-lg border border-hyro-line/25 bg-hyro-bg/60 px-3 py-2 text-[12px] text-hyro-ink"
          />
        </label>
        <Button variant="outline" onClick={() => { if (confirm('Reset all playground data?')) resetAll(); }}>
          Reset playground data
        </Button>
      </div>
    </Panel>
  );
}

export function PlaygroundTokenAnalyzer() {
  const { logAudit } = usePlayground();
  const [query, setQuery] = useState('BRETT base');
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const analyze = async () => {
    if (!query.trim()) return;
    logAudit('crypto.analyze', query);
    setLoading(true);
    try {
      const data = await runPlaygroundSkill('dexscreener', 'search_pairs', { query: query.trim() });
      setResult(data);
    } catch (err) {
      setResult((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Panel>
      <div className="mb-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setQuery('BRETT base')}
          className="rounded-lg border border-hyro-line/25 px-3 py-1.5 font-mono text-[11px] text-hyro-dim hover:border-hyro-blue/40 hover:text-hyro-blue"
        >
          BRETT
        </button>
        <button
          type="button"
          onClick={() => setQuery('DEGEN base')}
          className="rounded-lg border border-hyro-line/25 px-3 py-1.5 font-mono text-[11px] text-hyro-dim hover:border-hyro-blue/40 hover:text-hyro-blue"
        >
          DEGEN
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ticker, name, or 0x… contract"
          className={studioInput + ' min-w-[240px] flex-1'}
          onKeyDown={(e) => e.key === 'Enter' && void analyze()}
        />
        <Button onClick={() => void analyze()} disabled={loading}>
          {loading ? 'Searching…' : 'Analyze'}
        </Button>
      </div>
      {result && (
        <pre className="mt-4 whitespace-pre-wrap rounded-[10px] border border-hyro-line/20 bg-hyro-panel/40 p-4 font-mono text-[12px] leading-relaxed text-hyro-mute">
          {result}
        </pre>
      )}
    </Panel>
  );
}

export function PlaygroundWalletWatcher() {
  const { logAudit } = usePlayground();
  const [wallet, setWallet] = useState('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045');
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const watch = async () => {
    if (!wallet.trim()) return;
    logAudit('crypto.watch', wallet);
    setLoading(true);
    try {
      const balance = await runPlaygroundSkill('base', 'get_balance', { address: wallet.trim() });
      const chain = await runPlaygroundSkill('base', 'get_chain_info', {});
      setResult(`Wallet: ${wallet}\n\n${balance}\n\n${chain}`);
    } catch (err) {
      setResult((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Panel>
      <div className="flex flex-wrap gap-2">
        <input
          value={wallet}
          onChange={(e) => setWallet(e.target.value)}
          placeholder="0x wallet address"
          className={studioInput + ' min-w-[240px] flex-1'}
          onKeyDown={(e) => e.key === 'Enter' && void watch()}
        />
        <Button onClick={() => void watch()} disabled={loading}>
          {loading ? 'Reading…' : 'Watch'}
        </Button>
      </div>
      {result && (
        <pre className="mt-4 whitespace-pre-wrap rounded-lg border border-hyro-green/30 bg-hyro-green/[0.06] p-4 font-mono text-[12px] leading-relaxed text-hyro-mute">
          {result}
        </pre>
      )}
    </Panel>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <StudioPanel>{children}</StudioPanel>;
}

function ItemList({
  items,
  empty,
}: {
  empty: string;
  items: { id: string; primary: string; onDelete: () => void }[];
}) {
  if (!items.length) return <p className="font-mono text-[12px] text-hyro-faint">{empty}</p>;
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex items-center justify-between gap-2 rounded-[10px] border border-hyro-line/20 bg-hyro-panel/40 px-3 py-2"
        >
          <span className="font-mono text-[11px] text-hyro-mute">{item.primary}</span>
            <button type="button" onClick={item.onDelete} className="text-hyro-faint hover:text-red-400">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </li>
      ))}
    </ul>
  );
}
