import { ApiError } from '@hyro/sdk';
import { CliError } from '../lib/errors';
import { print, printError } from '../lib/output';
import { theme } from '../theme';

export function handleCliError(err: unknown): never {
  if (err instanceof CliError) {
    printError(err.message);
    if (err.hint) print(theme.dim(`  ${err.hint}`));
    process.exit(err.exitCode);
  }
  if (err instanceof ApiError) {
    printError(`${err.message}${err.requestId ? theme.dim(` (${err.requestId})`) : ''}`);
    process.exit(1);
  }
  printError((err as Error).message || 'Unexpected error');
  process.exit(1);
}
