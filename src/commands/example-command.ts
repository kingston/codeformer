import type { Command } from 'commander';

export interface ExampleCommandOptions {
  content: string;
}

export async function exampleCommand(
  options: ExampleCommandOptions,
): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 100));
  console.info('Example command', options);
}

export function setupExampleCommand(program: Command): void {
  program
    .command('example')
    .description('Example command')
    .option('-c, --content <content>', 'Content to print')
    .action(async (options: ExampleCommandOptions) => {
      await exampleCommand(options);
    });
}
