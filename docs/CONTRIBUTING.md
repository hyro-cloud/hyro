# Contributing to HYRO Cloud

## Prerequisites
- Node ≥ 20, npm ≥ 10
- Docker (for Postgres + Redis) — optional; the CLI runs offline without them

## Setup
```bash
npm install
npm run build              # builds core → sdk → api → cli in order
docker compose up -d       # optional services
cp .env.example .env
npm run db:migrate && npm run db:seed
```

## Workspace scripts
| command | effect |
| --- | --- |
| `npm run build` | build every package |
| `npm run dev:api` | run the API with hot reload (tsx watch) |
| `npm run dev:cli` | run the CLI from source (tsx) |
| `npm run cli -- <args>` | invoke the CLI with args |
| `npm run typecheck` | type‑check all packages |
| `npm run db:migrate` / `db:seed` | database lifecycle |
| `npm run web` | serve the landing page |

## Conventions
- **TypeScript strict**, CommonJS output, Node ≥ 20.
- Dependency direction is one‑way: `core ← sdk ← cli`, `core ← api`. Never import `api`
  or `cli` from a library package.
- Shared domain types/schemas live in `@hyro/core`. Don't redefine them downstream.
- Validation at the edge with Zod; services receive already‑validated input.
- Errors are typed (`HyroError` subclasses) and mapped to the JSON error model.
- Keep the CLI dependency‑light: prefer Node built‑ins; the amber theme/box/spinner are
  hand‑rolled in `src/ui.ts` / `src/theme.ts`.

## Adding an API route
1. Define request/response schemas in `@hyro/core/schemas` (or route‑local Zod).
2. Add a service method in `packages/api/src/services`.
3. Register the route in `packages/api/src/routes/<group>.ts` with auth + scopes.
4. Document it in [docs/API.md](API.md).

## Adding a CLI command
1. Create `packages/cli/src/commands/<name>.ts` exporting a `Command`.
2. Register it in `src/router.ts` (also wires it into the REPL).
3. Document it in [docs/CLI.md](CLI.md).

## Commit style
Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`, `test:`.
