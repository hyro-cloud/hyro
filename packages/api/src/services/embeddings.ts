/**
 * Embedding service. Produces fixed‑dimension vectors for memory storage/retrieval.
 *
 *  - Provider mode: OpenAI `text-embedding-3-*` when configured.
 *  - Local mode (default): a deterministic hashed n‑gram projection — no network,
 *    no API key, reproducible across machines.
 *
 * Both modes return `config.embeddingDim` floats so the pgvector column never changes.
 */
import { getModel } from '@hyro/core';
import type { Config } from '../config';
import type { Logger } from '../logger';
import { fetchJson } from '../providers/shared';

function fnv1a(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function charTrigrams(text: string): string[] {
  const clean = text.toLowerCase().replace(/\s+/g, ' ');
  const grams: string[] = [];
  for (let i = 0; i < clean.length - 2; i++) grams.push(clean.slice(i, i + 3));
  return grams;
}

export class EmbeddingService {
  private readonly dim: number;
  private readonly model: string;

  constructor(
    private readonly config: Config,
    private readonly log: Logger,
  ) {
    this.dim = config.embeddingDim;
    this.model = config.embeddingModel;
  }

  get dimension(): number {
    return this.dim;
  }

  private useProvider(): boolean {
    const info = getModel(this.model);
    return Boolean(info && info.provider === 'openai' && this.config.providerKeys.openai);
  }

  /** Deterministic local embedding via hashed n‑gram projection + L2 normalization. */
  private localEmbed(text: string): number[] {
    const vec = new Float64Array(this.dim);
    const features = [...tokenize(text), ...charTrigrams(text)];
    for (const feature of features) {
      const h = fnv1a(feature);
      const idx = h % this.dim;
      const sign = (fnv1a(`s:${feature}`) & 1) === 0 ? 1 : -1;
      vec[idx]! += sign;
    }
    let norm = 0;
    for (let i = 0; i < this.dim; i++) norm += vec[i]! * vec[i]!;
    norm = Math.sqrt(norm) || 1;
    const out = new Array<number>(this.dim);
    for (let i = 0; i < this.dim; i++) out[i] = vec[i]! / norm;
    return out;
  }

  private async providerEmbed(texts: string[]): Promise<number[][]> {
    const data = (await fetchJson('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.config.providerKeys.openai!}`,
      },
      body: JSON.stringify({ model: this.model, input: texts, dimensions: this.dim }),
    })) as { data?: { embedding: number[] }[] };
    return (data.data ?? []).map((d) => d.embedding);
  }

  async embed(text: string): Promise<number[]> {
    const [vec] = await this.embedBatch([text]);
    return vec ?? this.localEmbed(text);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (this.useProvider()) {
      try {
        return await this.providerEmbed(texts);
      } catch (err) {
        this.log.warn({ err }, 'Provider embedding failed — falling back to local encoder');
      }
    }
    return texts.map((t) => this.localEmbed(t));
  }

  /** Format a vector as a pgvector literal: `[v1,v2,...]`. */
  static toPgVector(vec: number[]): string {
    return `[${vec.join(',')}]`;
  }
}
