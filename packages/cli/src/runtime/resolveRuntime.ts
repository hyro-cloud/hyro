import { loadConfig } from '../config';

export type HyroRuntime = 'cloud' | 'hermes';

/** End users always use cloud (HYRO API on VPS). Hermes subprocess is dev-only. */
export function resolveRuntime(offline?: boolean): HyroRuntime {
  if (offline) return 'cloud';

  const fromEnv = process.env.HYRO_RUNTIME?.toLowerCase();
  if (fromEnv === 'hermes') return 'hermes';

  const cfg = loadConfig().runtime;
  if (cfg === 'hermes') return 'hermes';

  return 'cloud';
}
