# HYRO Cloud — System Architecture

> The Operating System for Autonomous Agents.
> This document is the canonical description of how HYRO is designed and why.

---

## 1. Design principles

1. **Terminal‑first.** The primary interface is a CLI. Everything the web dashboard
   does, the CLI can do. The CLI is the product, not an afterthought.
2. **Agents are durable processes, not chat turns.** An agent has identity, memory,
   tools, a model, and a lifecycle. A *run* is one execution of an agent.
3. **Open tooling via MCP.** Tools are not hard‑coded. Agents acquire capability by
   connecting to Model Context Protocol (MCP) servers discovered at runtime.
4. **Memory is first‑class.** Persistence (facts, goals, preferences, conversation,
   state) is a core subsystem backed by `pgvector`, not a bolt‑on.
5. **Model‑agnostic.** Anthropic, OpenAI, Gemini and OpenRouter are interchangeable
   behind a single provider interface; the user switches with one command.
6. **Local‑first, cloud‑optional.** The CLI runs agents locally (offline runtime +
   deterministic embedder) and seamlessly upgrades to cloud execution once logged in.
7. **Secure by default.** Scoped API keys, JWT sessions, per‑tool MCP permissions,
   sandboxed MCP processes, rate limiting and usage metering.

---

## 2. High‑level topology

```
  ┌──────────────────────────────────────────────────────────────────────────┐
  │                              CLIENTS                                       │
  │   hyro CLI (REPL + commands)        Web dashboard (landing/console)        │
  │   @hyro/sdk (programmatic)          3rd‑party integrations                 │
  └───────────────┬──────────────────────────────────┬────────────────────────┘
                  │ HTTPS  Bearer JWT / hyro_sk_… key │
                  ▼                                  ▼
  ┌──────────────────────────────────────────────────────────────────────────┐
  │                          HYRO CLOUD API (Fastify)                          │
  │                                                                            │
  │  Edge plugins:  CORS · Helmet · rate‑limit · request‑id · auth · zod      │
  │                                                                            │
  │  Route groups:                                                             │
  │   /v1/auth         register · login · refresh · api‑keys                   │
  │   /v1/agents       CRUD · versions · deploy                               │
  │   /v1/runs         create · stream(SSE) · cancel · logs                    │
  │   /v1/memory       upsert · search(vector) · export · import              │
  │   /v1/mcp          registry search · install · list · remove · perms      │
  │   /v1/marketplace  list · get · publish · install                         │
  │   /v1/models       catalog · set‑default                                  │
  │   /v1/usage        events · summary                                       │
  │   /healthz /readyz /docs                                                  │
  │                                                                            │
  │  Service layer:  AuthService · AgentService · RunService · MemoryService  │
  │                  McpService · MarketplaceService · UsageService ·         │
  │                  EmbeddingService · ProviderRouter                        │
  └───────┬──────────────────────────────┬───────────────────────┬───────────┘
          │                              │                       │
   ┌──────▼──────┐                ┌──────▼──────┐         ┌──────▼─────────────┐
   │ PostgreSQL  │                │   Redis     │         │  Model Providers    │
   │ + pgvector  │                │ cache ·     │         │  (HTTPS REST)       │
   │             │                │ rate‑limit ·│         │  anthropic/openai/  │
   │ users·agents│                │ run queue · │         │  gemini/openrouter  │
   │ memory·runs │                │ pub/sub     │         └─────────────────────┘
   │ mcp·market  │                └─────────────┘
   └─────────────┘
                              ┌───────────────────────────┐
                              │      MCP Runtime          │
                              │  spawns/handshakes MCP    │
                              │  servers, lists tools,    │
                              │  enforces permissions     │
                              └───────────────────────────┘
```

---

## 3. Packages (monorepo)

| Package        | Name         | Responsibility |
| -------------- | ------------ | -------------- |
| `packages/core`| `@hyro/core` | Framework‑free shared kernel: domain types, model registry, Zod schemas, id/ULID generation, typed errors, `Result`. Imported by every other package. |
| `packages/sdk` | `@hyro/sdk`  | Thin, typed `fetch` client for the HYRO Cloud API. Used by the CLI and embeddable in 3rd‑party apps. |
| `packages/api` | `@hyro/api`  | Fastify backend. Owns the database, Redis, provider routing, MCP runtime, and all business logic. |
| `packages/cli` | `hyro`       | Terminal experience. REPL, command router, local agent runtime, MCP client, amber theme & ASCII. Talks to the API via `@hyro/sdk`. |
| `web/`         | —            | Zero‑build static landing page / console. |

