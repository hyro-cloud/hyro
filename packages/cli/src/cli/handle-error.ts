import { ApiError } from '@hyro/sdk';
import { CliError, EXIT } from '../lib/errors';
import { print, printError } from '../lib/output';
import { theme } from '../theme';

function authHint(err: ApiError): string | undefined {
  if (err.statusCode !== 401) return undefined;
  return "Run 'hyro login' to sign in again (session may have expired after a server redeploy).";
}

export function handleCliError(err: unknown): never {
  if (err instanceof CliError) {
    printError(err.message);
    if (err.hint) print(theme.dim(`  ${err.hint}`));
    process.exit(err.exitCode);
  }
  if (err instanceof ApiError) {
    printError(`${err.message}${err.requestId ? theme.dim(` (${err.requestId})`) : ''}`);
    const hint = authHint(err);
    if (hint) print(theme.dim(`  ${hint}`));
    process.exit(err.statusCode === 401 ? EXIT.auth : 1);
  }
  printError((err as Error).message || 'Unexpected error');
  process.exit(1);
}
