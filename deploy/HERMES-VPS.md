# Hermes Agent on HYRO VPS (optional runtime)

[Hermes Agent](https://github.com/NousResearch/hermes-agent) is Nous Research's **full** autonomous agent (Python): 40+ tools, skills, memory, MCP, cron, gateway (Telegram/Discord), and **native Xiaomi MiMo** support.

HYRO Cloud (`hyro` CLI + `api.hyrocloud.lol`) is a **separate TypeScript stack**. You can run both on the same VPS:

| Layer | Role |
| --- | --- |
| **HYRO Cloud API** | Accounts, agents DB, web/CLI cloud runs, MiMo via `MIMO_API_KEY` |
| **Hermes Agent** | Full Hermes brain (skills loop, 40+ tools) — install from upstream repo |

Use Hermes when you want the **real** Hermes runtime. Use HYRO Cloud when you want the **hyro** terminal + your API + site.

---

## Install Hermes on the VPS (alongside HYRO API)

SSH to the VPS (`159.223.156.212`):

```bash
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
source ~/.bashrc
hermes setup
```

Or clone upstream:

```bash
git clone https://github.com/NousResearch/hermes-agent.git
cd hermes-agent
# follow https://hermes-agent.nousresearch.com/docs/getting-started/quickstart
```

---

## Brand Hermes as HYRO (Hermes runtime, HYRO identity)

When users type **`hyro`**, the CLI can launch **Hermes Agent** in the background (same brain as [NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent)) with a HYRO `SOUL.md` — users never need to type `hermes`.

### On the user's PC (recommended for full Hermes intelligence)

**PowerShell (Windows):**

```powershell
iex (irm https://hermes-agent.nousresearch.com/install.ps1)
hermes setup
```

**`~/.hyro/config.json`:**

```json
{
  "apiUrl": "https://api.hyrocloud.lol",
  "model": "mimo-chat",
  "activeAgent": "hyro",
  "runtime": "hermes"
}
```

Or `"runtime": "auto"` (default) — uses Hermes when installed, otherwise HYRO Cloud API.

Configure MiMo in Hermes (`hermes model` / `--provider xiaomi`) with the same key as HYRO `.env.prod`.

Then:

```bash
hyro
hyro run "your task"
```

### Manual SOUL on VPS (optional)

```bash
mkdir -p ~/.hermes
cp deploy/hermes-SOUL-HYRO.md ~/.hermes/SOUL.md
```

---

## Point Hermes at MiMo (same provider as HYRO API)

Hermes supports [Xiaomi MiMo](https://github.com/NousResearch/hermes-agent) natively.

```bash
hermes model
# or
hermes config set
```

Use the same values as HYRO `.env.prod`:

- Base URL: `https://token-plan-sgp.xiaomimimo.com/v1`
- API key: your `MIMO_API_KEY`

Docs: https://hermes-agent.nousresearch.com/docs/user-guide/configuration

---

## Two terminals, one server

```text
Your PC                          VPS
───────                          ───
hyro          ──HTTPS──►  api.hyrocloud.lol   (HYRO Cloud API + MiMo)
hermes (SSH)  ──SSH────►  hermes CLI on VPS    (full Hermes + MiMo)
```

- **`hyro`** on your PC → HYRO Cloud (lighter, your repo, website integration).
- **`hermes`** on VPS (or PC after install) → full [NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent) experience.

They can share the **same MiMo key** but are **not the same process**.

---

## What HYRO already took from Hermes

The default HYRO agent prompt (`packages/core/src/prompts/hyro.ts`) is **inspired by** Hermes memory/skills/tool discipline, but runs inside HYRO's agent loop — not the full Hermes Python runtime.

To upgrade smartness to Hermes level: **install Hermes on the VPS** (steps above), not only change the HYRO prompt.

---

## Links

- Repo: https://github.com/NousResearch/hermes-agent
- Docs: https://hermes-agent.nousresearch.com/docs/
- HYRO repo: https://github.com/hyro-cloud/hyro
