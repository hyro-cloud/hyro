'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { LIVE_SCRIPT, type CliLine } from '@/lib/content';

export interface DisplayLine {
  id: string;
  kind: 'cmd' | 'out';
  text: string;
  tone?: 'dim' | 'blue' | 'cyan' | 'green' | 'red';
  /** For cmd lines still being typed */
  partial?: boolean;
}

interface SimulationState {
  lines: DisplayLine[];
  typingText: string;
  isTyping: boolean;
}

const TONE_CLASS: Record<NonNullable<DisplayLine['tone']>, string> = {
  dim: 'text-hyro-dim',
  blue: 'text-hyro-blue',
  cyan: 'text-hyro-cyan',
  green: 'text-hyro-green',
  red: 'text-hyro-red',
};

export function toneClass(tone?: DisplayLine['tone']): string {
  if (!tone) return 'text-hyro-mute';
  return TONE_CLASS[tone] ?? 'text-hyro-mute';
}

const CHAR_MS = 42;
const OUT_DELAY_MS = 180;
const BETWEEN_CMD_MS = 900;
const LOOP_PAUSE_MS = 2800;

let lineCounter = 0;
function nextId(): string {
  lineCounter += 1;
  return `line-${lineCounter}`;
}

/**
 * Drives the hero CLI window: types commands char-by-char, reveals output,
 * then loops the script from content.ts.
 */
export function useCliSimulation(enabled = true, script: CliLine[] = LIVE_SCRIPT): SimulationState {
  const [lines, setLines] = useState<DisplayLine[]>([]);
  const [typingText, setTypingText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scriptIdx = useRef(0);
  const charIdx = useRef(0);
  const mounted = useRef(true);

  const reset = useCallback(() => {
    scriptIdx.current = 0;
    charIdx.current = 0;
    setLines([]);
    setTypingText('');
    setIsTyping(false);
  }, []);

  useEffect(() => {
    mounted.current = true;
    if (!enabled) return undefined;

    let timeout: ReturnType<typeof setTimeout>;

    const schedule = (fn: () => void, ms: number) => {
      timeout = setTimeout(() => {
        if (mounted.current) fn();
      }, ms);
    };

    const processScript = () => {
      const entry = script[scriptIdx.current];
      if (!entry) {
        schedule(() => {
          reset();
          processScript();
        }, LOOP_PAUSE_MS);
        return;
      }

      if (entry.kind === 'cmd') {
        setIsTyping(true);
        const typeNext = () => {
          const full = entry.text;
          if (charIdx.current < full.length) {
            const next = full.slice(0, charIdx.current + 1);
            charIdx.current += 1;
            setTypingText(next);
            schedule(typeNext, CHAR_MS);
          } else {
            setIsTyping(false);
            setTypingText('');
            setLines((prev) => [
              ...prev,
              { id: nextId(), kind: 'cmd', text: full },
            ]);
            charIdx.current = 0;
            scriptIdx.current += 1;
            schedule(processScript, BETWEEN_CMD_MS);
          }
        };
        typeNext();
        return;
      }

      // Output line
      setLines((prev) => [
        ...prev,
        {
          id: nextId(),
          kind: 'out',
          text: entry.text,
          tone: entry.tone,
        },
      ]);
      scriptIdx.current += 1;
      schedule(processScript, OUT_DELAY_MS);
    };

    reset();
    schedule(processScript, 600);

    return () => {
      mounted.current = false;
      clearTimeout(timeout);
    };
  }, [enabled, reset, script]);

  return { lines, typingText, isTyping };
}
