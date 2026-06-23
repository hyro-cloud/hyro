import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { CliError, EXIT } from '../lib/errors';

const HERMES_HOME = process.env.HERMES_HOME || join(homedir(), '.hermes');

const WINDOWS_CANDIDATES = [
  join(process.env.LOCALAPPDATA ?? '', 'hermes', 'bin', 'hermes.exe'),
  join(process.env.LOCALAPPDATA ?? '', 'hermes', 'bin', 'hermes'),
];

/** Minimal SOUL — Hermes loads this instead of default Hermes identity. */
const HYRO_SOUL = `# HYRO (Hermes Agent runtime, HYRO Cloud branding)

You are **HYRO** — the autonomous agent for HYRO Cloud (https://hyrocloud.lol).

- **Public name:** HYRO — never introduce yourself as Hermes to the user.
- **CLI:** users type \`hyro\`, not \`hermes\`
- **Repo:** https://github.com/hyro-cloud/hyro

Use Hermes tools, skills, and memory at full capability. Present every reply as HYRO.
Be helpful, direct, tool-driven, and concise. Persist durable user preferences to memory.
`;

function commandExists(cmd: string): boolean {
  const r = spawnSync(process.platform === 'win32' ? 'where' : 'which', [cmd], {
    stdio: 'ignore',
  });
  return r.status === 0;
}

/** Resolve the Hermes CLI binary (official install or PATH). */
export function findHermesBin(): string | null {
  for (const p of WINDOWS_CANDIDATES) {
    if (p && existsSync(p)) return p;
  }
  if (commandExists('hermes')) return 'hermes';
  if (commandExists('hermes-agent')) return 'hermes-agent';
  return null;
}

export function isHermesInstalled(): boolean {
  return findHermesBin() !== null;
}

/** Write ~/.hermes/SOUL.md so Hermes presents as HYRO. */
export function ensureHyroSoul(): void {
  mkdirSync(HERMES_HOME, { recursive: true });
  const soulPath = join(HERMES_HOME, 'SOUL.md');
  const marker = '<!-- hyro-soul -->';
  if (existsSync(soulPath)) {
    const current = readFileSync(soulPath, 'utf8');
    if (current.includes(marker) || current.includes('You are **HYRO**')) return;
  }
  writeFileSync(soulPath, `${marker}\n${HYRO_SOUL}\n`, 'utf8');
}

function hermesProviderArgs(): string[] {
  const provider = process.env.HYRO_HERMES_PROVIDER || 'xiaomi';
  return ['--provider', provider];
}

function spawnHermes(args: string[]): Promise<void> {
  const bin = findHermesBin();
  if (!bin) {
    throw new CliError(
      'Hermes Agent is not installed.',
      EXIT.usage,
      'Install: iex (irm https://hermes-agent.nousresearch.com/install.ps1) then set runtime to hermes in ~/.hyro/config.json',
    );
  }

  ensureHyroSoul();

  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, {
      stdio: 'inherit',
      shell: process.platform === 'win32' && !bin.includes('\\'),
      env: { ...process.env, HERMES_HOME },
    });
    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (signal) reject(new Error(`HYRO (Hermes) stopped (${signal})`));
      else if (code === 0) resolve();
      else reject(new CliError(`HYRO (Hermes) exited with code ${code}`, code ?? 1));
    });
  });
}

/** Interactive Hermes session — user typed bare `hyro`. */
export async function launchHermesInteractive(): Promise<void> {
  await spawnHermes([]);
}

/** One-shot task via Hermes (`hermes chat -q`). */
export async function runHermesTask(task: string, model?: string): Promise<void> {
  const args = ['chat', '-q', task, ...hermesProviderArgs()];
  if (model) args.push('--model', model);
  await spawnHermes(args);
}
