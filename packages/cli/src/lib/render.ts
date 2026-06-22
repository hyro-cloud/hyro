import { theme } from '../theme';
import { box, print } from './output';

type StepLike = { type: string; content: Record<string, unknown> };

function preview(value: unknown, max = 220): string {
  const s = typeof value === 'string' ? value : JSON.stringify(value);
  if (!s) return '';
  const flat = s.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

/** Print machine output as JSON, or fall back to a human renderer. */
export function emit(json: boolean, data: unknown, human: () => void): void {
  if (json) print(JSON.stringify(data, null, 2));
  else human();
}

/** Render a single run step as a terminal line. */
export function renderStep(step: StepLike): void {
  const c = step.content ?? {};
  switch (step.type) {
    case 'observe': {
      const tools = Array.isArray(c.tools) ? (c.tools as string[]) : [];
      print(theme.dim(`  ○ observe   ${tools.length ? `tools: ${tools.join(', ')}` : ''}`));
      break;
    }
    case 'decide':
      print(theme.amber(`  ◆ decide    `) + theme.gray(preview(c.text ?? '…')));
      break;
    case 'tool_call':
      print(
        theme.cyan(`  → tool      `) +
          theme.bold(String(c.name ?? 'tool')) +
          theme.dim(`(${preview(c.arguments, 80)})`),
      );
      break;
    case 'tool_result':
      print(theme.dim(`  ← result    ${preview(c.result)}`));
      break;
    case 'final':
      print('');
      print(box(String(c.text ?? '').split('\n'), 'result'));
      break;
    case 'error':
      print(theme.red(`  ✖ error     ${preview(c.message ?? c.error ?? 'unknown error')}`));
      break;
    default:
      print(theme.dim(`  · ${step.type}`));
  }
}
