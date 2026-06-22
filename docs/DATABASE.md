# HYRO Cloud — Database Schema

PostgreSQL 16 + [`pgvector`](https://github.com/pgvector/pgvector). All tables use
ULID‑style text primary keys (sortable, generated in `@hyro/core`). Timestamps are
`timestamptz` defaulting to `now()`.

The authoritative schema lives in [`packages/api/migrations`](../packages/api/migrations).
This document is the human‑readable map.

---

## Entity relationships

```
users ─┬─< api_keys
       ├─< agents ─┬─< agent_versions
       │           ├─< runs ─< run_steps
       │           ├─< memory_items        (vector)
       │           └─< agent_mcp_grants >── mcp_servers
       ├─< sessions (refresh tokens)
       ├─< usage_events
       └─< marketplace_listings >── agent_versions
```

---

## Tables

### `users`
| column | type | notes |
| --- | --- | --- |
| id | text PK | `usr_…` |
| email | citext UNIQUE | login identity |
| password_hash | text | bcrypt/argon2 |
| display_name | text | |
| default_model | text | FK‑ish → model id in registry |
| plan | text | `free` \| `pro` \| `team` |
| created_at / updated_at | timestamptz | |

### `sessions`
Refresh‑token store for rotation. `id`, `user_id`, `refresh_token_hash`,
`expires_at`, `revoked_at`, `user_agent`, `ip`.

### `api_keys`
| column | type | notes |
| --- | --- | --- |
| id | text PK | `key_…` |
| user_id | text FK | |
| name | text | label |
| prefix | text | first 8 chars shown in UI (`hyro_sk_`) |
| key_hash | text | SHA‑256(secret + pepper) |
| scopes | text[] | e.g. `{runs:execute,memory:write}` |
| last_used_at | timestamptz | |
| revoked_at | timestamptz | |

### `agents`
| column | type | notes |
| --- | --- | --- |
| id | text PK | `agt_…` |
| user_id | text FK | owner |
| slug | text | unique per user |
| name | text | |
| description | text | |
| system_prompt | text | |
| model | text | default model id |
| config | jsonb | temperature, maxSteps, memoryScope, … |
| visibility | text | `private` \| `unlisted` \| `public` |
| created_at / updated_at | timestamptz | |

### `agent_versions`
Immutable snapshots used for deploys & marketplace. `id`, `agent_id`, `version`
(semver), `manifest` jsonb (full agent config + declared MCP/tool requirements),
`readme`, `created_at`.

### `runs`
| column | type | notes |
| --- | --- | --- |
| id | text PK | `run_…` |
| agent_id | text FK | |
| user_id | text FK | |
| status | text | `queued`\|`running`\|`succeeded`\|`failed`\|`cancelled` |
| model | text | model used |
| input | jsonb | task/messages |
| output | jsonb | final result |
| error | text | |
| usage | jsonb | tokens in/out, cost |
| started_at / finished_at | timestamptz | |

### `run_steps`
Append‑only loop trace for replay/streaming. `id`, `run_id`, `idx`, `type`
(`observe`\|`decide`\|`tool_call`\|`tool_result`\|`final`), `content` jsonb,
`tokens` int, `created_at`.

### `memory_items`  *(pgvector)*
| column | type | notes |
| --- | --- | --- |
| id | text PK | `mem_…` |
| agent_id | text FK | scope |
| user_id | text FK | owner |
| type | text | `fact`\|`goal`\|`preference`\|`conversation`\|`state` |
| content | text | the memory |
| metadata | jsonb | tags, source, ttl |
| embedding | vector(1536) | cosine ANN |
| importance | real | retrieval weight |
| created_at / updated_at / last_accessed_at | timestamptz | |

Indexes: `ivfflat (embedding vector_cosine_ops)`, btree on `(agent_id, type)`,
GIN on `metadata`.

### `mcp_servers`
Registry of installable MCP servers. `id` (`mcp_…`), `slug` UNIQUE, `name`,
`description`, `transport` (`stdio`\|`http`\|`sse`), `install` jsonb (command/args or
url), `tools` jsonb (declared tool schemas), `permissions` jsonb (required grants),
`publisher`, `verified` bool, `installs` int, `created_at`.

### `agent_mcp_grants`
Join table of which MCP servers (and which tools) an agent may use. `agent_id`,
`mcp_server_id`, `allowed_tools` text[] (`*` = all), `granted_at`. PK
`(agent_id, mcp_server_id)`.

### `marketplace_listings`
`id` (`lst_…`), `agent_version_id` FK, `slug` UNIQUE, `title`, `summary`, `category`,
`tags` text[], `installs` int, `rating` real, `published_by`, `created_at`.

### `usage_events`
Metering + audit. `id`, `user_id`, `agent_id`, `run_id`, `kind`
(`model`\|`tool`\|`embedding`), `model`, `tokens_in`, `tokens_out`, `cost_usd`
numeric, `latency_ms`, `created_at`. Time‑series; partition by month at scale.

### `schema_migrations`
Migration ledger: `version` text PK, `applied_at`, `checksum`.

---

## pgvector setup

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS citext;

-- cosine ANN index; lists tuned to dataset size
CREATE INDEX memory_items_embedding_idx
  ON memory_items USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

Retrieval query:

```sql
SELECT id, content, type, metadata,
       1 - (embedding <=> $1) AS score
FROM memory_items
WHERE agent_id = $2 AND ($3::text[] IS NULL OR type = ANY($3))
ORDER BY embedding <=> $1
LIMIT $4;
```

The embedding dimension (`EMBEDDING_DIM`, default **1536**) must match the column
definition; changing it requires a migration that rebuilds the column + index.
