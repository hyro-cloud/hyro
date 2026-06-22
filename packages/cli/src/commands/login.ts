import { Command } from 'commander';
import { login as doLogin } from '../api/auth';
import { handleCliError } from '../cli/handle-error';

export function registerLoginCommand(program: Command): void {
  const login = program
    .command('login')
    .description('Authenticate against HYRO Cloud')
    .option('--email <email>', 'Account email')
    .option('--password <password>', 'Account password')
    .option('--key <apiKey>', 'API key (hyro_sk_…)')
    .option('--register', 'Create a new account')
    .action(async (opts, cmd) => {
      try {
        const globalOpts = cmd.optsWithGlobals();
        await doLogin({
          email: opts.email,
          password: opts.password,
          key: opts.key,
          register: opts.register,
          json: globalOpts.json,
        });
      } catch (err) {
        handleCliError(err);
      }
    });

  login.addHelpText(
    'after',
    '\nExamples:\n  hyro login\n  hyro login --key hyro_sk_...\n  hyro login --register',
  );
}
