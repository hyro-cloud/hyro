import React, { useCallback, useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { Banner } from './components/banner';
import { StatusPanel } from './components/status-panel';
import { CLI_VERSION } from '../../version';

const MENU = [
  { key: 'login', label: 'login', hint: 'Authenticate with HYRO Cloud' },
  { key: 'chat', label: 'chat', hint: 'Interactive agent chat' },
  { key: 'run', label: 'run', hint: 'One-shot task (type after selecting)' },
  { key: 'memory', label: 'memory', hint: 'Memory stats & search' },
  { key: 'deploy', label: 'deploy', hint: 'Deploy active agent' },
  { key: 'mcp', label: 'mcp', hint: 'List installed MCP servers' },
  { key: 'help', label: 'help', hint: 'Print CLI help' },
  { key: 'exit', label: 'exit', hint: 'Leave the terminal' },
] as const;

export interface HomeAppProps {
  onCommand: (cmd: string, args: string[]) => Promise<void>;
}

export function HomeApp({ onCommand }: HomeAppProps) {
  const { exit } = useApp();
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState<'menu' | 'input'>('menu');
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const runCommand = useCallback(
    async (cmd: string, args: string[] = []) => {
      if (cmd === 'exit') {
        exit();
        return;
      }
      setBusy(true);
      setMessage(null);
      try {
        await onCommand(cmd, args);
      } catch (err) {
        setMessage((err as Error).message);
      } finally {
        setBusy(false);
        setMode('menu');
        setInput('');
      }
    },
    [exit, onCommand],
  );

  useInput((inputKey: string, key: { upArrow?: boolean; downArrow?: boolean; return?: boolean }) => {
    if (busy) return;
    if (mode === 'input') return;

    if (key.upArrow) setIndex((i) => Math.max(0, i - 1));
    if (key.downArrow) setIndex((i) => Math.min(MENU.length - 1, i + 1));
    if (key.return) {
      const item = MENU[index]!;
      if (item.key === 'run') {
        setMode('input');
        setMessage('Type a task, then Enter:');
      } else {
        void runCommand(item.key);
      }
    }
    if (inputKey === '/') setMode('input');
  });

  return (
    <Box flexDirection="column" paddingX={1}>
      <Banner version={CLI_VERSION} />
      <StatusPanel />

      <Text color="#6b6456" dimColor>
        ↑↓ navigate · Enter select · / type command · q exit
      </Text>

      <Box flexDirection="column" marginY={1}>
        {MENU.map((item, i) => (
          <Text key={item.key}>
            <Text color={i === index ? '#ffb000' : '#6b6456'}>{i === index ? '❯ ' : '  '}</Text>
            <Text color={i === index ? '#ffd166' : '#f3ede1'} bold={i === index}>
              {item.label.padEnd(10)}
            </Text>
            <Text color="#6b6456"> {item.hint}</Text>
          </Text>
        ))}
      </Box>

      {mode === 'input' && (
        <Box>
          <Text color="#ffb000">hyro ❯ </Text>
          <TextInput
            value={input}
            onChange={setInput}
            onSubmit={(value: string) => {
              const trimmed = value.trim();
              if (!trimmed) {
                setMode('menu');
                return;
              }
              const parts = trimmed.split(/\s+/);
              const cmd = parts[0] ?? '';
              const args = parts.slice(1);
              if (cmd === 'run' && args.length) void runCommand('run', args);
              else void runCommand(cmd, args);
            }}
          />
        </Box>
      )}

      {busy && <Text color="#ffb000">Running…</Text>}
      {message && <Text color="#ff6b5e">{message}</Text>}
    </Box>
  );
}
