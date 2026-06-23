/**
 * Workspace goals / facts / policies — cloud memory when logged in, local JSON offline.
 */
import type { MemoryItem } from '@hyro/core';
import { activeToken } from '../config';
import { getClient, requireAuth } from '../api/client';
import { resolveAgent } from './agent';
import {
  type Fact,
  type Goal,
  type Policy,
  addFact as localAddFact,
  addGoal as localAddGoal,
  addPolicy as localAddPolicy,
  loadWorkspace,
  setProgress as localSetProgress,
  type Workspace,
} from './workspace';

const DASHBOARD_SOURCE = 'hyro-dashboard';

function metaProgress(item: MemoryItem): number {
  const p = item.metadata.progress;
  return typeof p === 'number' ? Math.max(0, Math.min(100, Math.round(p))) : 0;
}

function metaDeadline(item: MemoryItem): string | undefined {
  const d = item.metadata.deadline;
  return typeof d === 'string' ? d : undefined;
}

function memoryToGoal(item: MemoryItem): Goal {
  return {
    id: item.id,
    cloudId: item.id,
    name: item.content,
    progress: metaProgress(item),
    deadline: metaDeadline(item),
    createdAt: item.createdAt,
  };
}

function memoryToFact(item: MemoryItem): Fact {
  return {
    id: item.id,
    cloudId: item.id,
    text: item.content,
    createdAt: item.createdAt,
  };
}

function memoryToPolicy(item: MemoryItem): Policy {
  return {
    id: item.id,
    cloudId: item.id,
    rule: item.content,
    active: item.metadata.active !== false,
    createdAt: item.createdAt,
  };
}

function isCloud(): boolean {
  return Boolean(activeToken());
}

async function agentId(): Promise<string> {
  const client = requireAuth();
  const agent = await resolveAgent(client);
  return agent.id;
}

export interface MemorySnapshot {
  goals: Goal[];
  facts: Fact[];
  policies: Policy[];
  cloud: boolean;
}

export async function fetchMemorySnapshot(): Promise<MemorySnapshot> {
  const ws = loadWorkspace();
  if (!isCloud()) {
    return { goals: ws.goals, facts: ws.facts, policies: ws.policies, cloud: false };
  }

  try {
    const client = getClient();
    const aid = await agentId();
    const [goalsRes, factsRes, prefRes] = await Promise.all([
      client.memory.list({ agentId: aid, type: 'goal', limit: 100 }),
      client.memory.list({ agentId: aid, type: 'fact', limit: 100 }),
      client.memory.list({ agentId: aid, type: 'preference', limit: 100 }),
    ]);
    const policies = prefRes.items
      .filter((i) => i.metadata.hyroKind === 'policy')
      .map(memoryToPolicy);
    return {
      goals: goalsRes.items.map(memoryToGoal),
      facts: factsRes.items.map(memoryToFact),
      policies,
      cloud: true,
    };
  } catch {
    return { goals: ws.goals, facts: ws.facts, policies: ws.policies, cloud: false };
  }
}

export function memoryCounts(snap: MemorySnapshot): { g: number; f: number; p: number } {
  return {
    g: snap.goals.length,
    f: snap.facts.length,
    p: snap.policies.filter((x) => x.active).length,
  };
}

export async function addGoal(name: string, deadline?: string): Promise<Goal> {
  if (!isCloud()) return localAddGoal(name, deadline);

  const client = requireAuth();
  const aid = await agentId();
  const { item } = await client.memory.add({
    agentId: aid,
    type: 'goal',
    content: name,
    metadata: { progress: 0, deadline, source: DASHBOARD_SOURCE },
    importance: 0.7,
  });
  return memoryToGoal(item);
}

export async function addFact(text: string): Promise<Fact> {
  if (!isCloud()) return localAddFact(text);

  const client = requireAuth();
  const aid = await agentId();
  const { item } = await client.memory.add({
    agentId: aid,
    type: 'fact',
    content: text,
    metadata: { source: DASHBOARD_SOURCE },
    importance: 0.6,
  });
  return memoryToFact(item);
}

export async function addPolicy(rule: string): Promise<Policy> {
  if (!isCloud()) return localAddPolicy(rule);

  const client = requireAuth();
  const aid = await agentId();
  const { item } = await client.memory.add({
    agentId: aid,
    type: 'preference',
    content: rule,
    metadata: { hyroKind: 'policy', active: true, source: DASHBOARD_SOURCE },
    importance: 0.8,
  });
  return memoryToPolicy(item);
}

/** Set goal #n (1-based) progress. Cloud goals are replaced via remove + add. */
export async function setProgress(n: number, percent: number): Promise<Goal | null> {
  const snap = await fetchMemorySnapshot();
  const goal = snap.goals[n - 1];
  if (!goal) return null;

  const pct = Math.max(0, Math.min(100, Math.round(percent)));

  if (snap.cloud && goal.cloudId) {
    const client = requireAuth();
    const aid = await agentId();
    await client.memory.remove(goal.cloudId);
    const { item } = await client.memory.add({
      agentId: aid,
      type: 'goal',
      content: goal.name,
      metadata: { progress: pct, deadline: goal.deadline, source: DASHBOARD_SOURCE },
      importance: 0.7,
    });
    return memoryToGoal(item);
  }

  return localSetProgress(n, pct);
}

/** Re-export local workspace helpers used by dashboard for governance / sources. */
export type { Governance, Workspace } from './workspace';
export {
  DATA_SOURCES,
  connectedSources,
  loadWorkspace,
  setGovernance,
  toggleSource,
} from './workspace';
