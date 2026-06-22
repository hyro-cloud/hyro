import React from 'react';
import { Box, Text } from 'ink';

export interface StepLine {
  id: string;
  text: string;
  tone?: 'dim' | 'amber' | 'cyan' | 'green' | 'red';
}

const TONE: Record<NonNullable<StepLine['tone']>, string> = {
  dim: '#6b6456',
  amber: '#ffb000',
  cyan: '#57e0d8',
  green: '#57d98a',
  red: '#ff6b5e',
};

export function StepFeed({ steps }: { steps: StepLine[] }) {
  if (!steps.length) return null;
  return (
    <Box flexDirection="column" marginY={1}>
      {steps.map((s) => (
        <Text key={s.id} color={s.tone ? TONE[s.tone] : '#aaa291'}>
          {s.text}
        </Text>
      ))}
    </Box>
  );
}

export function stepFromRunStep(step: { type: string; content: Record<string, unknown> }): StepLine {
  const c = step.content ?? {};
  switch (step.type) {
    case 'observe': {
      const tools = Array.isArray(c.tools) ? (c.tools as string[]).join(', ') : '';
      return { id: `${step.type}-${tools}`, text: `  ○ observe   ${tools ? `tools: ${tools}` : ''}`, tone: 'dim' };
    }
    case 'decide':
      return { id: 'decide', text: `  ◆ decide    ${String(c.text ?? '…')}`, tone: 'amber' };
    case 'tool_call':
      return {
        id: `tool-${c.name}`,
        text: `  → tool      ${String(c.name ?? 'tool')}`,
        tone: 'cyan',
      };
    case 'tool_result':
      return { id: `result-${c.name}`, text: `  ← result    ${String(c.result ?? '').slice(0, 120)}`, tone: 'dim' };
    case 'final':
      return { id: 'final', text: `  ✔ ${String(c.text ?? '').split('\n')[0]}`, tone: 'green' };
    case 'error':
      return { id: 'error', text: `  ✖ ${String(c.message ?? c.error ?? 'error')}`, tone: 'red' };
    default:
      return { id: step.type, text: `  · ${step.type}`, tone: 'dim' };
  }
}
