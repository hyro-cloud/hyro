import React, { useCallback, useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { Banner } from './components/banner';
import { StepFeed, stepFromRunStep, type StepLine } from './components/step-feed';
import { executeRun } from '../../commands/run';
import { CLI_VERSION } from '../../version';

export interface ChatAppProps {
  agent?: string;
  model?: string;
  offline?: boolean;
}

interface ChatMessage {
  id: string;
  role: 'you' | 'system';
  text: string;
}

let msgId = 0;
function nextId(): string {
  msgId += 1;
  return `m-${msgId}`;
}

export function ChatApp({ agent, model, offline }: ChatAppProps) {
  const { exit } = useApp();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: nextId(), role: 'system', text: 'HYRO chat — type a message or "exit" to leave.' },
  ]);
  const [steps, setSteps] = useState<StepLine[]>([]);
  const [busy, setBusy] = useState(false);

  useInput((_input: string, key: { escape?: boolean }) => {
    if (key.escape) exit();
  });

  const submit = useCallback(
    async (line: string) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      if (['exit', 'quit', ':q'].includes(trimmed.toLowerCase())) {
        exit();
        return;
      }

      setMessages((m) => [...m, { id: nextId(), role: 'you', text: trimmed }]);
      setInput('');
      setSteps([]);
      setBusy(true);

      try {
        const localSteps: StepLine[] = [];
        const { finalText } = await executeRun({
          task: trimmed,
          agent,
          model,
          offline,
          json: false,
          onStep: (step) => {
            const line = stepFromRunStep(step);
            localSteps.push({ ...line, id: `${line.id}-${localSteps.length}` });
            setSteps([...localSteps]);
          },
        });
        const summary = finalText.split('\n')[0] || 'Done.';
        setMessages((m) => [...m, { id: nextId(), role: 'system', text: summary }]);
      } catch (err) {
        setMessages((m) => [
          ...m,
          { id: nextId(), role: 'system', text: `Error: ${(err as Error).message}` },
        ]);
      } finally {
        setBusy(false);
        setSteps([]);
      }
    },
    [agent, model, offline, exit],
  );

  return (
    <Box flexDirection="column" paddingX={1}>
      <Banner version={CLI_VERSION} />

      <Box flexDirection="column" marginBottom={1}>
        {messages.map((m) => (
          <Text key={m.id} wrap="wrap">
            <Text color={m.role === 'you' ? '#ffb000' : '#6b6456'}>
              {m.role === 'you' ? 'you ❯ ' : 'hyro · '}
            </Text>
            <Text color="#f3ede1">{m.text}</Text>
          </Text>
        ))}
      </Box>

      <StepFeed steps={steps} />

      {busy ? (
        <Text color="#ffb000">
          <Spinner type="dots" /> Running agent…
        </Text>
      ) : (
        <Box>
          <Text color="#ffb000">you ❯ </Text>
          <TextInput value={input} onChange={setInput} onSubmit={submit} />
        </Box>
      )}

      <Text color="#6b6456" dimColor>
        Esc to exit
      </Text>
    </Box>
  );
}
