/**
 * Seed the MCP registry and a set of marketplace example agents.
 * Idempotent: safe to run repeatedly.
 */
import { newId, type MarketplaceCategory } from '@hyro/core';
import { loadConfig } from '../config';
import { createLogger } from '../logger';
import { buildContext, closeContext } from '../context';
import type { Database } from './pool';

interface McpSeed {
  slug: string;
  name: string;
  description: string;
  transport: 'stdio' | 'http' | 'sse';
  install: Record<string, unknown>;
  env: string[];
  tools: { name: string; description: string; inputSchema: Record<string, unknown>; dangerous?: boolean }[];
  permissions: Record<string, unknown>;
  verified: boolean;
}

const MCP_SERVERS: McpSeed[] = [
  {
    slug: 'github',
    name: 'GitHub',
    description: 'Search repositories, read & create issues and pull requests.',
    transport: 'stdio',
    install: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-github'] },
    env: ['GITHUB_TOKEN'],
    permissions: { network: true, filesystem: false },
    verified: true,
    tools: [
      {
        name: 'search_repositories',
        description: 'Search public repositories.',
        inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
      },
      {
        name: 'create_issue',
        description: 'Open an issue in a repository.',
        inputSchema: {
          type: 'object',
          properties: { repo: { type: 'string' }, title: { type: 'string' }, body: { type: 'string' } },
          required: ['repo', 'title'],
        },
        dangerous: true,
      },
    ],
  },
  {
    slug: 'base',
    name: 'Base / B20',
    description:
      'Base chain reads, B20 token balances (ERC-20), and B20 launch guide. x402-ready RPC.',
    transport: 'stdio',
    install: { command: 'node', args: ['packages/mcp-base/dist/index.js'] },
    env: ['BASE_RPC_URL', 'WALLET_PRIVATE_KEY'],
    permissions: { network: true },
    verified: true,
    tools: [
      {
        name: 'get_chain_info',
        description: 'Base chain id, RPC URL, wallet configured.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_balance',
        description: 'Native ETH balance on Base.',
        inputSchema: { type: 'object', properties: { address: { type: 'string' } }, required: ['address'] },
      },
      {
        name: 'get_token_balance',
        description: 'ERC-20 / B20 token balance (tokens at 0xB200…).',
        inputSchema: {
          type: 'object',
          properties: { token: { type: 'string' }, address: { type: 'string' } },
          required: ['token', 'address'],
        },
      },
      {
        name: 'b20_launch_guide',
        description: 'Guide to launch a B20 token via Base B20 Factory precompile.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'send_transaction',
        description: 'Send native ETH (needs WALLET_PRIVATE_KEY).',
        inputSchema: {
          type: 'object',
          properties: { to: { type: 'string' }, value: { type: 'string' } },
          required: ['to', 'value'],
        },
        dangerous: true,
      },
    ],
  },
  {
    slug: 'dexscreener',
    name: 'DexScreener',
    description: 'Token pairs, live prices and liquidity across DEXes.',
    transport: 'http',
    install: { url: 'https://mcp.dexscreener.com/rpc' },
    env: [],
    permissions: { network: true },
    verified: true,
    tools: [
      {
        name: 'search_pairs',
        description: 'Search trading pairs by token symbol or address.',
        inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
      },
      {
        name: 'get_pair',
        description: 'Get details for a specific pair.',
        inputSchema: { type: 'object', properties: { pairId: { type: 'string' } }, required: ['pairId'] },
      },
    ],
  },
  {
    slug: 'filesystem',
    name: 'Filesystem',
    description: 'Scoped read/write access to a local directory.',
    transport: 'stdio',
    install: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-filesystem'] },
    env: ['ALLOWED_DIR'],
    permissions: { filesystem: true, network: false },
    verified: true,
    tools: [
      {
        name: 'read_file',
        description: 'Read a file within the allowed directory.',
        inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] },
      },
      {
        name: 'write_file',
        description: 'Write a file within the allowed directory.',
        inputSchema: {
          type: 'object',
          properties: { path: { type: 'string' }, content: { type: 'string' } },
          required: ['path', 'content'],
        },
        dangerous: true,
      },
    ],
  },
  {
    slug: 'http',
    name: 'HTTP Fetch',
    description: 'Make outbound HTTP requests to fetch web content and APIs.',
    transport: 'stdio',
    install: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-fetch'] },
    env: [],
    permissions: { network: true },
    verified: true,
    tools: [
      {
        name: 'fetch',
        description: 'Fetch a URL and return its content.',
        inputSchema: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] },
      },
    ],
  },
  {
    slug: 'postgres',
    name: 'PostgreSQL',
    description: 'Run read‑only SQL against a connected database.',
    transport: 'stdio',
    install: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-postgres'] },
    env: ['POSTGRES_URL'],
    permissions: { network: true },
    verified: true,
    tools: [
      {
        name: 'query',
        description: 'Execute a read‑only SQL query.',
        inputSchema: { type: 'object', properties: { sql: { type: 'string' } }, required: ['sql'] },
      },
    ],
  },
];