**Dependency direction** is strictly one‑way:

```
core  ←  sdk  ←  cli
  ↑                
  └────────────  api
```

Nothing depends on `cli` or `api`. `core` depends on nothing.

---

## 4. Runtime model: agents & runs

```
Agent (identity + config)                 Run (one execution)
┌─────────────────────────┐               ┌────────────────────────────┐
│ id, slug, name          │   1     N     │ id, agent_id, status        │
│ system_prompt           │──────────────▶│ input, model, started_at    │
│ model (default)         │               │ steps[]  (the agent loop)   │
│ tools / mcp bindings    │               │ usage (tokens, cost)        │
│ memory_scope            │               │ output, error              │
│ visibility (priv/market)│               └────────────────────────────┘
└─────────────────────────┘
```

### The agent loop (ReAct‑style, provider‑agnostic)

```
observe → recall memory → decide (model call w/ tools) → act (tool/MCP) → reflect → repeat
```

1. **Observe** — assemble context: system prompt, recent conversation, retrieved
   memories (vector search), available tools (from bound MCP servers).
2. **Decide** — call the active model with the tool schema. The model returns either
   a final answer or a tool call.
3. **Act** — execute the tool. Built‑in tools (`memory.write`, `memory.search`,
   `think`) run in‑process; everything else is dispatched to an MCP server.
4. **Reflect** — append the tool result, write durable memories if the step produced
   facts/goals, increment usage.
5. **Repeat** until the model emits a final answer or `maxSteps` is hit.

Runs are persisted step‑by‑step so they are fully replayable and streamable over SSE.
The identical loop runs **locally** (CLI offline runtime) and **in the cloud**
(`RunService`); only the transport differs.

---

## 5. Request lifecycle (cloud run)

```
hyro run "summarize repo X"
  │
  ├─ CLI resolves agent + model + token (config in ~/.hyro)
  ├─ POST /v1/runs            { agentId, input }            (SDK)
  │
  ▼
API  auth → rate‑limit → validate(zod)
  ├─ RunService.create()  → INSERT run(status=queued)
  ├─ enqueue on Redis      (run:queue)
  ├─ worker picks up       → status=running
  │     loop: ProviderRouter.complete() ↔ McpRuntime.callTool()
  │           MemoryService.search()/upsert()  (pgvector)
  │           UsageService.record()            (tokens/cost)
  ├─ stream steps over SSE  → CLI renders live
  └─ status=succeeded|failed, persist output
```

---

## 6. Subsystems

### 6.1 Authentication & authorization
- **Sessions**: email + password (argon2/bcrypt) → short‑lived **JWT** access token +
  rotating refresh token.
- **Machine access**: scoped **API keys** `hyro_sk_<base62>`; only a peppered SHA‑256
  hash is stored. Scopes: `agents:read`, `agents:write`, `runs:execute`,
  `memory:read`, `memory:write`, `mcp:manage`, `marketplace:publish`.
- Every request resolves to a `Principal { userId, scopes, keyId? }`. Route guards
  assert required scopes.

### 6.2 Memory (see [MEMORY.md](MEMORY.md))
- Typed memory items: `fact | goal | preference | conversation | state`.
- Each item stores content + metadata + a `vector(EMBEDDING_DIM)` embedding.
- Retrieval = cosine ANN (`ivfflat`/`hnsw`) filtered by `agent_id` + `type` + scope.
- `EmbeddingService` calls a provider embeddings endpoint, or a **local deterministic
  encoder** (hashed n‑gram projection) when no key is configured — so memory works
  fully offline and tests are reproducible.

### 6.3 MCP Hub (see [MCP.md](MCP.md))
- **Registry**: searchable catalog of MCP servers (name, transport, install spec,
  declared tools, permission requirements).
