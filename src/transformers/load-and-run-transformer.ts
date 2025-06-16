import { applyStagedFileSystemDiff } from '#src/services/filesystem/staged/apply-staged-file-system-diff.js';
import { formatStagedDiff } from '#src/services/filesystem/staged/format-staged-diff.js';
import { resolveTransformerOptionsFromCliArgs } from '#src/services/index.js';

import type { TransformerContext, TransformerRunnerOptions } from './types.js';

import { StagedFileSystem } from '../services/filesystem/index.js';
import { loadTransformer } from './loader.js';

export const DEFAULT_IGNORED_GLOBS = ['**/node_modules/**', '**/.git/**'];

interface LoadAndRunTransformerOptions extends TransformerRunnerOptions {
  nonInteractive?: boolean;
}

export async function loadAndRunTransformer(
  transformerPath: string,
  transformerArgs: string[],
  options: LoadAndRunTransformerOptions,
): Promise<void> {
  const transformer = await loadTransformer(transformerPath);

  const transformerOptions = await resolveTransformerOptionsFromCliArgs(
    transformer.options ?? {},
    transformerArgs,
    {
      nonInteractive: options.nonInteractive,
    },
  );
  const cwd = options.cwd ?? process.cwd();

  const fs = new StagedFileSystem({
    ignoredGlobs: DEFAULT_IGNORED_GLOBS,
    cwd,
  });

  // Create transform context
  const context: TransformerContext = {
    fs,
    cwd,
  };

  // Run the transformer
  console.info(`Running transformer: ${transformer.name}`);
  if (options.dryRun) {
    console.info('🔍 Dry run mode - no files will be modified');
  }

  await transformer.transform(context, transformerOptions);

  // In dry run mode, show what would be changed
  if (options.dryRun) {
    const diff = fs.getDiff();
    const { totalChanges, formattedLines } = formatStagedDiff(diff);

    if (totalChanges === 0) {
      console.info('✅ No changes would be made');
    } else {
      console.info(`\n📝 Would make ${totalChanges} changes:`);
      for (const line of formattedLines) {
        console.info(line);
      }
    }
  } else {
    // Apply changes to real filesystem
    const diff = fs.getDiff();
    await applyStagedFileSystemDiff(diff);
  }
  console.info('✅ Transformer completed successfully');
}
