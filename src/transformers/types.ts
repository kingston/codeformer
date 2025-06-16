import type { FileSystem } from '#src/services/filesystem/types.js';
import type {
  InferTransformerOptions,
  TransformerOptions,
} from '#src/services/index.js';

export interface TransformerRunnerOptions {
  dryRun?: boolean;
  cwd?: string;
}

export interface TransformerContext {
  fs: FileSystem;
  cwd: string;
}

export interface Transformer<
  TOptions extends TransformerOptions = TransformerOptions,
> {
  name: string;
  description?: string;
  options?: TOptions;
  transform: (
    context: TransformerContext,
    options: InferTransformerOptions<TOptions>,
  ) => Promise<void>;
}
