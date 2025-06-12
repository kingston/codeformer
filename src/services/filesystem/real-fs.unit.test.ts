import { vol } from 'memfs';
import * as nodeFs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { NotFoundError, PermissionDeniedError } from './errors.js';
import { RealFileSystem } from './real-fs.js';

vi.mock('node:fs');
vi.mock('node:fs/promises');

afterAll(() => {
  vol.reset();
});

describe('RealFileSystem', () => {
  let fs: RealFileSystem;
  const testDir = `/tmp`;

  beforeEach(() => {
    fs = new RealFileSystem();
    vol.reset();
    vol.fromJSON({
      [testDir]: null,
    });
  });

  it('should detect case sensitivity based on platform', () => {
    expect(fs.isCaseSensitive).toBe(process.platform !== 'win32');
  });

  it('should get current working directory', () => {
    expect(fs.cwd()).toBe(process.cwd());
  });

  it('should create and read directory', async () => {
    const dirPath = path.join(testDir, 'test-dir');
    await fs.mkdir(dirPath);
    const entries = await fs.readDir(testDir);
    expect(entries).toHaveLength(1);
    expect(entries[0].name).toBe('test-dir');
    expect(entries[0].isDirectory).toBe(true);
  });

  it('should write and read file', async () => {
    const filePath = path.join(testDir, 'test.txt');
    const content = 'Hello, World!';
    await fs.writeFile(filePath, content);
    const readContent = await fs.readFile(filePath);
    expect(readContent).toBe(content);
  });

  it('should write and read buffer', async () => {
    const filePath = path.join(testDir, 'test.bin');
    const data = Buffer.from([1, 2, 3, 4]);
    await fs.writeBuffer(filePath, data);
    const readData = await fs.readBuffer(filePath);
    expect(readData).toEqual(data);
  });

  it('should check if file exists', async () => {
    const filePath = path.join(testDir, 'test.txt');
    expect(await fs.exists(filePath)).toBe(false);
    await fs.writeFile(filePath, 'test');
    expect(await fs.exists(filePath)).toBe(true);
  });

  it('should move file', async () => {
    const srcPath = path.join(testDir, 'src.txt');
    const destPath = path.join(testDir, 'dest.txt');
    await fs.writeFile(srcPath, 'test');
    await fs.move(srcPath, destPath);
    expect(await fs.exists(srcPath)).toBe(false);
    expect(await fs.exists(destPath)).toBe(true);
    expect(await fs.readFile(destPath)).toBe('test');
  });

  it('should copy file', async () => {
    const srcPath = path.join(testDir, 'src.txt');
    const destPath = path.join(testDir, 'dest.txt');
    await fs.writeFile(srcPath, 'test');
    await fs.copy(srcPath, destPath);
    expect(await fs.exists(srcPath)).toBe(true);
    expect(await fs.exists(destPath)).toBe(true);
    expect(await fs.readFile(destPath)).toBe('test');
  });

  it('should remove file', async () => {
    const filePath = path.join(testDir, 'test.txt');
    await fs.writeFile(filePath, 'test');
    expect(await fs.exists(filePath)).toBe(true);
    await fs.rm(filePath);
    expect(await fs.exists(filePath)).toBe(false);
  });

  it('should find files using glob', async () => {
    const file1 = path.join(testDir, 'test1.txt');
    const file2 = path.join(testDir, 'test2.txt');
    await fs.writeFile(file1, 'test1');
    await fs.writeFile(file2, 'test2');
    const results = await fs.glob(path.join(testDir, '*.txt'));
    expect(results).toHaveLength(2);
    expect(results).toContain(file1);
    expect(results).toContain(file2);
  });

  describe('error handling', () => {
    it('should throw NotFoundError when file does not exist', async () => {
      const filePath = path.join(testDir, 'nonexistent.txt');
      await expect(fs.readFile(filePath)).rejects.toThrow(NotFoundError);
      expect(() => fs.readFileSync(filePath)).toThrow(NotFoundError);
    });

    it('should throw PermissionDeniedError when accessing restricted file', async () => {
      const filePath = path.join(testDir, 'restricted.txt');
      await fs.writeFile(filePath, 'test');
      // Make file read-only
      nodeFs.chmodSync(filePath, 0o000);
      await expect(fs.readFile(filePath)).rejects.toThrow(
        PermissionDeniedError,
      );
      expect(() => fs.readFileSync(filePath)).toThrow(PermissionDeniedError);
      // Restore permissions for cleanup
      nodeFs.chmodSync(filePath, 0o644);
    });
  });
});
