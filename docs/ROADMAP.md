# HYRO Cloud — Development Roadmap

A phased plan from the current foundation to a publicly launched product. Each phase
is shippable on its own.

---

### Phase 0 — Foundation ✅ (this repository)
- Monorepo (`@hyro/core`, `@hyro/sdk`, `@hyro/api`, `hyro` CLI).
- Domain kernel: types, model registry, schemas, ids, typed errors.
- Fastify API skeleton: auth, agents, runs, memory, mcp, marketplace, models, usage.
- PostgreSQL + pgvector schema & migrator; Redis wiring.
- CLI: amber terminal, ASCII logo, REPL, command router, local runtime, MCP client.
- Premium landing page.
- Docs: architecture, API, DB, CLI, MCP, memory.

### Phase 1 — Core runtime hardening
- [ ] Durable run queue with concurrency control + retries (Redis streams).
- [ ] Full SSE streaming of run steps to CLI & dashboard.
- [ ] Provider router: live Anthropic/OpenAI/Gemini/OpenRouter completions + tools.
- [ ] Embedding service: provider embeddings + local fallback parity tests.
- [ ] Per‑run step/token/cost caps and cancellation.

### Phase 2 — MCP Hub GA
- [ ] Hosted MCP registry service (`registry.hyro.cloud`) with signed manifests.
- [ ] stdio + HTTP/SSE transports; capability negotiation; tool schema caching.
- [ ] Permission UX: interactive grant flow in CLI + dashboard.
- [ ] Sandbox profiles (env allow‑list, fs scoping, network policy, timeouts).
- [ ] First‑party servers: github, base, dexscreener, filesystem, http, postgres.

### Phase 3 — Memory engine
- [ ] Hybrid retrieval (vector + BM25) and recency/decay scoring.
- [ ] Memory namespaces & sharing between agents.
- [ ] Summarization/compaction jobs for long conversations.
- [ ] `hyro memory export/import` round‑trip with portable JSONL format.

### Phase 4 — Deployment & scheduling
- [ ] `hyro deploy` → callable HTTPS endpoints + webhooks per agent.
- [ ] Scheduled / cron agents and event triggers.
- [ ] Versioned rollouts, rollbacks, and per‑deployment secrets.

### Phase 5 — Marketplace
- [ ] Publishing pipeline with review, semver, and changelogs.
- [ ] Ratings, install counts, verified publishers.
- [ ] Revenue share for paid agents (Stripe Connect).

### Phase 6 — Collaboration & teams
- [ ] Organizations, roles, shared agents and memory namespaces.
- [ ] Audit log, SSO (SAML/OIDC), SCIM.

### Phase 7 — Enterprise & scale
- [ ] Multi‑region, read replicas, partitioned `usage_events`.
- [ ] BYO‑cloud / VPC deployment, on‑prem MCP gateways.
- [ ] SOC 2 controls, data residency, DLP on memory.

---

## Non‑goals (for now)
- Building yet another chat UI — HYRO is terminal‑first.
- A proprietary tool protocol — we standardize on MCP.
- Training models — HYRO orchestrates models, it does not train them.
