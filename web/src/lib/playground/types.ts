export type PlaygroundView =
  | 'overview'
  | 'memory'
  | 'goals'
  | 'policies'
  | 'audit'
  | 'agents'
  | 'memory-hub'
  | 'models'
  | 'playground'
  | 'settings'
  | 'token-analyzer'
  | 'wallet-watcher';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model?: string;
  ts: number;
}

export interface ChatSession {
  id: string;
  title: string;
  modelId: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface MemoryItem {
  id: string;
  type: 'fact' | 'goal' | 'preference' | 'conversation' | 'state';
  content: string;
  ts: number;
}

export interface Goal {
  id: string;
  title: string;
  deadline?: string;
  done: boolean;
  ts: number;
}

export interface Policy {
  id: string;
  name: string;
  rule: string;
  enabled: boolean;
}

export interface AuditEntry {
  id: string;
  action: string;
  detail: string;
  ts: number;
}

export interface PlaygroundSettings {
  defaultModelId: string;
  gatewayLabel: string;
  builderCode: string;
}

export interface PlaygroundState {
  view: PlaygroundView;
  sessions: ChatSession[];
  activeSessionId: string | null;
  memory: MemoryItem[];
  goals: Goal[];
  policies: Policy[];
  audit: AuditEntry[];
  settings: PlaygroundSettings;
  chatSearch: string;
}
