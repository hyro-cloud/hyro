import type { HyroClient } from '@hyro/sdk';
import type { Agent } from '@hyro/core';
import { loadConfig } from '../config';
import { CliError, EXIT } from './errors';

/** Resolve an agent by slug/id from flag, config, or throw. */
export async function resolveAgent(
  client: HyroClient,
  agentRef?: string | null,
): Promise<Agent> {
  const ref = agentRef || loadConfig().activeAgent;
  if (!ref) {
    throw new CliError(
      'No agent selected.',
      EXIT.usage,
      'Pass --agent <slug> or set activeAgent in ~/.hyro/config.json.',
    );
  }
  const { agent } = await client.agents.get(ref);
  return agent;
}
