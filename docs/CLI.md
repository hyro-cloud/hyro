# HYRO Cloud — CLI Reference

The `hyro` CLI is the primary HYRO experience: a hacker‑grade **amber terminal** with a
large ASCII logo, an interactive REPL, and one‑shot commands. It works **offline**
(local agent runtime + deterministic embeddings) and upgrades to cloud execution after
`hyro login`.

```
npm install -g hyro
hyro
```

---

## Launching

| Invocation | Behaviour |
| --- | --- |
| `hyro` | Launch the interactive **HYRO Terminal** (REPL). |
| `hyro <command> [args]` | Run a single command and exit. |
| `hyro --help` | Top‑level help. |
| `hyro --version` | Print version. |
| `hyro --json` | Machine‑readable output (for scripting). |
| `hyro --offline` | Force local runtime even if logged in. |

On launch the REPL prints the ASCII logo, version, the mantra
**Observe · Decide · Execute · Remember**, status indicators (model, memory, connected
MCPs, account) and the command list.

---

## REPL

Inside the REPL you type commands without the `hyro` prefix:

```
hyro ❯ status
hyro ❯ model use claude-sonnet-4-6
hyro ❯ run summarize the README
hyro ❯ /help        (slash also works)
hyro ❯ exit
```

Features: history (↑/↓), `clear`, `help`, `exit`/`Ctrl‑D`, live spinner during runs,
streamed step output.

---

## Commands

### Session
```
hyro login                 authenticate (email/password or paste API key)
hyro logout                clear stored credentials
hyro whoami                show the current account
hyro status                model · memory · MCPs · account · API reachability
hyro init                  scaffold a hyro.agent.json in the current directory
```

### Chat & run
```
hyro chat                  interactive chat with the active agent
hyro run "<task>"          one‑shot autonomous task
   --agent <slug>          target a specific agent
   --model <id>            override the model for this run
   --max-steps <n>         cap the agent loop
   --offline               use the local runtime
```

### Agents
```
hyro agents                list your agents
hyro agents new            create an agent (interactive)
hyro agents use <slug>     set the active agent
hyro agents show <slug>    inspect an agent
hyro agents rm <slug>      delete an agent
hyro deploy                deploy the active agent to HYRO Cloud
```

### Memory
```
hyro memory                memory stats for the active agent
hyro memory add "<text>"   add a memory     (--type --tag --importance)
hyro memory search "<q>"   semantic search  (--type --limit)
hyro memory list           recent memories
hyro memory forget <id>    delete a memory
hyro memory export         export to JSONL  (--out file)
hyro memory import <file>  import from JSONL
```

### MCP
```
hyro mcp search <q>        search the MCP registry
hyro mcp install <slug>    install an MCP server (e.g. github, base, dexscreener)
hyro mcp list              installed servers + connection state
hyro mcp tools <slug>      discovered tools for a server
hyro mcp grant <slug>      grant tools to the active agent (interactive)
hyro mcp remove <slug>     remove a server
```

### Models
```
hyro model                 show active model + catalog
hyro model use <id>        switch model (claude-sonnet-4-6, gpt-5, gemini-2.5-pro, …)
hyro model list            full registry with capabilities
```

### Marketplace
```
hyro marketplace           browse community agents
hyro marketplace show <slug>   listing details
hyro install <slug>        install a marketplace agent
hyro publish               publish the active agent
```

---

## Configuration

State lives in `~/.hyro/` (override with `HYRO_HOME`):

```
~/.hyro/
├── config.json     active agent, model, API url, preferences
├── credentials.json  tokens / API key   (chmod 600)
└── memory.db       local memory store when offline (JSON/SQLite)
```

Relevant env vars: `HYRO_API_URL`, `HYRO_TOKEN`, `HYRO_HOME`, `NO_COLOR`,
plus provider keys (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, …) for the offline runtime.

---

## Scripting

```bash
hyro --json agents | jq '.agents[].slug'
HYRO_TOKEN=hyro_sk_... hyro run "deploy staging" --json
```

Exit codes: `0` success · `1` runtime error · `2` usage error · `3` auth required.

---

## Theming

Classic **amber phosphor** on black. Disable color with `NO_COLOR=1` or
`hyro --no-color`. Width adapts to the terminal; boxes/tables degrade gracefully.
