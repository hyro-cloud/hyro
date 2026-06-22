# HYRO Cloud — MCP Integration

HYRO speaks the [Model Context Protocol](https://modelcontextprotocol.io) natively.
Agents acquire capability by connecting to MCP servers; HYRO discovers their tools and
exposes them to the agent loop — gated by an explicit permission model.

---

## 1. Concepts

```
Registry  →  Install  →  Runtime (handshake + discover)  →  Grant  →  Agent uses tools
```

- **Registry** — searchable catalog of MCP servers and how to run them.
- **Install** — add a server to your account (does not yet grant any tool).
- **Runtime** — launches the server, performs the MCP `initialize` handshake, calls
  `tools/list`, caches tool schemas, and proxies `tools/call`.
- **Grant** — per‑agent permission to call specific tools (deny‑by‑default).

---

## 2. Registry

A server manifest:

```json
{
  "slug": "github",
  "name": "GitHub",
  "description": "Repos, issues, PRs and code search.",
  "transport": "stdio",
  "install": { "command": "npx", "args": ["-y", "@modelcontextprotocol/server-github"] },
  "env": ["GITHUB_TOKEN"],
  "tools": [
    { "name": "search_repositories", "description": "...", "inputSchema": { "...": "..." } },
    { "name": "create_issue",        "description": "...", "inputSchema": { "...": "..." } }
  ],
  "permissions": { "network": true, "filesystem": false },
  "publisher": "hyro",
  "verified": true
}
```

Supported transports:
- `stdio` — spawn a child process; JSON‑RPC over stdin/stdout (most servers).
- `http` / `sse` — connect to a hosted MCP endpoint.

CLI:
```
hyro mcp search github
hyro mcp install github
hyro mcp install base
hyro mcp install dexscreener
hyro mcp list
```

---

## 3. Runtime & discovery

When an agent run needs tools, `McpRuntime`:

1. Resolves the installed server + its `install` spec.
2. **stdio**: spawns the process with a sandboxed env (only declared `env` keys pass
   through) and resource/time limits. **http/sse**: opens the connection.
3. Sends `initialize` (protocol + client capabilities), then `tools/list`.
4. Normalizes tool schemas into HYRO's internal tool format and caches them (Redis).
5. On a model tool call, dispatches `tools/call` and returns the result to the loop.

Discovered tools appear in:
```
hyro mcp tools github
```

---

## 4. Permission model

Tools are **denied by default**. Nothing an MCP server exposes is callable until the
user grants it for a specific agent.

```
hyro mcp grant github            # interactive: choose tools to allow for active agent
```

stored as an `agent_mcp_grants` row:

```json
{ "agentId": "agt_…", "mcpServerId": "mcp_…", "allowedTools": ["search_repositories"] }
```

`allowedTools: ["*"]` grants every tool. At call time the runtime checks:

```
grant exists for (agent, server)  AND  (tool ∈ allowedTools  OR  "*" ∈ allowedTools)
```

Destructive tools (declared `dangerous: true` in the manifest) require an extra
confirmation in interactive mode and a per‑run opt‑in in automated mode.

---

## 5. Sandbox

stdio servers run with:
- a **scrubbed environment** — only manifest‑declared `env` keys forwarded;
- **timeouts** on handshake and each `tools/call`;
- **output caps** to bound memory;
- optional **network/filesystem policy** from the manifest `permissions`
  (enforced by the sandbox profile when `MCP_SANDBOX=true`).

---

## 6. First‑party servers (target set)

| slug | purpose |
| --- | --- |
| `github` | repos, issues, PRs, code search |
| `base` | Base / EVM chain reads & txs |
| `dexscreener` | token pairs, prices, liquidity |
| `filesystem` | scoped local file access |
| `http` | generic HTTP fetch |
| `postgres` | read‑only SQL over a connection |

---

## 7. API surface

See [API.md](API.md) → MCP. In short:
```
GET  /v1/mcp/registry?q=    search
POST /v1/mcp/install        install by slug
GET  /v1/mcp                list installed
GET  /v1/mcp/:id/tools      discovered tools
POST /v1/mcp/grants         grant tools to an agent
```
