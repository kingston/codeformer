import path from 'node:path';

import type { FileSystem, TransformContext } from './types.js';

export class TransformContextImpl implements TransformContext {
  constructor(
    public readonly fs: FileSystem,
    public readonly cwd: string,
  ) {}

  toSubdirectory(subdir: string): TransformContext {
    const newCwd = path.resolve(this.cwd, subdir);
    return new TransformContextImpl(this.fs, newCwd);
  }
}