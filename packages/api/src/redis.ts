/**
 * Redis wrapper with a graceful in‑memory fallback.
 *
 * Redis powers rate‑limiting, caching, run pub/sub and (later) the run queue.
 * When `REDIS_URL` is unset, an in‑memory implementation keeps the API fully
 * functional for local development and tests.
 */
import Redis from 'ioredis';
import type { Config } from './config';
import type { Logger } from './logger';

export interface KeyValueStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  incr(key: string): Promise<number>;
  expire(key: string, ttlSeconds: number): Promise<void>;
  publish(channel: string, message: string): Promise<void>;
  /** Returns an unsubscribe function. */
  subscribe(channel: string, handler: (message: string) => void): Promise<() => void>;
  ping(): Promise<boolean>;
  close(): Promise<void>;
  readonly backend: 'redis' | 'memory';
}

class MemoryStore implements KeyValueStore {
  readonly backend = 'memory' as const;
  private store = new Map<string, { value: string; expiresAt: number | null }>();
  private channels = new Map<string, Set<(message: string) => void>>();

  private isExpired(entry: { expiresAt: number | null }): boolean {
    return entry.expiresAt !== null && entry.expiresAt <= Date.now();
  }

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (this.isExpired(entry)) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
    });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async incr(key: string): Promise<number> {
    const current = Number((await this.get(key)) ?? '0') + 1;
    const entry = this.store.get(key);
    this.store.set(key, { value: String(current), expiresAt: entry?.expiresAt ?? null });
    return current;
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    const entry = this.store.get(key);
    if (entry) entry.expiresAt = Date.now() + ttlSeconds * 1000;
  }

  async publish(channel: string, message: string): Promise<void> {
    for (const handler of this.channels.get(channel) ?? []) {
      queueMicrotask(() => handler(message));
    }
  }

  async subscribe(channel: string, handler: (message: string) => void): Promise<() => void> {
    let set = this.channels.get(channel);
    if (!set) {
      set = new Set();
      this.channels.set(channel, set);
    }
    set.add(handler);
    return () => set!.delete(handler);
  }

  async ping(): Promise<boolean> {
    return true;
  }

  async close(): Promise<void> {
    this.store.clear();
    this.channels.clear();
  }
}

class RedisStore implements KeyValueStore {
  readonly backend = 'redis' as const;
  private subscribers = new Map<string, Redis>();

  constructor(
    private readonly client: Redis,
    private readonly url: string,
    private readonly log: Logger,
  ) {}

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) await this.client.set(key, value, 'EX', ttlSeconds);
    else await this.client.set(key, value);
  }
  async del(key: string): Promise<void> {
    await this.client.del(key);
  }
  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }
  async expire(key: string, ttlSeconds: number): Promise<void> {
    await this.client.expire(key, ttlSeconds);
  }
  async publish(channel: string, message: string): Promise<void> {
    await this.client.publish(channel, message);
  }
  async subscribe(channel: string, handler: (message: string) => void): Promise<() => void> {
    const sub = this.client.duplicate();
    await sub.subscribe(channel);
    sub.on('message', (ch, msg) => {
      if (ch === channel) handler(msg);
    });
    this.subscribers.set(channel + Math.random(), sub);
    return async () => {
      await sub.unsubscribe(channel).catch(() => undefined);
      sub.disconnect();
    };
  }
  async ping(): Promise<boolean> {
    try {
      return (await this.client.ping()) === 'PONG';
    } catch (err) {
      this.log.warn({ err }, 'Redis ping failed');
      return false;
    }
  }
  async close(): Promise<void> {
    this.client.disconnect();
    for (const sub of this.subscribers.values()) sub.disconnect();
  }
}

export function createStore(config: Config, log: Logger): KeyValueStore {
  if (!config.redisUrl) {
    log.warn('REDIS_URL not set — using in‑memory store (single‑process only).');
    return new MemoryStore();
  }
  const client = new Redis(config.redisUrl, {
    maxRetriesPerRequest: 2,
    lazyConnect: false,
    enableReadyCheck: true,
  });
  client.on('error', (err) => log.warn({ err }, 'Redis client error'));
  return new RedisStore(client, config.redisUrl, log);
}
