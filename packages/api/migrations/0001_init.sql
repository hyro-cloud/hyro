-- HYRO Cloud — initial schema
-- PostgreSQL 16 + pgvector. Safe to run once (the migrator guards re-application).

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS citext;

-- ---------------------------------------------------------------------------
-- Identity
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            text PRIMARY KEY,
  email         citext UNIQUE NOT NULL,
  password_hash text NOT NULL,
  display_name  text,
  default_model text NOT NULL DEFAULT 'claude-sonnet-4-6',
  plan          text NOT NULL DEFAULT 'free',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  id                 text PRIMARY KEY,
  user_id            text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash text NOT NULL,
  expires_at         timestamptz NOT NULL,
  revoked_at         timestamptz,
  user_agent         text,
  ip                 text,
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_token_idx ON sessions(refresh_token_hash);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);

CREATE TABLE IF NOT EXISTS api_keys (
  id           text PRIMARY KEY,
  user_id      text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         text NOT NULL,
  prefix       text NOT NULL,
  key_hash     text UNIQUE NOT NULL,
  scopes       text[] NOT NULL DEFAULT '{}',
  last_used_at timestamptz,
  revoked_at   timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS api_keys_user_idx ON api_keys(user_id);

-- ---------------------------------------------------------------------------
-- Agents & runs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agents (
  id            text PRIMARY KEY,
  user_id       text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug          text NOT NULL,
  name          text NOT NULL,
  description   text,
  system_prompt text NOT NULL,
  model         text NOT NULL,
  config        jsonb NOT NULL DEFAULT '{}',
  visibility    text NOT NULL DEFAULT 'private',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, slug)
);
CREATE INDEX IF NOT EXISTS agents_user_idx ON agents(user_id);
CREATE INDEX IF NOT EXISTS agents_visibility_idx ON agents(visibility);

CREATE TABLE IF NOT EXISTS agent_versions (
  id         text PRIMARY KEY,
  agent_id   text NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  version    text NOT NULL,
  manifest   jsonb NOT NULL,
  readme     text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agent_id, version)
);

CREATE TABLE IF NOT EXISTS runs (
  id          text PRIMARY KEY,
  agent_id    text NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  user_id     text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status      text NOT NULL DEFAULT 'queued',
  model       text NOT NULL,
  input       jsonb NOT NULL DEFAULT '{}',
  output      jsonb,
  error       text,
  usage       jsonb NOT NULL DEFAULT '{}',
  started_at  timestamptz,
  finished_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS runs_agent_idx ON runs(agent_id);
CREATE INDEX IF NOT EXISTS runs_user_idx ON runs(user_id);
CREATE INDEX IF NOT EXISTS runs_status_idx ON runs(status);

CREATE TABLE IF NOT EXISTS run_steps (
  id         text PRIMARY KEY,
  run_id     text NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  idx        integer NOT NULL,
  type       text NOT NULL,
  content    jsonb NOT NULL DEFAULT '{}',
  tokens     integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id, idx)
);

-- ---------------------------------------------------------------------------
-- Memory (pgvector)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS memory_items (
  id               text PRIMARY KEY,
  agent_id         text NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  user_id          text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type             text NOT NULL,
  content          text NOT NULL,
  metadata         jsonb NOT NULL DEFAULT '{}',
  importance       real NOT NULL DEFAULT 0.5,
  embedding        vector(1536),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  last_accessed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS memory_items_agent_type_idx ON memory_items(agent_id, type);
CREATE INDEX IF NOT EXISTS memory_items_metadata_idx ON memory_items USING gin (metadata);
CREATE INDEX IF NOT EXISTS memory_items_embedding_idx
  ON memory_items USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ---------------------------------------------------------------------------
-- MCP
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mcp_servers (
  id          text PRIMARY KEY,
  slug        text UNIQUE NOT NULL,
  name        text NOT NULL,
  description text,
  transport   text NOT NULL,
  install     jsonb NOT NULL DEFAULT '{}',
  env         text[] NOT NULL DEFAULT '{}',
  tools       jsonb NOT NULL DEFAULT '[]',
  permissions jsonb NOT NULL DEFAULT '{}',
  publisher   text,
  verified    boolean NOT NULL DEFAULT false,
  installs    integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_mcp_installs (
  user_id       text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mcp_server_id text NOT NULL REFERENCES mcp_servers(id) ON DELETE CASCADE,
  env           jsonb NOT NULL DEFAULT '{}',
  installed_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, mcp_server_id)
);

CREATE TABLE IF NOT EXISTS agent_mcp_grants (
  agent_id      text NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  mcp_server_id text NOT NULL REFERENCES mcp_servers(id) ON DELETE CASCADE,
  allowed_tools text[] NOT NULL DEFAULT '{}',
  granted_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (agent_id, mcp_server_id)
);

-- ---------------------------------------------------------------------------
-- Marketplace & usage
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS marketplace_listings (
  id               text PRIMARY KEY,
  slug             text UNIQUE NOT NULL,
  title            text NOT NULL,
  summary          text NOT NULL,
  category         text NOT NULL,
  tags             text[] NOT NULL DEFAULT '{}',
  installs         integer NOT NULL DEFAULT 0,
  rating           real NOT NULL DEFAULT 0,
  published_by     text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_version_id text NOT NULL REFERENCES agent_versions(id) ON DELETE CASCADE,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS marketplace_category_idx ON marketplace_listings(category);

CREATE TABLE IF NOT EXISTS usage_events (
  id         text PRIMARY KEY,
  user_id    text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_id   text REFERENCES agents(id) ON DELETE SET NULL,
  run_id     text REFERENCES runs(id) ON DELETE SET NULL,
  kind       text NOT NULL,
  model      text,
  tokens_in  integer NOT NULL DEFAULT 0,
  tokens_out integer NOT NULL DEFAULT 0,
  cost_usd   numeric(12,6) NOT NULL DEFAULT 0,
  latency_ms integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS usage_user_time_idx ON usage_events(user_id, created_at);
