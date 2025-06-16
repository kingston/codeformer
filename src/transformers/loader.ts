import { createJiti } from 'jiti';
import path from 'node:path';

import { enhanceErrorWithContext } from '#src/utils/enhance-error-with-context.js';

import type { Transformer } from './types.js';

interface TransformerModule {
  default?: Transformer;
}

export async function loadTransformer(
  transformerPath: string,
): Promise<Transformer> {
  try {
    const jiti = createJiti(import.meta.url, {
      moduleCache: false,
    });
    const module: TransformerModule = await jiti.import(
      path.resolve(transformerPath),
    );
    if (!module.default) {
      throw new Error(`Transformer module does not export a default export`);
    }
    if (!module.default.name) {
      throw new Error(`Transformer module does not export a name`);
    }
    return module.default;
  } catch (error) {
    throw enhanceErrorWithContext(
      error,
      `Failed to load transformer "${transformerPath}"`,
    );
  }
}