interface AgentSeed {
  name: string;
  systemPrompt: string;
  model: string;
  title: string;
  summary: string;
  category: MarketplaceCategory;
  tags: string[];
}

const DEMO_AGENTS: AgentSeed[] = [
  {
    name: 'Research Agent',
    model: 'claude-sonnet-4-6',
    systemPrompt:
      'You are a meticulous research agent. Break questions into sub-questions, gather evidence with tools, cite sources, and synthesize concise, well-structured briefings. Persist key findings to memory.',
    title: 'Research Agent',
    summary: 'Deep research with source gathering, synthesis and persistent findings.',
    category: 'research',
    tags: ['research', 'analysis', 'web'],
  },
  {
    name: 'Crypto Agent',
    model: 'claude-sonnet-4-6',
    systemPrompt:
      'You are a crypto market analyst. Track tokens, liquidity and on-chain activity using connected MCP tools (DexScreener, Base). Be precise about risk and never give financial advice without clear caveats.',
    title: 'Crypto Agent',
    summary: 'Track tokens, liquidity and on-chain activity across DEXes and chains.',
    category: 'crypto',
    tags: ['crypto', 'defi', 'onchain'],
  },
  {
    name: 'Growth Agent',
    model: 'gemini-2.5-flash',
    systemPrompt:
      'You are a growth marketer. Generate experiments, draft copy, analyze funnels and propose prioritized growth actions backed by reasoning.',
    title: 'Growth Agent',
    summary: 'Run growth experiments, draft copy and prioritize high-leverage actions.',
    category: 'growth',
    tags: ['growth', 'marketing', 'copy'],
  },
  {
    name: 'Trading Agent',
    model: 'claude-opus-4-8',
    systemPrompt:
      'You are a disciplined trading research agent. Analyze setups, manage risk frameworks, and summarize market structure. You never place trades automatically; you produce recommendations with explicit risk notes.',
    title: 'Trading Agent',
    summary: 'Market-structure analysis and risk-framed trade research (no auto-execution).',
    category: 'trading',
    tags: ['trading', 'markets', 'risk'],
  },
  {
    name: 'Builder Agent',
    model: 'claude-opus-4-8',
    systemPrompt:
      'You are a senior software builder. Plan changes, use filesystem and GitHub tools, write clean code, and explain your reasoning. Persist project context to memory between runs.',
    title: 'Builder Agent',
    summary: 'Plan and ship code changes with filesystem + GitHub tools and persistent context.',
    category: 'builder',
    tags: ['coding', 'devtools', 'github'],
  },
];

async function seedMcpServers(db: Database): Promise<number> {
  let inserted = 0;
  for (const s of MCP_SERVERS) {
    const res = await db.queryOne<{ id: string }>(
      `INSERT INTO mcp_servers (id, slug, name, description, transport, install, env, tools, permissions, publisher, verified)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::text[],$8::jsonb,$9::jsonb,'hyro',$10)
       ON CONFLICT (slug) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         transport = EXCLUDED.transport,
         install = EXCLUDED.install,
         env = EXCLUDED.env,
         tools = EXCLUDED.tools,
         permissions = EXCLUDED.permissions,
         verified = EXCLUDED.verified
       RETURNING id`,
      [
        newId('mcpServer'),
        s.slug,
        s.name,
        s.description,
        s.transport,
        JSON.stringify(s.install),
        s.env,
        JSON.stringify(s.tools),
        JSON.stringify(s.permissions),
        s.verified,
      ],
    );
    if (res) inserted++;
  }
  return inserted;
}

async function seed(): Promise<void> {
  const config = loadConfig();
  const log = createLogger(config);
  const ctx = buildContext(config, log);

  const mcpInserted = await seedMcpServers(ctx.db);
  log.info(`seeded ${mcpInserted} MCP server(s)`);

  const demoEmail = 'demo@hyro.cloud';
  let userId: string;
  const existing = await ctx.db.queryOne<{ id: string }>('SELECT id FROM users WHERE email = $1', [
    demoEmail,
  ]);
  if (existing) {
    userId = existing.id;
  } else {
    const { user } = await ctx.services.auth.register({
      email: demoEmail,
      password: 'hyrodemo123',
      displayName: 'HYRO Demo',
    });
    userId = user.id;
    log.info(`created demo user ${demoEmail} (password: hyrodemo123)`);
  }

  const count = await ctx.db.queryOne<{ c: number }>(
    'SELECT COUNT(*)::int AS c FROM agents WHERE user_id = $1',
    [userId],
  );
  if (!count || count.c === 0) {
    for (const def of DEMO_AGENTS) {
      const agent = await ctx.services.agents.create(userId, {
        name: def.name,
        systemPrompt: def.systemPrompt,
        model: def.model,
        visibility: 'public',
      });
      await ctx.services.marketplace.publish(userId, {
        agentId: agent.id,
        title: def.title,
        summary: def.summary,
        category: def.category,
        tags: def.tags,
      });
      log.info(`published "${def.title}" to the marketplace`);
    }
  } else {
    log.info('demo agents already present — skipping');
  }

  await closeContext(ctx);
  log.info('seed complete');
}

if (require.main === module) {
  seed().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
}
