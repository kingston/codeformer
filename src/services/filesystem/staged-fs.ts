import FastGlob from 'fast-glob';
import micromatch from 'micromatch';
import path from 'node:path';

import { handleNotFoundError } from '#src/utils/handle-not-found-error.js';

import type { DirEntry, FileSystem } from './types.js';

import { IllegalOperationOnDirectoryError, NotFoundError } from './errors.js';
import { RealFileSystem } from './real-fs.js';

interface StagedFsMoveOperation {
  type: 'move';
  srcPath: string;
  destPath: string;
}

interface StagedFileSystemOptions {
  /**
   * The current working directory of the staged filesystem. If not provided,
   * the current working directory of the process will be used.
   */
  cwd?: string;
  /**
   * Paths that are ignored by the staged filesystem. Any paths that match these
   * cannot be written to or read from.
   */
  ignoredGlobs?: string[];
}

export const STAGED_FILE_SYSTEM_DIRECTORY_SYMBOL = Symbol('directory');

export class StagedFileSystem implements FileSystem {
  private moveOperations: StagedFsMoveOperation[] = [];
  private readonly realFs: RealFileSystem;

  /**
   * Map of staged paths to contents or directory symbol.
   *
   * If the value is a directory symbol, the path is a directory.
   */
  private stagedPathToContentMap = new Map<
    string,
    Buffer | typeof STAGED_FILE_SYSTEM_DIRECTORY_SYMBOL
  >();
  /** Map of moved paths to original paths */
  private movedPathToOriginalPathMap = new Map<string, string>();
  /** Original paths that are deleted by the staged filesystem */
  private readonly deletedOriginalPaths = new Set<string>();

  private readonly workingDir: string;
  private readonly ignoredGlobs: string[];

  public constructor(options: StagedFileSystemOptions = {}) {
    this.workingDir = options.cwd ?? process.cwd();
    this.ignoredGlobs = options.ignoredGlobs ?? [];

    this.realFs = new RealFileSystem({ cwd: this.workingDir });
  }

  get isCaseSensitive(): boolean {
    return this.realFs.isCaseSensitive;
  }

  cwd(): string {
    return this.realFs.cwd();
  }

  private resolvePath(filePath: string): string {
    const resolvedPath = path.resolve(this.workingDir, filePath);
    // Check if file path is outside of working directory
    if (!resolvedPath.startsWith(this.workingDir)) {
      throw new Error(
        `Cannot resolve path outside of working directory: ${filePath}`,
      );
    }

    return resolvedPath;
  }

  private resolveOriginalPath(stagedPath: string): string {
    const resolvedPath = this.resolvePath(stagedPath);
    return this.movedPathToOriginalPathMap.get(resolvedPath) ?? resolvedPath;
  }

  private isPathDeleted(stagedPath: string): boolean {
    const originalPath =
      this.movedPathToOriginalPathMap.get(stagedPath) ?? stagedPath;

    return this.deletedOriginalPaths.has(originalPath);
  }

  private listFilesInStagedDir(dirPath: string): DirEntry[] {
    return [...this.stagedPathToContentMap]
      .filter(([stagedPath]) => path.dirname(stagedPath) === dirPath)
      .map(
        ([stagedPath, content]): DirEntry => ({
          name: path.basename(stagedPath),
          path: stagedPath,
          isDirectory: content === STAGED_FILE_SYSTEM_DIRECTORY_SYMBOL,
        }),
      );
  }

  private rewriteOriginalPathToMovedPath(originalPath: string): string {
    for (const [movedPath, originalPathEntry] of this
      .movedPathToOriginalPathMap) {
      if (originalPath === originalPathEntry) {
        return movedPath;
      }
    }

    return originalPath;
  }

  mergeDirectoryEntries(
    dirPath: string,
    realEntries: DirEntry[] = [],
  ): DirEntry[] {
    const stagedEntries = this.listFilesInStagedDir(dirPath);
    return [
      ...realEntries
        .filter(
          (entry) =>
            !stagedEntries.some(
              (stagedEntry) => stagedEntry.name === entry.name,
            ) && !this.isPathDeleted(entry.path),
        )
        .map((entry) => ({
          ...entry,
          path: this.rewriteOriginalPathToMovedPath(entry.path),
        })),
      ...stagedEntries,
    ];
  }

