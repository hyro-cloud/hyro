import { loadConfig } from '../config';
import { isHermesInstalled } from './hermesBridge';

export type HyroRuntime = 'cloud' | 'hermes';

/** cloud = HYRO API agent loop · hermes = full Hermes Agent subprocess (HYRO-branded via SOUL.md). */
export function resolveRuntime(offline?: boolean): HyroRuntime {
  if (offline) return 'cloud';

  const fromEnv = process.env.HYRO_RUNTIME?.toLowerCase();
  if (fromEnv === 'hermes') return 'hermes';
  if (fromEnv === 'cloud') return 'cloud';

  const cfg = loadConfig().runtime ?? 'auto';
  if (cfg === 'hermes') return 'hermes';
  if (cfg === 'cloud') return 'cloud';

  // auto: Hermes when installed, else HYRO Cloud
  return isHermesInstalled() ? 'hermes' : 'cloud';
}
