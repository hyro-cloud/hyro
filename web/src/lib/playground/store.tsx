'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { seedWelcomeMessage } from '@/lib/playground/chat-engine';
import { DEFAULT_MODEL_ID } from '@/lib/playground/models';
import {
  HYRO_GOALS,
  HYRO_MEMORY,
  HYRO_POLICIES,
} from '@/lib/playground/hyro-seed';
import type {
  AuditEntry,
  ChatSession,
  Goal,
  MemoryItem,
  PlaygroundSettings,
  PlaygroundState,
  PlaygroundView,
  Policy,
} from '@/lib/playground/types';

const STORAGE_KEY = 'hyro.playground.v3';

const DEFAULT_POLICIES: Policy[] = HYRO_POLICIES;

const DEFAULT_MEMORY: MemoryItem[] = HYRO_MEMORY;

const DEFAULT_GOALS: Goal[] = HYRO_GOALS;

function uid() {
  return crypto.randomUUID();
}

function audit(action: string, detail: string): AuditEntry {
  return { id: uid(), action, detail, ts: Date.now() };
}

function defaultState(): PlaygroundState {
  const sessionId = uid();
  const session: ChatSession = {
    id: sessionId,
    title: 'New chat',
    modelId: DEFAULT_MODEL_ID,
    messages: [seedWelcomeMessage(DEFAULT_MODEL_ID)],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  return {
    view: 'playground',
    sessions: [session],
    activeSessionId: sessionId,
    memory: DEFAULT_MEMORY,
    goals: DEFAULT_GOALS,
    policies: DEFAULT_POLICIES,
    audit: [audit('boot', 'HYRO playground initialized')],
    settings: {
      defaultModelId: DEFAULT_MODEL_ID,
      gatewayLabel: 'HYRO gateway · MiMo VPS',
      builderCode: 'hyro',
    },
    chatSearch: '',
  };
}

function loadState(): PlaygroundState {
  if (typeof window === 'undefined') return defaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as PlaygroundState;
    return {
      ...defaultState(),
      ...parsed,
      policies: parsed.policies?.length ? parsed.policies : DEFAULT_POLICIES,
      memory: parsed.memory?.length ? parsed.memory : DEFAULT_MEMORY,
      goals: parsed.goals?.length ? parsed.goals : DEFAULT_GOALS,
    };
  } catch {
    return defaultState();
  }
}

function persist(state: PlaygroundState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota */
  }
}

interface PlaygroundContextValue {
  state: PlaygroundState;
  setView: (view: PlaygroundView) => void;
  newChat: () => void;
  selectSession: (id: string) => void;
  deleteSession: (id: string) => void;
  clearActiveChat: () => void;
  setChatSearch: (q: string) => void;
  setSessionModel: (modelId: string) => void;
  appendMessage: (
    sessionId: string,
    role: 'user' | 'assistant',
    content: string,
    model?: string,
    messageId?: string,
  ) => string;
  updateAssistantMessage: (sessionId: string, messageId: string, content: string) => void;
  addMemory: (type: MemoryItem['type'], content: string) => void;
  deleteMemory: (id: string) => void;
  addGoal: (title: string, deadline?: string) => void;
  toggleGoal: (id: string) => void;
  deleteGoal: (id: string) => void;
  togglePolicy: (id: string) => void;
  updateSettings: (patch: Partial<PlaygroundSettings>) => void;
  logAudit: (action: string, detail: string) => void;
  resetAll: () => void;
  activeSession: ChatSession | null;
  filteredSessions: ChatSession[];
}

const PlaygroundContext = createContext<PlaygroundContextValue | null>(null);

