# HYRO Agent — System Prompt

Default autonomous agent for [HYRO Cloud](https://hyrocloud.lol).

Source of truth (TypeScript): `packages/core/src/prompts/hyro.ts`

## Usage

- **CLI offline runs** — referenced in `packages/cli/src/runtime/local.ts`
- **Web console** — `prompt` command in `/app`
- **API seeds** — align agent `systemPrompt` in `packages/api/src/db/seed.ts`

## Install & run

```bash
git clone https://github.com/hyro-cloud/hyro.git
cd hyro && npm install && npm run build
npm install -g ./packages/cli
hyro run "your task" --offline
```

## Prompt

See `packages/core/src/prompts/hyro.ts` for the full `HYRO_AGENT_SYSTEM_PROMPT`.