- **Runtime**: launches a server (stdio child process or HTTP/SSE), performs the MCP
  `initialize` handshake, calls `tools/list`, and proxies `tools/call`.
- **Permissions**: a server's tools are *denied by default*; the user grants per‑tool
  (or per‑server) access. Grants are stored per agent.
- **Sandbox**: stdio servers run with a restricted env and resource limits.

### 6.4 Provider router (see [API.md](API.md))
- One `ModelProvider` interface: `complete()`, `stream()`, `embed()`.
- Adapters for Anthropic, OpenAI, Gemini, OpenRouter call the real REST APIs via
  `fetch` (no heavyweight SDKs). The model **registry** in `@hyro/core` maps a model
  id → provider + capabilities (context window, tools, vision, pricing).
- Switching models is a metadata change; the router selects the adapter.

### 6.5 Marketplace
- Agents with `visibility = public` are publishable. A published agent is an immutable
  version snapshot (prompt, model, tool/MCP requirements, README).
- `hyro marketplace` lists; `hyro install <slug>` clones a snapshot into the user's
  workspace; `hyro publish` creates a new version.

### 6.6 Usage & billing
- Every model/tool call records a `usage_event` (tokens in/out, cost, latency).
- `UsageService` aggregates per user/agent/day. Free‑tier token budget enforced in
  Redis; Stripe hooks are stubbed behind `BILLING_ENABLED`.

---

## 7. Data flow: memory retrieval

```
question ─▶ EmbeddingService.embed(q) ─▶ vector q⃗
                                           │
       SELECT id, content, 1-(embedding<=>q⃗) AS score
       FROM memory_items
       WHERE agent_id = $a AND type = ANY($types)
       ORDER BY embedding <=> q⃗            (ivfflat cosine)
       LIMIT k;
                                           │
                              top‑k memories ─▶ injected into model context
```

---

## 8. Reliability & operations

- **Health**: `/healthz` (liveness), `/readyz` (DB + Redis reachable).
- **Observability**: structured `pino` logs with per‑request `requestId`; usage events
  double as an audit trail; run steps are persisted for replay.
- **Migrations**: plain, ordered SQL files applied by an idempotent migrator with a
  `schema_migrations` ledger.
- **Backpressure**: Redis‑backed run queue decouples request rate from model latency;
  rate‑limiting at the edge protects the API.
- **Graceful shutdown**: drain HTTP, finish in‑flight runs, close pools.

---

## 9. Security model

| Threat | Mitigation |
| ------ | ---------- |
| Credential theft | API keys hashed (SHA‑256 + pepper); JWT short TTL + refresh rotation |
| Prompt‑injected tool abuse | MCP tools deny‑by‑default + explicit per‑tool grants |
| Untrusted MCP code | Sandboxed child processes, restricted env, timeouts |
| Resource exhaustion | Rate limits, per‑run step/token caps, queue concurrency caps |
| Data exfiltration | Memory scoped per agent/user; scopes on every key |
| Secrets in logs | Redaction in the logger serializers |

See [docs/MCP.md](MCP.md) §Permissions and [docs/API.md](API.md) §Auth.

---

## 10. Folder structure

```
hyro-cloud/
├── packages/
│   ├── core/src/{types,models,schemas,ids,errors,result,constants}.ts
│   ├── sdk/src/{client,resources/*}.ts
│   ├── api/
│   │   ├── src/{server,app,config}.ts
│   │   ├── src/db/{pool,migrate,seed}.ts
│   │   ├── src/plugins/{auth,errors,requestContext}.ts
│   │   ├── src/routes/{auth,agents,runs,memory,mcp,marketplace,models,usage,health}.ts
│   │   ├── src/services/*.ts
│   │   ├── src/providers/{anthropic,openai,gemini,openrouter,router}.ts
│   │   ├── src/runtime/{agentLoop,mcpRuntime}.ts
│   │   └── migrations/*.sql
│   └── cli/
│       ├── bin/hyro.js
│       └── src/{index,router,repl,config,theme,logo,ui}.ts
│       └── src/commands/*.ts   src/runtime/*.ts
├── web/{index.html,styles.css,app.js,serve.js}
└── docs/*.md
```

See each subsystem doc for the deep dive.
