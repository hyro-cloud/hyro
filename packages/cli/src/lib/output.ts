import { theme } from '../theme';

export function print(line = ''): void {
  process.stdout.write(line + '\n');
}

export function printError(message: string): void {
  process.stderr.write(`${theme.red('✖')} ${message}\n`);
}

export function success(message: string): void {
  print(`${theme.green('✔')} ${message}`);
}

export function info(message: string): void {
  print(`${theme.amberDim('›')} ${theme.gray(message)}`);
}

export function divider(label?: string): string {
  const width = Math.max(40, Math.min(process.stdout.columns ?? 80, 100));
  if (!label) return theme.amberDim('─'.repeat(width));
  const text = ` ${label} `;
  const side = Math.max(2, Math.floor((width - text.length) / 2));
  return (
    theme.amberDim('─'.repeat(side)) +
    theme.amber(text) +
    theme.amberDim('─'.repeat(width - side - text.length))
  );
}

export function kv(pairs: [string, string][], keyWidth?: number): string {
  const width = keyWidth ?? Math.max(...pairs.map(([k]) => k.length));
  return pairs.map(([k, v]) => `  ${theme.amberDim(k.padEnd(width))}  ${v}`).join('\n');
}

export function table(headers: string[], rows: string[][]): string {
  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => (r[i] ?? '').replace(/\x1b\[[0-9;]*m/g, '').length)),
  );
  const strip = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, '');
  const pad = (s: string, w: number) => {
    const vis = strip(s).length;
    return vis >= w ? s : s + ' '.repeat(w - vis);
  };
  const head = headers.map((h, i) => theme.bold(theme.amber(pad(h, widths[i]!)))).join('  ');
  const sep = theme.amberDim(widths.map((w) => '─'.repeat(w)).join('  '));
  const body = rows.map((r) => r.map((c, i) => pad(c ?? '', widths[i]!)).join('  ')).join('\n');
  return `${head}\n${sep}\n${body}`;
}

const BOX = { tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│' };

export function box(lines: string[], title?: string): string {
  const contentWidth = Math.max(
    title ? title.length + 2 : 0,
    ...lines.map((l) => l.replace(/\x1b\[[0-9;]*m/g, '').length),
  );
  const inner = Math.min(contentWidth + 2, 78);
  const out: string[] = [];
  const titleStr = title ? ` ${theme.bold(title)} ` : '';
  const topFill = Math.max(0, inner - titleStr.replace(/\x1b\[[0-9;]*m/g, '').length);
  out.push(
    theme.amber(BOX.tl) + titleStr + theme.amber(BOX.h.repeat(topFill)) + theme.amber(BOX.tr),
  );
  for (const line of lines) {
    const vis = line.replace(/\x1b\[[0-9;]*m/g, '');
    const body = ' ' + vis + ' '.repeat(Math.max(0, inner - vis.length - 1));
    out.push(theme.amber(BOX.v) + body + theme.amber(BOX.v));
  }
  out.push(theme.amber(BOX.bl) + theme.amber(BOX.h.repeat(inner)) + theme.amber(BOX.br));
  return out.join('\n');
}
