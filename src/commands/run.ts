import type { Command } from 'commander';

import { enhanceErrorWithContext } from '#src/utils/enhance-error-with-context.js';

export function setupRunCommand(program: Command): void {
  program
    .command('run')
    .description('Run a transformer')
    .argument('<transformer>', 'Path to transformer file or package name')
    .option('--dry-run', 'Run in dry-run mode without making changes')
    .option('--cwd <dir>', 'Working directory', process.cwd())
    .action(
      async (
        transformer: string,
        options: { dryRun?: boolean; cwd: string },
      ) => {
        const { runTransformer } = await import('../engine.js');

        try {
          await runTransformer(transformer, {
            dryRun: options.dryRun ?? false,
            cwd: options.cwd,
            cliOptions: process.argv.slice(4), // Pass remaining args as transformer options
          });
        } catch (error) {
          throw enhanceErrorWithContext(error, 'Failed to run transformer');
        }
      },
    );
}
