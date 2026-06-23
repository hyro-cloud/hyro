# Hermes Agent — reference for HYRO (not a user install)

[Hermes Agent](https://github.com/NousResearch/hermes-agent) by Nous Research is an **upstream reference** for HYRO Cloud. End users **only install `hyro`** — they never install Hermes.

## Product model

```text
User's PC                    Your VPS
─────────                    ────────
npm install -g hyro    →     HYRO API + MiMo + agent "hyro"
hyro login (once)      →     Brain, memory, tools live on server
hyro                   →     Full HYRO features
```

| Layer | Who owns it | What users see |
| --- | --- | --- |
| **HYRO CLI** | User installs `hyro` only | Command: `hyro` |
| **HYRO agent** | Your VPS (`api.hyrocloud.lol`) | Agent name: **HYRO** |
| **Hermes repo** | You (developer reference) | Not exposed to users |

## What we take from Hermes (reference only)

HYRO adopts **patterns** from Hermes — not a bundled Hermes install for users:

| Hermes concept | HYRO equivalent |
| --- | --- |
| Self-improving skills | `hyro mcp install` + MCP tool grants |
| Persistent memory | `memory_search` / `memory_write` + Postgres/pgvector |
| Tool discipline | HYRO agent loop + MCP deny-by-default |
| Observe → decide → execute | `packages/api/src/runtime/agentLoop.ts` |
| System prompt / SOUL | `packages/core/src/prompts/hyro.ts` (updated from Hermes docs) |
| MiMo provider | `MIMO_API_KEY` on VPS |

Source prompt inspiration: [Hermes `prompt_builder.py`](https://github.com/NousResearch/hermes-agent/blob/main/agent/prompt_builder.py), [skills docs](https://hermes-agent.nousresearch.com/docs/user-guide/features/skills).

## What users do (simple)

```bash
# one-time
hyro login --register

# every day
hyro
hyro run "your task"
hyro mcp install <server>
```

No `hermes` command. No Hermes installer.

## Developer workflow (you)

When improving HYRO intelligence:

1. Read Hermes docs / skills for ideas.
2. Port behavior into HYRO: prompt (`hyro.ts`), agent loop, MCP servers, seed skills.
3. Deploy API on VPS: `git pull` + `docker compose ... up -d --build api`.
4. Users `git pull` CLI only when you ship CLI updates.

Optional: clone Hermes locally **for your own research** — never required on user machines.

```bash
git clone https://github.com/NousResearch/hermes-agent.git   # optional, dev only
```

## CLI `runtime` setting

Default is **`cloud`** (HYRO API on VPS). The `hermes` runtime in `~/.hyro/config.json` exists **only for local developer testing** — do not document it for end users.

## Links

- Hermes (reference): https://github.com/NousResearch/hermes-agent
- HYRO (product): https://github.com/hyro-cloud/hyro
- HYRO prompt: `packages/core/src/prompts/hyro.ts`