export function PlaygroundProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PlaygroundState>(defaultState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(loadState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) persist(state);
  }, [state, hydrated]);

  const patch = useCallback((fn: (s: PlaygroundState) => PlaygroundState) => {
    setState((s) => fn(s));
  }, []);

  const setView = useCallback(
    (view: PlaygroundView) => patch((s) => ({ ...s, view, audit: [...s.audit, audit('navigate', view)] })),
    [patch],
  );

  const newChat = useCallback(() => {
    patch((s) => {
      const id = uid();
      const modelId = s.settings.defaultModelId;
      const session: ChatSession = {
        id,
        title: 'New chat',
        modelId,
        messages: [seedWelcomeMessage(modelId)],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      return {
        ...s,
        view: 'playground',
        sessions: [session, ...s.sessions],
        activeSessionId: id,
        audit: [...s.audit, audit('chat.new', session.id)],
      };
    });
  }, [patch]);

  const selectSession = useCallback(
    (id: string) => patch((s) => ({ ...s, activeSessionId: id, view: 'playground' })),
    [patch],
  );

  const deleteSession = useCallback(
    (id: string) =>
      patch((s) => {
        const sessions = s.sessions.filter((x) => x.id !== id);
        let activeSessionId = s.activeSessionId;
        if (activeSessionId === id) activeSessionId = sessions[0]?.id ?? null;
        if (!sessions.length) {
          const newId = uid();
          const modelId = s.settings.defaultModelId;
          const session: ChatSession = {
            id: newId,
            title: 'New chat',
            modelId,
            messages: [seedWelcomeMessage(modelId)],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          return { ...s, sessions: [session], activeSessionId: newId };
        }
        return { ...s, sessions, activeSessionId, audit: [...s.audit, audit('chat.delete', id)] };
      }),
    [patch],
  );

  const clearActiveChat = useCallback(() => {
    patch((s) => {
      if (!s.activeSessionId) return s;
      const modelId =
        s.sessions.find((x) => x.id === s.activeSessionId)?.modelId ?? s.settings.defaultModelId;
      return {
        ...s,
        sessions: s.sessions.map((sess) =>
          sess.id === s.activeSessionId
            ? { ...sess, messages: [seedWelcomeMessage(modelId)], updatedAt: Date.now() }
            : sess,
        ),
        audit: [...s.audit, audit('chat.clear', s.activeSessionId)],
      };
    });
  }, [patch]);

  const setChatSearch = useCallback((q: string) => patch((s) => ({ ...s, chatSearch: q })), [patch]);

  const setSessionModel = useCallback(
    (modelId: string) =>
      patch((s) => ({
        ...s,
        settings: { ...s.settings, defaultModelId: modelId },
        sessions: s.sessions.map((sess) =>
          sess.id === s.activeSessionId ? { ...sess, modelId } : sess,
        ),
        audit: [...s.audit, audit('model.set', modelId)],
      })),
    [patch],
  );

  const appendMessage = useCallback(
    (sessionId: string, role: 'user' | 'assistant', content: string, model?: string, messageId?: string) => {
      const id = messageId ?? uid();
      patch((s) => ({
        ...s,
        sessions: s.sessions.map((sess) => {
          if (sess.id !== sessionId) return sess;
          const title =
            role === 'user' && sess.title === 'New chat'
              ? content.slice(0, 42) + (content.length > 42 ? '…' : '')
              : sess.title;
          return {
            ...sess,
            title,
            messages: [...sess.messages, { id, role, content, model, ts: Date.now() }],
            updatedAt: Date.now(),
          };
        }),
      }));
      return id;
    },
    [patch],
  );

  const updateAssistantMessage = useCallback(
    (sessionId: string, messageId: string, content: string) => {
      patch((s) => ({
        ...s,
        sessions: s.sessions.map((sess) =>
          sess.id !== sessionId
            ? sess
            : {
                ...sess,
                messages: sess.messages.map((m) => (m.id === messageId ? { ...m, content } : m)),
                updatedAt: Date.now(),
              },
        ),
      }));
    },
    [patch],
  );

  const addMemory = useCallback(
    (type: MemoryItem['type'], content: string) =>
      patch((s) => ({
        ...s,
        memory: [{ id: uid(), type, content, ts: Date.now() }, ...s.memory],
        audit: [...s.audit, audit('memory.add', content.slice(0, 80))],
      })),
    [patch],
  );

  const deleteMemory = useCallback(
    (id: string) =>
      patch((s) => ({
        ...s,
        memory: s.memory.filter((m) => m.id !== id),
        audit: [...s.audit, audit('memory.delete', id)],
      })),
    [patch],
  );

  const addGoal = useCallback(
    (title: string, deadline?: string) =>
      patch((s) => ({
        ...s,
        goals: [{ id: uid(), title, deadline, done: false, ts: Date.now() }, ...s.goals],
        audit: [...s.audit, audit('goal.add', title)],
      })),
    [patch],
  );

  const toggleGoal = useCallback(
    (id: string) =>
      patch((s) => ({
        ...s,
        goals: s.goals.map((g) => (g.id === id ? { ...g, done: !g.done } : g)),
      })),
    [patch],
  );

  const deleteGoal = useCallback(
    (id: string) => patch((s) => ({ ...s, goals: s.goals.filter((g) => g.id !== id) })),
    [patch],
  );

  const togglePolicy = useCallback(
    (id: string) =>
      patch((s) => ({
        ...s,
        policies: s.policies.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p)),
        audit: [...s.audit, audit('policy.toggle', id)],
      })),
    [patch],
  );

  const updateSettings = useCallback(
    (patchSettings: Partial<PlaygroundSettings>) =>
      patch((s) => ({ ...s, settings: { ...s.settings, ...patchSettings } })),
    [patch],
  );

  const logAudit = useCallback(
    (action: string, detail: string) => patch((s) => ({ ...s, audit: [...s.audit, audit(action, detail)] })),
    [patch],
  );

  const resetAll = useCallback(() => {
    const fresh = defaultState();
    setState(fresh);
    persist(fresh);
  }, []);

  const activeSession = useMemo(
    () => state.sessions.find((s) => s.id === state.activeSessionId) ?? null,
    [state.sessions, state.activeSessionId],
  );

  const filteredSessions = useMemo(() => {
    const q = state.chatSearch.trim().toLowerCase();
    if (!q) return state.sessions;
    return state.sessions.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.messages.some((m) => m.content.toLowerCase().includes(q)),
    );
  }, [state.sessions, state.chatSearch]);

  const value: PlaygroundContextValue = {
    state,
    setView,
    newChat,
    selectSession,
    deleteSession,
    clearActiveChat,
    setChatSearch,
    setSessionModel,
    appendMessage,
    updateAssistantMessage,
    addMemory,
    deleteMemory,
    addGoal,
    toggleGoal,
    deleteGoal,
    togglePolicy,
    updateSettings,
    logAudit,
    resetAll,
    activeSession,
    filteredSessions,
  };

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-hyro-bg font-mono text-sm text-hyro-dim">
        Loading HYRO playground…
      </div>
    );
  }

  return <PlaygroundContext.Provider value={value}>{children}</PlaygroundContext.Provider>;
}

export function usePlayground() {
  const ctx = useContext(PlaygroundContext);
  if (!ctx) throw new Error('usePlayground must be used within PlaygroundProvider');
  return ctx;
}
