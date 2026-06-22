/**
 * @hyro/core — the framework‑free shared kernel for HYRO Cloud.
 *
 * Everything imported by the API, SDK and CLI lives here: domain types, the model
 * registry, Zod request schemas, id generation, typed errors and the Result type.
 */
export * from './constants';
export * from './errors';
export * from './ids';
export * from './models';
export * from './result';
export * from './schemas';
export * from './types';

export * from './prompts/hyro';

export const VERSION = '0.1.0';
