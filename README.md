<div align="center">

<img src="logo.jpg" alt="HYRO Cloud" width="160" />

# HYRO Cloud

### The Operating System for Autonomous Agents

**Deploy. Connect. Remember. Execute.**

HYRO turns AI models into persistent agents with tools, memory, and MCP connectivity —
all from a terminal‑first experience that runs locally and in the cloud.

[![CI](https://img.shields.io/badge/build-passing-22d3ee?style=flat-square)](#)
[![License](https://img.shields.io/badge/license-Apache--2.0-8b5cf6?style=flat-square)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-3b82f6?style=flat-square)](#)
[![CLI](https://img.shields.io/badge/cli-hyro-FFB000?style=flat-square)](#)

</div>

---

```
npm install -g hyro
hyro
```

```
   ▄█    █▄    ▄██   ▄      ▄████████  ▄██████▄
  ███    ███   ███   ██▄   ███    ███ ███    ███
  ███    ███   ███▄▄▄███   ███    ███ ███    ███
 ▄███▄▄▄▄███▄▄ ▀▀▀▀▀▀███  ▄███▄▄▄▄██▀ ███    ███
▀▀███▀▀▀▀███▀  ▄██   ███ ▀▀███▀▀▀▀▀   ███    ███
  ███    ███   ███   ███   ███    ██▄ ███    ███
  ███    ███   ███   ███   ███    ███ ███    ███
  ███    █▀     ▀█████▀    ███    ███  ▀██████▀

  HYRO TERMINAL  ·  v0.1.0
  Observe.  Decide.  Execute.  Remember.
```

---

## Why HYRO

HYRO is **not a chatbot**. It is a cloud runtime — an *agent operating system* — that lets
developers create, deploy, execute, monitor and manage autonomous AI agents. Think of the
ergonomics of **Claude Code** + **Cursor Agent**, the persistence of a real OS, and the
open tool ecosystem of **MCP**.

| Capability            | What it means                                                        |
| --------------------- | -------------------------------------------------------------------- |
| 🖥️ **CLI access**      | A hacker‑grade amber terminal. One‑shot commands *and* a live REPL.  |
| ☁️ **Cloud execution** | Agents run as durable, observable runs on the HYRO Cloud API.        |
| 🔌 **MCP integration** | Install MCP servers; tools auto‑discovered and exposed to agents.    |
| 🧠 **Agent memory**    | Facts, goals, preferences, conversations & state in pgvector.        |
| 🧬 **Multi‑model**     | Anthropic, OpenAI, Gemini, OpenRouter — switch on the fly.           |
| 🛒 **Marketplace**     | Publish, discover and install agents with one command.               |
| 🚀 **Deployment**      | `hyro deploy` ships an agent to the cloud as a callable endpoint.    |

---

## Monorepo layout

```
hyro-cloud/
├── packages/
│   ├── core/      @hyro/core   — shared types, model registry, schemas, ids, errors
│   ├── sdk/       @hyro/sdk    — typed HTTP client for the HYRO Cloud API
│   ├── api/       @hyro/api    — Fastify + PostgreSQL/pgvector + Redis backend
│   └── cli/       hyro         — terminal‑first interface (REPL + commands)
├── web/                        — premium landing page (static, zero‑build)
├── docs/                       — architecture, API, CLI, MCP, memory, roadmap
├── docker-compose.yml          — Postgres(pgvector) + Redis for local dev
└── package.json                — npm workspaces root
```

A deep dive lives in **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

---

## Quick start (local dev)

> Requires Node ≥ 20. Postgres + Redis are optional — bring them up with Docker, or run
> the CLI in **offline mode** which uses a local agent runtime and a deterministic
> embedding encoder.

```bash
# 1. Install workspace deps
npm install

# 2. Build all packages (core → sdk → api → cli)
npm run build

# 3. (optional) start Postgres(pgvector) + Redis
docker compose up -d
cp .env.example .env            # then edit secrets / provider keys
npm run db:migrate              # apply SQL migrations
npm run db:seed                 # seed model + marketplace catalog

# 4a. Run the API
npm run dev:api                 # → http://localhost:8080  (Swagger at /docs)

# 4b. Run the CLI
npm run cli                     # or: node packages/cli/bin/hyro.js
```

Once published, the end‑user flow is simply:

```bash
npm install -g hyro
hyro login
hyro
```

---

## The terminal

```
hyro                 launch the interactive REPL (the HYRO Terminal)
hyro chat            start an interactive agent chat session
hyro run "<task>"    execute a one‑shot autonomous task
hyro agents          list / create / inspect agents
hyro deploy          deploy the current agent to HYRO Cloud
hyro memory          inspect, search, export and import agent memory
hyro mcp <cmd>       search / install / list / remove MCP servers
hyro model use <id>  switch the active model
hyro marketplace     browse and install community agents
hyro publish         publish an agent to the marketplace
hyro status          show runtime status: model, memory, MCPs, account
hyro login / logout  authenticate against HYRO Cloud
```

Full reference: **[docs/CLI.md](docs/CLI.md)**.

---

## Architecture at a glance

```
        ┌───────────────────────────────────────────────────────────┐
        │                       HYRO CLI (hyro)                      │
        │   REPL · command router · local runtime · MCP client       │
        └───────────────┬───────────────────────────┬───────────────┘
                        │  HTTPS (Bearer / API key)  │  stdio / MCP
                        ▼                            ▼
        ┌───────────────────────────────┐   ┌───────────────────────┐
        │       HYRO Cloud API          │   │     MCP Servers        │
        │  Fastify · Zod · JWT/API‑key  │   │ github · base · dex …  │
        │                               │   └───────────────────────┘
        │  auth · agents · runs · memory│
        │  mcp registry · marketplace   │
        │  models · usage · billing     │
        └───────┬───────────────┬───────┘
                │               │
        ┌───────▼──────┐ ┌──────▼───────┐        ┌────────────────────┐
        │ PostgreSQL   │ │   Redis      │        │  Model Providers    │
        │ + pgvector   │ │ queue/cache  │        │ Anthropic · OpenAI  │
        │ (memory)     │ │ rate‑limit   │        │ Gemini · OpenRouter │
        └──────────────┘ └──────────────┘        └────────────────────┘
```

---

## Documentation

| Doc | Contents |
| --- | --- |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, data flow, runtime model |
| [API.md](docs/API.md)                   | Full REST surface, auth, error model |
| [DATABASE.md](docs/DATABASE.md)         | Schema, pgvector, indexes, migrations |
| [CLI.md](docs/CLI.md)                   | Every command, flags, examples |
| [MCP.md](docs/MCP.md)                   | Registry, runtime, permissions model |
| [MEMORY.md](docs/MEMORY.md)             | Memory model, embedding & retrieval |
| [ROADMAP.md](docs/ROADMAP.md)           | Phased delivery plan |
| [CONTRIBUTING.md](docs/CONTRIBUTING.md) | Dev workflow & conventions |

---

## License

Apache‑2.0 © HYRO Cloud. See [LICENSE](LICENSE).
