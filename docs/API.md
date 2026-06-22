# HYRO Cloud — API Reference

Base URL: `${PUBLIC_API_URL}` (default `http://localhost:8080`). All endpoints are
versioned under `/v1`. Requests and responses are JSON. Interactive docs (OpenAPI) are
served at **`/docs`** when the API is running.

---

## Authentication

Two mechanisms, both presented as a Bearer token:

```
Authorization: Bearer <jwt>            # user session (from /v1/auth/login)
Authorization: Bearer hyro_sk_<...>    # API key (machine access)
```

- **JWT** access tokens are short‑lived; refresh via `/v1/auth/refresh`.
- **API keys** are created at `/v1/auth/api-keys`, shown **once**, and carry **scopes**.

### Scopes
`agents:read` · `agents:write` · `runs:execute` · `memory:read` · `memory:write` ·
`mcp:manage` · `marketplace:publish`

JWT sessions implicitly hold all scopes for the owning user.

---

## Error model

All errors share one shape:

```json
{
  "error": {
    "code": "unauthorized",
    "message": "Missing or invalid credentials",
    "details": {},
    "requestId": "req_01J..."
  }
}
```

| HTTP | code | meaning |
| --- | --- | --- |
| 400 | `bad_request` / `validation_error` | malformed input (Zod details) |
| 401 | `unauthorized` | missing/invalid token |
| 403 | `forbidden` | authenticated but missing scope |
| 404 | `not_found` | resource doesn't exist / not owned |
| 409 | `conflict` | slug/email already exists |
| 429 | `rate_limited` | too many requests |
| 500 | `internal` | unexpected |

---

## Endpoints

### Health
```
GET /healthz      → 200 { status: "ok" }                 (liveness)
GET /readyz       → 200 { status, db, redis }             (readiness)
```

### Auth — `/v1/auth`
```
POST /register        { email, password, displayName? }  → { user, tokens }
POST /login           { email, password }                → { user, tokens }
POST /refresh         { refreshToken }                    → { tokens }
POST /logout          { refreshToken }                    → 204
GET  /me                                                  → { user }
POST /api-keys        { name, scopes[] }                  → { apiKey, secret }   # secret shown once
GET  /api-keys                                            → { keys[] }
DELETE /api-keys/:id                                      → 204
```
`tokens = { accessToken, refreshToken, expiresIn }`.

### Agents — `/v1/agents`
```
GET    /                 ?limit&cursor                    → { agents[], nextCursor }
POST   /                 { name, systemPrompt, model?, config?, visibility? } → { agent }
GET    /:id                                               → { agent }
PATCH  /:id              { ...partial }                   → { agent }
DELETE /:id                                              → 204
POST   /:id/deploy       { version? }                     → { version }   # snapshot
GET    /:id/versions                                      → { versions[] }
```

### Runs — `/v1/runs`
```
POST /                   { agentId, input, model?, stream? } → { run }   # queued
GET  /:id                                                  → { run, steps[] }
GET  /:id/stream         (text/event-stream)               → SSE: step events
POST /:id/cancel                                           → { run }
GET  /                   ?agentId&status&limit&cursor      → { runs[], nextCursor }
```
SSE event payloads mirror `run_steps`: `{ idx, type, content, tokens }`, terminated by
a `done` event carrying the final run.

### Memory — `/v1/memory`
```
POST /                   { agentId, type, content, metadata?, importance? } → { item }
POST /search             { agentId, query, types?, limit? }   → { results[] }  # score‑ranked
GET  /                   ?agentId&type&limit&cursor           → { items[], nextCursor }
DELETE /:id                                                   → 204
POST /export             { agentId }                          → JSONL stream
POST /import             { agentId, items[] }                 → { imported }
```

### MCP — `/v1/mcp`
```
GET  /registry           ?q&limit                         → { servers[] }   # search registry
POST /install            { slug }                          → { server }      # add to account
GET  /                                                     → { servers[] }   # installed
DELETE /:id                                               → 204
GET  /:id/tools                                           → { tools[] }      # discovered at runtime
POST /grants             { agentId, serverId, allowedTools[] } → { grant }
GET  /grants             ?agentId                          → { grants[] }
```

### Marketplace — `/v1/marketplace`
```
GET  /                   ?q&category&limit&cursor          → { listings[], nextCursor }
GET  /:slug                                               → { listing }
POST /publish            { agentId, title, summary, category, tags? } → { listing }   # scope: marketplace:publish
POST /:slug/install                                       → { agent }        # clone into account
```

### Models — `/v1/models`
```
GET  /                                                     → { models[] }    # registry + enabled flag
POST /default            { model }                         → { user }        # set account default
```

### Usage — `/v1/usage`
```
GET  /summary            ?from&to                          → { totals, byDay[], byModel[] }
GET  /events             ?limit&cursor                     → { events[], nextCursor }
```

---

## Conventions

- **Pagination**: opaque `cursor` (ULID of last item) + `limit` (default 20, max 100).
- **Idempotency**: send `Idempotency-Key` on `POST /v1/runs` to safely retry.
- **Request id**: every response includes `X-Request-Id`; echo it in bug reports.
- **Rate limits**: `X-RateLimit-{Limit,Remaining,Reset}` headers; `RATE_LIMIT_*` env.

---

## Example

```bash
curl -s $PUBLIC_API_URL/v1/runs \
  -H "Authorization: Bearer hyro_sk_..." \
  -H "Content-Type: application/json" \
  -d '{"agentId":"agt_123","input":{"task":"summarize the latest 5 PRs"}}'
```
