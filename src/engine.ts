import { createJiti } from 'jiti';
import path from 'node:path';

import type { TransformerModule } from './types.js';
import type { RunTransformerOptions } from './utils/options.js';

import { TransformContextImpl } from './context.js';
import {
  MemoryFileSystem,
  RealFileSystem,
} from './services/filesystem/index.js';
import { collectOptions } from './utils/options.js';

export async function runTransformer(
  transformerPath: string,
  options: RunTransformerOptions,
): Promise<void> {
  // Load the transformer
  const transformer = await loadTransformer(transformerPath);

  // Collect options from CLI
  const transformerOptions = await collectOptions(
    transformer.options ?? {},
    options.cliOptions,
  );

  // Create file system (real or memory-based for dry run)
  const fs = options.dryRun
    ? new MemoryFileSystem(options.cwd)
    : new RealFileSystem(options.cwd);

  // If dry run, seed memory filesystem with real files
  if (options.dryRun && fs instanceof MemoryFileSystem) {
    await seedMemoryFileSystem();
  }

  // Create transform context
  const context = new TransformContextImpl(fs, options.cwd);

  // Run the transformer
  console.info(`Running transformer: ${transformer.name}`);
  if (options.dryRun) {
    console.info('🔍 Dry run mode - no files will be modified');
  }

  try {
    await transformer.transform(context, transformerOptions);

    // In dry run mode, show what would be changed
    if (options.dryRun && fs instanceof MemoryFileSystem) {
      const operations = fs.getOperations();
      if (operations.length === 0) {
        console.info('✅ No changes would be made');
      } else {
        console.info(`\n📝 Would make ${operations.length} changes:`);
        for (const op of operations) {
          switch (op.type) {
            case 'write': {
              console.info(`  📄 Write: ${op.path}`);
              break;
            }
            case 'rename': {
              console.info(`  📝 Rename: ${op.path} → ${op.newPath}`);
              break;
            }
            case 'delete': {
              console.info(`  🗑️  Delete: ${op.path}`);
              break;
            }
          }
        }
      }
    } else {
      console.info('✅ Transformer completed successfully');
    }
  } catch (error) {
    console.error(
      '❌ Transformer failed:',
      error instanceof Error ? error.message : error,
    );
    throw error;
  }
}

async function loadTransformer(
  transformerPath: string,
): Promise<TransformerModule['default']> {
  try {
    // Check if it's a local file path
    if (
      transformerPath.startsWith('./') ||
      transformerPath.startsWith('../') ||
      transformerPath.startsWith('/')
    ) {
      const jiti = createJiti(import.meta.url, {
        moduleCache: false,
      });
      const module: TransformerModule = await jiti.import(
        path.resolve(transformerPath),
      );
      return module.default;
    }

    // Try to import as package
    const module: TransformerModule = (await import(
      transformerPath
    )) as TransformerModule;
    return module.default;
  } catch (error) {
    throw new Error(
      `Failed to load transformer "${transformerPath}": ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function seedMemoryFileSystem(): Promise<void> {
  // For dry run, we could seed with existing files that match common patterns
  // For now, we'll keep it simple and let transformers handle file reading from real FS when needed
  // This can be enhanced later to pre-populate based on glob patterns
}
