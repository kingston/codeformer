import { vol } from 'memfs';
import path from 'node:path';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { NotFoundError } from '../errors.js';
import {
  STAGED_FILE_SYSTEM_DIRECTORY_SYMBOL,
  StagedFileSystem,
} from './staged-file-system.js';

vi.mock('node:fs');
vi.mock('node:fs/promises');

afterAll(() => {
  vol.reset();
});

describe('StagedFileSystem', () => {
  let stagedFs: StagedFileSystem;
  const testDir = '/tmp';

  beforeEach(() => {
    stagedFs = new StagedFileSystem({ cwd: testDir });
    vol.reset();
    vol.fromJSON({
      [testDir]: null,
      [`${testDir}/existing-file.txt`]: 'existing content',
      [`${testDir}/existing-dir`]: null,
      [`${testDir}/existing-dir/nested-file.txt`]: 'nested content',
    });
  });

  describe('basic operations', () => {
    it('should write and read file', async () => {
      const filePath = path.join(testDir, 'test.txt');
      const content = 'Hello, World!';
      await stagedFs.writeFile(filePath, content);
      const readContent = await stagedFs.readFile(filePath);
      expect(readContent).toBe(content);
    });

    it('should write and read buffer', async () => {
      const filePath = path.join(testDir, 'test.bin');
      const data = Buffer.from([1, 2, 3, 4]);
      await stagedFs.writeBuffer(filePath, data);
      const readData = await stagedFs.readBuffer(filePath);
      expect(readData).toEqual(data);
    });

    it('should create and read directory', async () => {
      const dirPath = path.join(testDir, 'test-dir');
      await stagedFs.mkdir(dirPath);
      const entries = await stagedFs.readDir(testDir);
      const testDirEntry = entries.find((e) => e.name === 'test-dir');
      expect(testDirEntry).toBeDefined();
      expect(testDirEntry?.isDirectory).toBe(true);
    });

    it('should create nested directories', async () => {
      const dirPath = path.join(testDir, 'nested', 'deep', 'path');
      await stagedFs.mkdir(dirPath);
      expect(await stagedFs.exists(dirPath)).toBe(true);
      expect(await stagedFs.exists(path.join(testDir, 'nested'))).toBe(true);
      expect(await stagedFs.exists(path.join(testDir, 'nested', 'deep'))).toBe(
        true,
      );
    });

    it('should read existing files from real filesystem', async () => {
      const content = await stagedFs.readFile(
        path.join(testDir, 'existing-file.txt'),
      );
      expect(content).toBe('existing content');
    });

    it('should merge real and staged directory entries', async () => {
      await stagedFs.writeFile(path.join(testDir, 'staged-file.txt'), 'staged');
      const entries = await stagedFs.readDir(testDir);

      const fileNames = entries.map((e) => e.name).sort();
      expect(fileNames).toEqual([
        'existing-dir',
        'existing-file.txt',
        'staged-file.txt',
      ]);
    });
  });

  describe('copy operations', () => {
    it('should copy file content', async () => {
      const srcPath = path.join(testDir, 'source.txt');
      const destPath = path.join(testDir, 'destination.txt');
      const content = 'copy test';

      await stagedFs.writeFile(srcPath, content);
      await stagedFs.copy(srcPath, destPath);

      expect(await stagedFs.readFile(destPath)).toBe(content);
      expect(await stagedFs.readFile(srcPath)).toBe(content); // Source should still exist
    });

    it('should copy from real filesystem', async () => {
      const destPath = path.join(testDir, 'copied-existing.txt');
      await stagedFs.copy(path.join(testDir, 'existing-file.txt'), destPath);

      expect(await stagedFs.readFile(destPath)).toBe('existing content');
    });
  });

  describe('move operations', () => {
    it('should move staged file but not register as move operation', async () => {
      const srcPath = path.join(testDir, 'src.txt');
      const destPath = path.join(testDir, 'dest.txt');
      await stagedFs.writeFile(srcPath, 'test');

      await stagedFs.move(srcPath, destPath);

      expect(await stagedFs.exists(destPath)).toBe(true);
      expect(await stagedFs.readFile(destPath)).toBe('test');

      // Staged files should NOT create move operations since they don't exist in original filesystem
      const moveOps = stagedFs.getMoveOperations();
      expect(moveOps).toHaveLength(0);
    });

    it('should move original file and register as move operation', async () => {
      const srcPath = path.join(testDir, 'existing-file.txt');
      const destPath = path.join(testDir, 'moved-existing.txt');

      await stagedFs.move(srcPath, destPath);

      expect(await stagedFs.exists(destPath)).toBe(true);
      expect(await stagedFs.readFile(destPath)).toBe('existing content');

      // Original files SHOULD create move operations
      const moveOps = stagedFs.getMoveOperations();
      expect(moveOps).toHaveLength(1);
      expect(moveOps[0].type).toBe('move');
      expect(moveOps[0].srcPath).toBe(path.resolve(testDir, 'existing-file.txt'));
      expect(moveOps[0].destPath).toBe(path.resolve(testDir, 'moved-existing.txt'));
    });

    it('should move directory and nested files', async () => {
      const srcDir = path.join(testDir, 'source-dir');
      const destDir = path.join(testDir, 'dest-dir');
      const nestedFile = path.join(srcDir, 'nested.txt');

      await stagedFs.mkdir(srcDir);
      await stagedFs.writeFile(nestedFile, 'nested content');

      await stagedFs.move(srcDir, destDir);

      expect(await stagedFs.exists(destDir)).toBe(true);
      expect(await stagedFs.exists(path.join(destDir, 'nested.txt'))).toBe(
        true,
      );
      expect(await stagedFs.readFile(path.join(destDir, 'nested.txt'))).toBe(
        'nested content',
      );
    });

    it('should throw NotFoundError when moving non-existent file', async () => {
      const srcPath = path.join(testDir, 'nonexistent.txt');
      const destPath = path.join(testDir, 'dest.txt');

      try {
        await stagedFs.move(srcPath, destPath);
        expect.fail('Expected move to throw NotFoundError');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundError);
        expect((error as NotFoundError).message).toContain(
          'No such file or directory',
        );
      }
    });

    it('should throw NotFoundError when moving to non-existent directory', async () => {
      const srcPath = path.join(testDir, 'src.txt');
      const destPath = path.join(testDir, 'nonexistent', 'dest.txt');
      await stagedFs.writeFile(srcPath, 'test');

      try {
        await stagedFs.move(srcPath, destPath);
        expect.fail('Expected move to throw NotFoundError');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundError);
        expect((error as NotFoundError).message).toContain(
          'No such file or directory',
        );
      }
    });
  });

  describe('delete operations', () => {
    it('should delete staged file', async () => {
      const filePath = path.join(testDir, 'test.txt');
      await stagedFs.writeFile(filePath, 'test');
      expect(await stagedFs.exists(filePath)).toBe(true);

      await stagedFs.rm(filePath);
      expect(await stagedFs.exists(filePath)).toBe(false);
    });

    it('should delete real file', async () => {
      const filePath = path.join(testDir, 'existing-file.txt');
      expect(await stagedFs.exists(filePath)).toBe(true);

      await stagedFs.rm(filePath);
      expect(await stagedFs.exists(filePath)).toBe(false);

      // Should be in deleted paths list
      const deletedPaths = stagedFs.getDeletedOriginalPaths();
      expect(deletedPaths).toContain(filePath);
    });

    it('should delete directory', async () => {
      const dirPath = path.join(testDir, 'test-dir');
      await stagedFs.mkdir(dirPath);
      await stagedFs.rm(dirPath);
      expect(await stagedFs.exists(dirPath)).toBe(false);
    });
  });

  describe('exists checks', () => {
    it('should return false for non-existent file', async () => {
      const filePath = path.join(testDir, 'nonexistent.txt');
      expect(await stagedFs.exists(filePath)).toBe(false);
    });

    it('should return true for existing real file', async () => {
      const filePath = path.join(testDir, 'existing-file.txt');
      expect(await stagedFs.exists(filePath)).toBe(true);
    });

    it('should return true for staged file', async () => {
      const filePath = path.join(testDir, 'test.txt');
      await stagedFs.writeFile(filePath, 'test');
      expect(await stagedFs.exists(filePath)).toBe(true);
    });

    it('should return false for deleted file', async () => {
      const filePath = path.join(testDir, 'existing-file.txt');
      await stagedFs.rm(filePath);
      expect(await stagedFs.exists(filePath)).toBe(false);
    });

    it('should work synchronously', () => {
      const filePath = path.join(testDir, 'existing-file.txt');
      expect(stagedFs.existsSync(filePath)).toBe(true);

      stagedFs.rmSync(filePath);
      expect(stagedFs.existsSync(filePath)).toBe(false);
    });
  });

  describe('glob operations', () => {
    beforeEach(async () => {
      // Create test file structure
      await stagedFs.writeFile(path.join(testDir, 'file1.txt'), 'content1');
      await stagedFs.writeFile(path.join(testDir, 'file2.js'), 'content2');
      await stagedFs.mkdir(path.join(testDir, 'subdir'));
      await stagedFs.writeFile(
        path.join(testDir, 'subdir', 'file3.txt'),
        'content3',
      );
      await stagedFs.writeFile(
        path.join(testDir, 'subdir', 'file4.js'),
        'content4',
      );
    });

    it('should match files by extension', async () => {
      const txtFiles = await stagedFs.glob('**/*.txt');
      const relativeFiles = txtFiles
        .map((f) => path.relative(testDir, f))
        .sort();
      expect(relativeFiles).toEqual([
        'existing-dir/nested-file.txt',
        'existing-file.txt',
        'file1.txt',
        'subdir/file3.txt',
      ]);
    });

    it('should match files with multiple patterns', async () => {
      const files = await stagedFs.glob(['**/*.txt', '**/*.js']);
      expect(files.length).toBeGreaterThan(0);

      const relativeFiles = files.map((f) => path.relative(testDir, f)).sort();
      expect(relativeFiles).toContain('file1.txt');
      expect(relativeFiles).toContain('file2.js');
    });

    it('should work synchronously', () => {
      const txtFiles = stagedFs.globSync('**/*.txt');
      expect(txtFiles.length).toBeGreaterThan(0);
    });

    it('should respect ignored globs', () => {
      const stagedFsWithIgnore = new StagedFileSystem({
        cwd: testDir,
        ignoredGlobs: ['**/*.js'],
      });

      const allFiles = stagedFsWithIgnore.globSync('**/*');
      const relativeFiles = allFiles.map((f) => path.relative(testDir, f));

      // Should not include .js files
      expect(relativeFiles.some((f) => f.endsWith('.js'))).toBe(false);
      // Should include .txt files
      expect(relativeFiles.some((f) => f.endsWith('.txt'))).toBe(true);
    });
  });

  describe('path resolution', () => {
    it('should prevent access outside working directory', async () => {
      const outsidePath = '/outside/file.txt';

      try {
        await stagedFs.writeFile(outsidePath, 'test');
        expect.fail('Expected writeFile to throw error for outside path');
      } catch (error) {
        expect((error as Error).message).toContain(
          'Cannot resolve path outside of working directory',
        );
      }
    });

    it('should handle relative paths correctly', async () => {
      const filePath = 'relative-file.txt';
      await stagedFs.writeFile(filePath, 'content');
      expect(await stagedFs.readFile(filePath)).toBe('content');
    });
  });

  describe('staged content inspection', () => {
    it('should provide access to staged content map', async () => {
      const filePath = path.join(testDir, 'test.txt');
      await stagedFs.writeFile(filePath, 'test content');

      const stagedMap = stagedFs.getStagedContentMap();
      expect(stagedMap.size).toBeGreaterThan(0);

      const resolvedPath = path.resolve(testDir, 'test.txt');
      expect(stagedMap.has(resolvedPath)).toBe(true);
    });

    it('should track directory symbols correctly', async () => {
      const dirPath = path.join(testDir, 'test-dir');
      await stagedFs.mkdir(dirPath);

      const stagedMap = stagedFs.getStagedContentMap();
      const resolvedPath = path.resolve(testDir, 'test-dir');

      expect(stagedMap.get(resolvedPath)).toBe(
        STAGED_FILE_SYSTEM_DIRECTORY_SYMBOL,
      );
    });

    it('should provide access to deleted paths', async () => {
      const filePath = path.join(testDir, 'existing-file.txt');
      await stagedFs.rm(filePath);

      const deletedPaths = stagedFs.getDeletedOriginalPaths();
      expect(deletedPaths).toContain(filePath);
    });

    it('should provide access to move operations for original files only', async () => {
      // Test 1: Staged file move should NOT create move operation
      const stagedSrcPath = path.join(testDir, 'staged-src.txt');
      const stagedDestPath = path.join(testDir, 'staged-dest.txt');

      await stagedFs.writeFile(stagedSrcPath, 'staged content');
      await stagedFs.move(stagedSrcPath, stagedDestPath);

      let moveOps = stagedFs.getMoveOperations();
      expect(moveOps).toHaveLength(0);

      // Test 2: Original file move SHOULD create move operation  
      const originalSrcPath = path.join(testDir, 'existing-file.txt');
      const originalDestPath = path.join(testDir, 'moved-existing.txt');

      await stagedFs.move(originalSrcPath, originalDestPath);

      moveOps = stagedFs.getMoveOperations();
      expect(moveOps).toHaveLength(1);
      expect(moveOps[0].type).toBe('move');
      expect(moveOps[0].srcPath).toBe(path.resolve(testDir, 'existing-file.txt'));
      expect(moveOps[0].destPath).toBe(path.resolve(testDir, 'moved-existing.txt'));
    });
  });

  describe('error handling', () => {
    it('should throw NotFoundError when reading non-existent file', async () => {
      await expect(
        stagedFs.readFile(path.join(testDir, 'nonexistent.txt')),
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError when reading non-existent directory', async () => {
      await expect(
        stagedFs.readDir(path.join(testDir, 'nonexistent-dir')),
      ).rejects.toThrow(NotFoundError);
    });

    it('should handle gracefully when globbing unreadable directories', () => {
      // This tests the error handling in collectAllFiles
      const files = stagedFs.globSync('**/*');
      expect(Array.isArray(files)).toBe(true);
    });
  });

  describe('case sensitivity', () => {
    it('should report case sensitivity from real filesystem', () => {
      expect(typeof stagedFs.isCaseSensitive).toBe('boolean');
    });
  });

  describe('working directory', () => {
    it('should return working directory', () => {
      expect(stagedFs.cwd()).toBe(testDir);
    });

    it('should use custom working directory', () => {
      const customDir = '/custom';
      const customFs = new StagedFileSystem({ cwd: customDir });
      expect(customFs.cwd()).toBe(customDir);
    });
  });
});