  async readDir(dirPath: string): Promise<DirEntry[]> {
    if (!(await this.exists(dirPath))) {
      throw new NotFoundError(dirPath);
    }

    const realEntries = await this.realFs
      .readDir(this.resolveOriginalPath(dirPath))
      .catch(handleNotFoundError);
    return this.mergeDirectoryEntries(dirPath, realEntries);
  }

  readDirSync(dirPath: string): DirEntry[] {
    if (!this.existsSync(dirPath)) {
      throw new NotFoundError(dirPath);
    }

    let realEntries: DirEntry[] = [];
    try {
      realEntries = this.realFs.readDirSync(this.resolveOriginalPath(dirPath));
    } catch (error) {
      if (!(error instanceof NotFoundError)) {
        throw error;
      }
    }

    return this.mergeDirectoryEntries(dirPath, realEntries);
  }

  mkdir(dirPath: string): Promise<void> {
    this.mkdirSync(dirPath);
    return Promise.resolve();
  }

  mkdirSync(dirPath: string): void {
    // recursively create directories
    let dirname = this.resolvePath(dirPath);
    while (dirname !== this.workingDir) {
      if (this.existsSync(dirname)) break;
      this.stagedPathToContentMap.set(
        dirname,
        STAGED_FILE_SYSTEM_DIRECTORY_SYMBOL,
      );
      dirname = path.dirname(dirname);
    }
  }

  rm(targetPath: string): Promise<void> {
    this.rmSync(targetPath);
    return Promise.resolve();
  }

  rmSync(targetPath: string): void {
    const originalPath = this.resolveOriginalPath(targetPath);
    this.stagedPathToContentMap.delete(this.resolvePath(targetPath));
    this.deletedOriginalPaths.add(originalPath);
  }

  move(srcPath: string, destPath: string): Promise<void> {
    this.moveSync(srcPath, destPath);
    return Promise.resolve();
  }

  moveSync(srcPath: string, destPath: string): void {
    const resolvedSrcPath = this.resolvePath(srcPath);
    const resolvedDestPath = this.resolvePath(destPath);

    if (!this.existsSync(resolvedSrcPath)) {
      throw new NotFoundError(resolvedSrcPath);
    }

    if (!this.existsSync(path.dirname(resolvedDestPath))) {
      throw new NotFoundError(path.dirname(resolvedDestPath));
    }

    // Make sure we track all paths inside the source path
    const originalSrcPath = this.resolveOriginalPath(resolvedSrcPath);
    const paths = FastGlob.sync('**', {
      ignore: this.ignoredGlobs,
      cwd: originalSrcPath,
      stats: true,
      absolute: true,
    });

    for (const pathEntry of paths) {
      this.movedPathToOriginalPathMap.set(
        path.join(resolvedDestPath, pathEntry.name),
        pathEntry.path,
      );
    }

    // Queue the move operation for later execution
    this.moveOperations.push({
      type: 'move',
      srcPath: resolvedSrcPath,
      destPath: resolvedDestPath,
    });

    // Also apply the move to the staged filesystem immediately
    this.executeMoveOperation(resolvedSrcPath, resolvedDestPath);
  }

  private executeMoveOperation(srcPath: string, destPath: string): void {
    // Update all nested paths (for directories and their contents)
    this.updateNestedPathMappings(srcPath, destPath);
  }

  private updateNestedPathMappings(
    oldBasePath: string,
    newBasePath: string,
  ): void {
    function renameMapKeys(map: Map<string, unknown>): void {
      const entries = [...map];
      for (const [key, value] of entries) {
        if (key.startsWith(oldBasePath + path.sep) || key === oldBasePath) {
          map.delete(key);
          const newKey = path.join(
            newBasePath,
            path.relative(oldBasePath, key),
          );
          map.set(newKey, value);
        }
      }
    }

    renameMapKeys(this.movedPathToOriginalPathMap);
    renameMapKeys(this.stagedPathToContentMap);
  }

  async copy(srcPath: string, destPath: string): Promise<void> {
    const content = await this.readBuffer(srcPath);
    await this.writeBuffer(destPath, content);
  }

  copySync(srcPath: string, destPath: string): void {
    const content = this.readBufferSync(srcPath);
    this.writeBufferSync(destPath, content);
  }

  async readFile(filePath: string): Promise<string> {
    const content = await this.readBuffer(filePath);
    return content.toString('utf8');
  }

