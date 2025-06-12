import FastGlob from 'fast-glob';
import { promises as fs } from 'node:fs';
import * as nodeFs from 'node:fs';
import path from 'node:path';

import type { DirEntry, FileSystem, RmOptions } from './types.js';

import { mapFsError } from './utils.js';

export class RealFileSystem implements FileSystem {
  readonly isCaseSensitive = process.platform !== 'win32';

  cwd(): string {
    return process.cwd();
  }

  async readDir(dirPath: string): Promise<DirEntry[]> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      return entries.map((entry) => ({
        name: entry.name,
        path: path.join(dirPath, entry.name),
        isDirectory: entry.isDirectory(),
      }));
    } catch (err) {
      mapFsError(err, dirPath);
    }
  }

  readDirSync(dirPath: string): DirEntry[] {
    try {
      const entries = nodeFs.readdirSync(dirPath, { withFileTypes: true });
      return entries.map((entry) => ({
        name: entry.name,
        path: path.join(dirPath, entry.name),
        isDirectory: entry.isDirectory(),
      }));
    } catch (err) {
      mapFsError(err, dirPath);
    }
  }

  async mkdir(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (err) {
      mapFsError(err, dirPath);
    }
  }

  mkdirSync(dirPath: string): void {
    try {
      nodeFs.mkdirSync(dirPath, { recursive: true });
    } catch (err) {
      mapFsError(err, dirPath);
    }
  }

  async rm(targetPath: string, options?: RmOptions): Promise<void> {
    try {
      await fs.rm(targetPath, { recursive: options?.recursive ?? false });
    } catch (err) {
      mapFsError(err, targetPath);
    }
  }

  rmSync(targetPath: string, options?: RmOptions): void {
    try {
      nodeFs.rmSync(targetPath, { recursive: options?.recursive ?? false });
    } catch (err) {
      mapFsError(err, targetPath);
    }
  }

  async move(srcPath: string, destPath: string): Promise<void> {
    try {
      await fs.rename(srcPath, destPath);
    } catch (err) {
      mapFsError(err, srcPath);
    }
  }

  moveSync(srcPath: string, destPath: string): void {
    try {
      nodeFs.renameSync(srcPath, destPath);
    } catch (err) {
      mapFsError(err, srcPath);
    }
  }

  async copy(srcPath: string, destPath: string): Promise<void> {
    try {
      await fs.copyFile(srcPath, destPath);
    } catch (err) {
      mapFsError(err, srcPath);
    }
  }

  copySync(srcPath: string, destPath: string): void {
    try {
      nodeFs.copyFileSync(srcPath, destPath);
    } catch (err) {
      mapFsError(err, srcPath);
    }
  }

  async readFile(filePath: string): Promise<string> {
    try {
      return await fs.readFile(filePath, 'utf8');
    } catch (err) {
      mapFsError(err, filePath);
    }
  }

  readFileSync(filePath: string): string {
    try {
      return nodeFs.readFileSync(filePath, 'utf8');
    } catch (err) {
      mapFsError(err, filePath);
    }
  }

  async readBuffer(filePath: string): Promise<Buffer> {
    try {
      return await fs.readFile(filePath);
    } catch (err) {
      mapFsError(err, filePath);
    }
  }

  readBufferSync(filePath: string): Buffer {
    try {
      return nodeFs.readFileSync(filePath);
    } catch (err) {
      mapFsError(err, filePath);
    }
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    try {
      await fs.writeFile(filePath, content, 'utf8');
    } catch (err) {
      mapFsError(err, filePath);
    }
  }

  writeFileSync(filePath: string, content: string): void {
    try {
      nodeFs.writeFileSync(filePath, content, 'utf8');
    } catch (err) {
      mapFsError(err, filePath);
    }
  }

  async writeBuffer(filePath: string, data: Buffer): Promise<void> {
    try {
      await fs.writeFile(filePath, data);
    } catch (err) {
      mapFsError(err, filePath);
    }
  }

  writeBufferSync(filePath: string, data: Buffer): void {
    try {
      nodeFs.writeFileSync(filePath, data);
    } catch (err) {
      mapFsError(err, filePath);
    }
  }

  async exists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return false;
      }
      mapFsError(err, path);
    }
  }

  existsSync(path: string): boolean {
    try {
      nodeFs.accessSync(path);
      return true;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return false;
      }
      mapFsError(err, path);
    }
  }

  async glob(patterns: string | string[]): Promise<string[]> {
    try {
      const results = await FastGlob.async(patterns, {
        absolute: true,
        fs: nodeFs,
      });
      return results;
    } catch (err) {
      mapFsError(err, Array.isArray(patterns) ? patterns[0] : patterns);
    }
  }

  globSync(patterns: string | string[]): string[] {
    try {
      return FastGlob.sync(patterns, {
        absolute: true,
        fs: nodeFs,
      });
    } catch (err) {
      mapFsError(err, Array.isArray(patterns) ? patterns[0] : patterns);
    }
  }
}
