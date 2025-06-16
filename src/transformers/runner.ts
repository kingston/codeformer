import type {
  InferTransformerOptions,
  StagedFileSystemDiff,
  TransformerOptions,
} from '#src/services/index.js';

import { StagedFileSystem } from '#src/services/index.js';
import { enhanceErrorWithContext } from '#src/utils/enhance-error-with-context.js';

import type { Transformer, TransformerContext } from './types.js';

import { DEFAULT_IGNORED_GLOBS } from './load-and-run-transformer.js';

interface RunTransformOptions {
  cwd?: string;
}

export async function runTransformer<
  TOptions extends TransformerOptions = TransformerOptions,
>(
  transformer: Transformer<TOptions>,
  options: InferTransformerOptions<TOptions>,
  runnerOptions: RunTransformOptions = {},
): Promise<StagedFileSystemDiff> {
  const cwd = runnerOptions.cwd ?? process.cwd();

  const fs = new StagedFileSystem({
    ignoredGlobs: DEFAULT_IGNORED_GLOBS,
    cwd,
  });

  // Create transform context
  const context: TransformerContext = {
    fs,
    cwd,
  };

  // Validate options
  const optionFields = transformer.options ?? {};
  const newOptions: Record<string, unknown> = {};
  if (transformer.options) {
    const unknownOptions = Object.keys(options).filter(
      (key) => !(key in optionFields),
    );
    if (unknownOptions.length > 0) {
      throw new TypeError(
        `Unknown options for transformer "${transformer.name}": ${unknownOptions.join(', ')}`,
      );
    }
    for (const [key, field] of Object.entries(transformer.options)) {
      const value = options[key];
      if (value === undefined) {
        if (field.required) {
          throw new TypeError(
            `Missing required option "${key}" for transformer "${transformer.name}"`,
          );
        }
        continue; // Skip optional fields that are not provided
      }
      try {
        newOptions[key] = field.validate(value) as unknown;
      } catch (error) {
        throw enhanceErrorWithContext(
          error,
          `Invalid value for option "${key}" in transformer "${transformer.name}"`,
        );
      }
    }
  }

  await transformer.transform(
    context,
    newOptions as InferTransformerOptions<TOptions>,
  );

  return fs.getDiff();
}