  readFileSync(filePath: string): string {
    const content = this.readBufferSync(filePath);
    return content.toString('utf8');
  }

  readBufferStaged(resolvedPath: string): Buffer | undefined {
    const content = this.stagedPathToContentMap.get(resolvedPath);
    if (content === STAGED_FILE_SYSTEM_DIRECTORY_SYMBOL) {
      throw new IllegalOperationOnDirectoryError(resolvedPath);
    }
    return content;
  }

  async readBuffer(filePath: string): Promise<Buffer> {
    const resolvedPath = this.resolvePath(filePath);
    const content = this.readBufferStaged(resolvedPath);
    if (content) return content;

    const realPath = this.resolveOriginalPath(resolvedPath);
    return await this.realFs.readBuffer(realPath);
  }

  readBufferSync(filePath: string): Buffer {
    const resolvedPath = this.resolvePath(filePath);
    const content = this.readBufferStaged(resolvedPath);
    if (content) return content;

    const realPath = this.resolveOriginalPath(resolvedPath);
    return this.realFs.readBufferSync(realPath);
  }

  writeFile(filePath: string, content: string): Promise<void> {
    this.writeFileSync(filePath, content);
    return Promise.resolve();
  }

  writeFileSync(filePath: string, content: string): void {
    this.writeBufferSync(filePath, Buffer.from(content, 'utf8'));
  }

  writeBuffer(filePath: string, data: Buffer): Promise<void> {
    this.writeBufferSync(filePath, data);
    return Promise.resolve();
  }

  writeBufferSync(filePath: string, data: Buffer): void {
    // Remove any original path that may have been deleted
    const originalPath = this.resolveOriginalPath(filePath);
    this.deletedOriginalPaths.delete(originalPath);

    this.mkdirSync(path.dirname(filePath));

    this.stagedPathToContentMap.set(this.resolvePath(filePath), data);
  }

  existsStaged(resolvedPath: string, originalPath: string): boolean {
    if (this.deletedOriginalPaths.has(originalPath)) {
      return false;
    }

    return this.stagedPathToContentMap.has(resolvedPath);
  }

  async exists(path: string): Promise<boolean> {
    const originalPath = this.resolveOriginalPath(path);
    const resolvedPath = this.resolvePath(path);

    // Check if the file is explicitly deleted
    if (this.deletedOriginalPaths.has(originalPath)) {
      return false;
    }

    // Check if it exists in staged content
    if (this.stagedPathToContentMap.has(resolvedPath)) {
      return true;
    }

    return this.realFs.exists(originalPath);
  }

  existsSync(path: string): boolean {
    const originalPath = this.resolveOriginalPath(path);
    const resolvedPath = this.resolvePath(path);

    // Check if the file is explicitly deleted
    if (this.deletedOriginalPaths.has(originalPath)) {
      return false;
    }

    // Check if it exists in staged content
    if (this.stagedPathToContentMap.has(resolvedPath)) {
      return true;
    }

    return this.realFs.existsSync(originalPath);
  }

  glob(patterns: string | string[]): Promise<string[]> {
    return Promise.resolve(this.globSync(patterns));
  }

  globSync(patterns: string | string[]): string[] {
    const patternArray = Array.isArray(patterns) ? patterns : [patterns];
    const matchedFiles: string[] = [];

    const collectAndFilter = (dirPath: string): void => {
      const entries = this.readDirSync(dirPath);

      for (const entry of entries) {
        if (entry.isDirectory) {
          collectAndFilter(entry.path);
        } else {
          const relativePath = path.relative(this.workingDir, entry.path);

          // Skip if file should be ignored
          if (
            this.ignoredGlobs.length > 0 &&
            micromatch.isMatch(relativePath, this.ignoredGlobs)
          ) {
            continue;
          }

          // Add file if it matches any pattern
          if (micromatch.isMatch(relativePath, patternArray)) {
            matchedFiles.push(entry.path);
          }
        }
      }
    };

    collectAndFilter(this.workingDir);
    return matchedFiles;
  }

  getMoveOperations(): StagedFsMoveOperation[] {
    return this.moveOperations;
  }

  getStagedContentMap(): Map<
    string,
    Buffer | typeof STAGED_FILE_SYSTEM_DIRECTORY_SYMBOL
  > {
    return this.stagedPathToContentMap;
  }

  getDeletedOriginalPaths(): string[] {
    return [...this.deletedOriginalPaths];
  }
}
