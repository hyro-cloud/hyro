# HYRO Cloud — Memory Architecture

Memory is what turns a model into an **agent**. HYRO persists five kinds of memory and
retrieves them by semantic similarity at decision time.

---

## 1. Memory types

| Type | Purpose | Example |
| --- | --- | --- |
| `fact` | Stable knowledge about the world or the user | "User's primary repo is `acme/api`." |
| `goal` | Active objectives the agent is pursuing | "Ship the billing migration by Friday." |
| `preference` | How the user likes things done | "Always respond in TypeScript, no comments." |
| `conversation` | Salient turns worth recalling later | summarized chat history |
| `state` | Agent's own working state across runs | "Last run left PR #42 awaiting review." |

Each item carries `content`, `metadata` (tags, source, ttl), an `importance` weight,
and a vector `embedding`.

---

## 2. Storage

Backed by PostgreSQL + `pgvector` (see [DATABASE.md](DATABASE.md) → `memory_items`).
Memory is **scoped per agent** by default (`memory_scope` in agent config can widen to
user‑level so an agent shares the user's global memory).

---

## 3. Embeddings

`EmbeddingService` produces a fixed‑dimension vector (`EMBEDDING_DIM`, default 1536):

1. **Provider mode** — calls the configured provider's embeddings endpoint
   (OpenAI `text-embedding-3-*`, Gemini, etc.).
2. **Local mode** (default offline) — a deterministic **hashed n‑gram projection**:
   tokenize → hash tri‑grams into buckets → L2‑normalize. No network, no key,
   reproducible across machines. Good enough for dev, tests, and small corpora.

The encoder is selected by `EMBEDDING_MODEL`; both modes return the same dimension so
the column/index never changes between them.

---

## 4. Write path

```
agent step produces a fact/goal/…           hyro memory add "<text>" --type fact
            │                                          │
            ▼                                          ▼
     MemoryService.upsert({ agentId, type, content, metadata })
            │  embedding = EmbeddingService.embed(content)
            ▼
     INSERT INTO memory_items (...) RETURNING id
```

De‑duplication: before insert, a near‑duplicate check (cosine > 0.97 within type)
updates the existing item's `importance`/`last_accessed_at` instead of inserting.

---

## 5. Read path (retrieval‑augmented decisions)

```
question / current step
   │ embed
   ▼
top‑k = vector ANN over memory_items
        filtered by agent_id (+ optional type filter)
        ordered by cosine distance
   │
   ▼
re‑rank by   score = cos_sim · (1 + w_importance·importance) · recency_decay
   │
   ▼
inject top‑N into the model context as a "Memory" block
```

`recency_decay = exp(-Δdays / half_life)` keeps stale memories from dominating.
Accessing a memory bumps `last_accessed_at` (and optionally importance).

---

## 6. Compaction

Long `conversation` memories are periodically summarized: a batch job clusters recent
turns, asks the model for a concise summary, writes it back as a higher‑importance
`conversation` item, and lowers the importance of the raw turns. This keeps retrieval
sharp and context budgets small.

---

## 7. CLI surface

```
hyro memory                 show memory stats for the active agent
hyro memory add "<text>"    add a memory   (--type, --tag, --importance)
hyro memory search "<q>"    semantic search (--type, --limit)
hyro memory list            list recent memories
hyro memory forget <id>     delete a memory
hyro memory export          dump to JSONL  (--out memory.jsonl)
hyro memory import <file>   load from JSONL (re‑embeds on import)
```

Export format is portable JSONL — one memory per line:

```json
{"type":"fact","content":"…","metadata":{"tags":["repo"]},"importance":0.8}
```

On import, embeddings are recomputed so the file stays provider‑independent.

---

## 8. Privacy & lifecycle

- Memories are owned by the user and scoped to an agent; deleting an agent cascades.
- `metadata.ttl` (seconds) enables expiring memories; a sweeper removes expired rows.
- `hyro memory forget`/`export` give users full control and portability.
