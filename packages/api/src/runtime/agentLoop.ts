/**
 * The HYRO agent loop — provider‑agnostic ReAct execution.
 *   observe → recall memory → decide → act (tools/MCP) → reflect → repeat
 *
 * Runs identically for cloud runs and (mirrored) for the CLI's offline runtime.
 */
import {
  estimateCost,
  getModel,
  type Agent,
  type ChatMessage,
  type JsonObject,
  type RunStepType,
  type ToolCall,
  type ToolDefinition,
} from '@hyro/core';
import type { AppContext } from '../context';
import { BUILTIN_TOOLS, builtinToolDefinitions } from './builtinTools';

export interface StepEmit {
  type: RunStepType;
  content: JsonObject;
  tokens: number;
}

export interface AgentLoopParams {
  ctx: AppContext;
  userId: string;
  agent: Agent;
  model: string;
  task: string;
  messages: ChatMessage[];
  maxSteps: number;
  onStep: (step: StepEmit) => Promise<void>;
  isCancelled?: () => boolean;
}

export interface AgentLoopResult {
  finalText: string;
  output: JsonObject;
  usage: { tokensIn: number; tokensOut: number; costUsd: number; steps: number };
}

function truncate(text: string, max = 4000): string {
  return text.length > max ? `${text.slice(0, max)}… [truncated]` : text;
}

export async function runAgentLoop(params: AgentLoopParams): Promise<AgentLoopResult> {
  const { ctx, userId, agent, task, onStep } = params;
  const modelInfo = getModel(params.model);
  const messages: ChatMessage[] = [...params.messages];

  // Assemble tool definitions: built‑ins + granted MCP tools.
  const toolDefs: ToolDefinition[] = builtinToolDefinitions(agent.config.tools);
  const mcpTools = await ctx.services.mcp.getGrantedToolsForAgent(userId, agent.id);
  const mcpRoute = new Map<string, (typeof mcpTools)[number]>();
  for (const t of mcpTools) {
    toolDefs.push({ name: t.exposedName, description: t.tool.description ?? t.tool.name, inputSchema: t.tool.inputSchema });
    mcpRoute.set(t.exposedName, t);
  }

  // Retrieve relevant memories and inject as a system block.
  let retrieved = 0;
  if (agent.config.memoryTopK > 0 && task) {
    try {
      const { results } = await ctx.services.memory.search(userId, {
        agentId: agent.id,
        query: task,
        limit: agent.config.memoryTopK,
      });
      retrieved = results.length;
      if (results.length) {
        const block = ['# Memory (most relevant first)', ...results.map((r) => `- [${r.type}] ${r.content}`)].join('\n');
        // Insert right after the agent's own system prompt.
        const firstNonSystem = messages.findIndex((m) => m.role !== 'system');
        const idx = firstNonSystem === -1 ? messages.length : firstNonSystem;
        messages.splice(idx, 0, { role: 'system', content: block });
      }
    } catch {
      /* memory is best‑effort */
    }
  }

  const executeTool = async (call: ToolCall): Promise<string> => {
    const builtin = BUILTIN_TOOLS[call.name];
    if (builtin) {
      try {
        return await builtin.execute(call.arguments, { ctx, userId, agentId: agent.id });
      } catch (err) {
        return `Built‑in tool '${call.name}' failed: ${(err as Error).message}`;
      }
    }
    const route = mcpRoute.get(call.name);
    if (route) {
      try {
        return await ctx.services.mcp.callToolForUser(userId, route.server, route.tool.name, call.arguments);
      } catch (err) {
        return `MCP tool '${call.name}' failed: ${(err as Error).message}`;
      }
    }
    return `Unknown tool: ${call.name}`;
  };

  let tokensIn = 0;
  let tokensOut = 0;
  let steps = 0;
  let finalText = '';
  let finalEmitted = false;
  const maxSteps = Math.max(1, params.maxSteps);

  for (let idx = 0; idx < maxSteps; idx++) {
    if (params.isCancelled?.()) {
      finalText = 'Run cancelled.';
      await onStep({ type: 'error', content: { message: finalText } as JsonObject, tokens: 0 });
      finalEmitted = true;
      break;
    }

    await onStep({
      type: 'observe',
      content: { step: idx, tools: toolDefs.map((t) => t.name), retrievedMemories: retrieved } as JsonObject,
      tokens: 0,
    });

    let completion;
    try {
      completion = await ctx.providers.complete({
        model: params.model,
        messages,
        tools: toolDefs.length ? toolDefs : undefined,
        temperature: agent.config.temperature,
        maxTokens: modelInfo ? Math.min(modelInfo.maxOutput || 4096, 4096) : 4096,
      });
    } catch (err) {
      finalText = `Model error: ${(err as Error).message}`;
      await onStep({ type: 'error', content: { message: finalText } as JsonObject, tokens: 0 });
      finalEmitted = true;
      break;
    }

    tokensIn += completion.usage.tokensIn;
    tokensOut += completion.usage.tokensOut;
    steps++;

    const hasTools = completion.toolCalls.length > 0;
    if (hasTools && idx < maxSteps - 1) {
      await onStep({
        type: 'decide',
        content: { text: completion.text, toolCalls: completion.toolCalls } as unknown as JsonObject,
        tokens: completion.usage.tokensOut,
      });
      if (completion.text) messages.push({ role: 'assistant', content: completion.text });

      for (const call of completion.toolCalls) {
        await onStep({
          type: 'tool_call',
          content: { name: call.name, arguments: call.arguments } as unknown as JsonObject,
          tokens: 0,
        });
        const result = await executeTool(call);
        await onStep({
          type: 'tool_result',
          content: { name: call.name, result: truncate(result) } as JsonObject,
          tokens: 0,
        });
        messages.push({ role: 'tool', toolName: call.name, toolCallId: call.id, content: result });
      }
      finalText = completion.text || finalText;
      continue;
    }

    finalText = completion.text || 'Reached a conclusion with no textual output.';
    await onStep({ type: 'final', content: { text: finalText } as JsonObject, tokens: completion.usage.tokensOut });
    finalEmitted = true;
    break;
  }

  if (!finalEmitted) {
    finalText = finalText || 'Reached maximum steps without a final answer.';
    await onStep({ type: 'final', content: { text: finalText } as JsonObject, tokens: 0 });
  }

  // Reflect: persist a conversation memory of the outcome (best‑effort).
  if (task && agent.config.memoryTopK > 0) {
    try {
      await ctx.services.memory.upsert(userId, {
        agentId: agent.id,
        type: 'conversation',
        content: `Task: ${truncate(task, 400)}\nResult: ${truncate(finalText, 600)}`,
        importance: 0.4,
      });
    } catch {
      /* best‑effort */
    }
  }

  const costUsd = modelInfo ? estimateCost(modelInfo, tokensIn, tokensOut) : 0;
  return { finalText, output: { text: finalText } as JsonObject, usage: { tokensIn, tokensOut, costUsd, steps } };
}
