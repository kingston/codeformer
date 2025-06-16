import type { Command } from 'commander';

interface CliOptions {
  dryRun?: boolean;
  cwd?: string;
  transformerOptions?: string[];
}

export function setupRunCommand(program: Command): void {
  program
    .command('run')
    .description('Run a transformer')
    .argument('<transformer>', 'Path to transformer file')
    .option('-d, --dry-run', 'Run in dry-run mode without making changes')
    .option(
      '-c, --cwd <dir>',
      'Working directory to run the transformer in',
      process.cwd(),
    )
    .usage('<transformer> [options] -- [transformer options of form key=value]')
    .action(async (transformer: string, options: CliOptions) => {
      const { loadAndRunTransformer } = await import(
        '../transformers/index.js'
      );

      await loadAndRunTransformer(transformer, program.args, {
        dryRun: options.dryRun,
        cwd: options.cwd,
      });
    });
}
