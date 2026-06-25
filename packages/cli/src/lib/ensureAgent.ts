import {
  HYRO_AGENT_META,
  HYRO_AGENT_SYSTEM_PROMPT,
  resolveModelId,
  type Agent,
} from '@hyro/core';
import { ApiError, type HyroClient } from '@hyro/sdk';
import { loadConfig, saveConfig } from '../config';

/** Ensure the built-in HYRO agent exists on the cloud API (creates it if missing). */
export async function ensureHyroAgent(client: HyroClient): Promise<Agent> {
  const slug = loadConfig().activeAgent ?? HYRO_AGENT_META.slug;

  try {
    await client.auth.me();
  } catch {
    /* me() also provisions the default agent on current API builds */
  }

  try {
    const { agent } = await client.agents.get(slug);
    const model = resolveModelId(agent.model) ?? agent.model;
    saveConfig({ activeAgent: agent.slug, model });
    return agent;
  } catch (err) {
    if (!(err instanceof ApiError) || err.statusCode !== 404) throw err;
  }

  const model = loadConfig().model || HYRO_AGENT_META.model;

  const { agent } = await client.agents.create({
    name: HYRO_AGENT_META.name,
    slug: HYRO_AGENT_META.slug,
    description: HYRO_AGENT_META.description,
    systemPrompt: HYRO_AGENT_SYSTEM_PROMPT,
    model,
    visibility: 'private',
  });

  saveConfig({ activeAgent: agent.slug, model: agent.model });
  return agent;
}
