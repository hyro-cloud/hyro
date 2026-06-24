'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUp, Paperclip, Trash2 } from 'lucide-react';
import { BaseMcpSkillsPanel } from '@/components/playground/base-mcp-skills-panel';
import { ModelPicker } from '@/components/playground/model-picker';
import { studioCard } from '@/components/playground/studio-primitives';
import { streamChatReply } from '@/lib/playground/chat-engine';
import { modelShortLabel } from '@/lib/playground/models';
import { usePlayground } from '@/lib/playground/store';
import { cn } from '@/lib/utils';

const HINTS = [
  'Use Base MCP skills below — text fills the message box, then you send',
  'Try: "explain HYRO memory architecture"',
];

export function PlaygroundChatView() {
  const {
    activeSession,
    state,
    setSessionModel,
    clearActiveChat,
    appendMessage,
    updateAssistantMessage,
    logAudit,
    addMemory,
  } = usePlayground();

  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const modelId = activeSession?.modelId ?? state.settings.defaultModelId;

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [activeSession?.messages, busy]);

  const sendMessage = useCallback(
    async (rawText: string) => {
      const text = rawText.trim();
      if (!text || !activeSession || busy) return;
      setInput('');
      setBusy(true);
      appendMessage(activeSession.id, 'user', text);
      logAudit('chat.send', text.slice(0, 60));
      addMemory('conversation', `User: ${text.slice(0, 100)}`);

      const assistantId = crypto.randomUUID();
      appendMessage(activeSession.id, 'assistant', '…', modelId, assistantId);
      const sessionId = activeSession.id;

      await streamChatReply(text, modelId, state.memory, (partial) => {
        updateAssistantMessage(sessionId, assistantId, partial);
      }).then((full) => {
        updateAssistantMessage(sessionId, assistantId, full);
        addMemory('conversation', `HYRO: ${full.slice(0, 100)}`);
        logAudit('chat.reply', modelId);
        setBusy(false);
      });
    },
    [
      activeSession,
      busy,
      modelId,
      state.memory,
      appendMessage,
      updateAssistantMessage,
      logAudit,
      addMemory,
    ],
  );

  const insertSkill = useCallback(
    (text: string) => {
      setInput(text);
      logAudit('skill.insert', text.slice(0, 40));
      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.focus();
        el.setSelectionRange(text.length, text.length);
      });
    },
    [logAudit],
  );

  const send = useCallback(() => void sendMessage(input), [input, sendMessage]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  const onAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const note = `[attached ${file.type || 'file'}: ${file.name} · ${Math.round(file.size / 1024)}KB]`;
    setInput((v) => (v ? `${v}\n${note}` : note));
    logAudit('chat.attach', file.name);
    e.target.value = '';
  };

  const messages = activeSession?.messages ?? [];
  const hasUserMsg = messages.some((m) => m.role === 'user');

  return (
    <div className={cn(studioCard, 'flex flex-col overflow-hidden')}>
      {/* Toolbar */}
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-hyro-line/40 px-4 py-3 sm:px-5">
        <div className="min-w-0 flex-1">
          <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-hyro-dim">Active model</p>
          <ModelPicker value={modelId} onChange={setSessionModel} />
        </div>
        <button
          type="button"
          onClick={clearActiveChat}
          className="inline-flex items-center gap-1.5 rounded-lg border border-hyro-line/60 px-3 py-2 font-mono text-[11px] text-hyro-dim transition hover:border-hyro-red/40 hover:text-hyro-red"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Clear
        </button>
      </div>

      {/* Chat block — messages + input (above MCP) */}
      <section className="shrink-0 border-b border-hyro-line/40">
        <div
          ref={scrollRef}
          className="chat-scroll h-[min(38vh,340px)] min-h-[200px] max-h-[400px] px-4 py-4 sm:px-5"
        >
          {!hasUserMsg && messages.length <= 1 && (
            <div className="mx-auto max-w-md rounded-xl border border-dashed border-hyro-line/50 bg-hyro-bg/40 p-5 text-center">
              <p className="text-sm text-hyro-mute">
                Send a message to start. MiMo is your default HYRO brain.
              </p>
              <ul className="mt-4 space-y-2 text-left text-[12px] text-hyro-dim">
                {HINTS.map((h) => (
                  <li key={h} className="flex gap-2">
                    <span className="text-hyro-blue">→</span>
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mx-auto max-w-2xl space-y-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  'whitespace-pre-wrap break-words text-[14px] leading-relaxed',
                  m.role === 'user' &&
                    'ml-auto max-w-[88%] rounded-2xl rounded-br-md bg-hyro-blue px-4 py-3 text-white',
                  m.role === 'assistant' &&
                    'mr-auto max-w-[88%] rounded-2xl rounded-bl-md border border-hyro-line/50 bg-hyro-panel/60 px-4 py-3',
                  m.role === 'system' && 'text-center text-[12px] text-hyro-faint',
                )}
              >
                {m.role === 'assistant' && (
                  <p className="mb-1 font-mono text-[10px] font-medium uppercase tracking-wider text-hyro-blue">
                    {m.model ? modelShortLabel(m.model) : 'HYRO'}
                  </p>
                )}
                <div className={m.role === 'assistant' ? 'text-hyro-mute' : undefined}>{m.content}</div>
              </div>
            ))}
            {busy && (
              <p className="font-mono text-[12px] text-hyro-dim">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-hyro-blue" /> Generating…
              </p>
            )}
          </div>
        </div>

        <div className="bg-hyro-panel/20 px-4 py-3 sm:px-5">
          <div className="flex items-end gap-2 rounded-xl border border-hyro-line/60 bg-hyro-bg/60 p-2">
            <input ref={fileRef} type="file" className="hidden" accept="image/*,.txt,.md,.json" onChange={onAttach} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="mb-1 shrink-0 rounded-lg p-2 text-hyro-faint transition hover:bg-hyro-hover/10 hover:text-hyro-blue"
              aria-label="Attach file"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              placeholder="Message MiMo… (edit skill text, then Enter to send)"
              disabled={busy}
              className="max-h-28 min-h-[44px] flex-1 resize-none border-0 bg-transparent py-2.5 text-[14px] text-hyro-ink outline-none placeholder:text-hyro-faint"
            />
            <button
              type="button"
              onClick={() => void send()}
              disabled={busy || !input.trim()}
              className="mb-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-hyro-blue text-white transition hover:bg-hyro-blue-hi disabled:opacity-40"
              aria-label="Send"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Base MCP — below chat */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
        <BaseMcpSkillsPanel onInsertSkill={insertSkill} disabled={busy} />
      </div>
    </div>
  );
}
