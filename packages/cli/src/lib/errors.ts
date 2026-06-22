/** Error type carrying a process exit code. */
export class CliError extends Error {
  constructor(
    message: string,
    readonly exitCode = 1,
    readonly hint?: string,
  ) {
    super(message);
    this.name = 'CliError';
  }
}

export const EXIT = {
  ok: 0,
  error: 1,
  usage: 2,
  auth: 3,
} as const;
