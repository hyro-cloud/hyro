import type { CompletionRequest, CompletionResult, ProviderId } from '@hyro/core';

/** A pluggable chat‑completion backend. One per model provider. */
export interface ModelProvider {
  readonly id: ProviderId;
  /** Whether this provider is usable (has credentials, or is the local fallback). */
  isAvailable(): boolean;
  complete(req: CompletionRequest): Promise<CompletionResult>;
}
