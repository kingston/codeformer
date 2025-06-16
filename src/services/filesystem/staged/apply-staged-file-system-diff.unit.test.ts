import { vol } from 'memfs';
import path from 'node:path';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { RealFileSystem } from '../real-file-system.js';
import { applyStagedFileSystemDiff } from './apply-staged-file-system-diff.js';
import {
  STAGED_FILE_SYSTEM_DIRECTORY_SYMBOL,
  StagedFileSystem,
} from './staged-file-system.js';

vi.mock('node:fs');
vi.mock('node:fs/promises');

afterAll(() => {
  vol.reset();
});

describe('applyStagedFileSystemDiff', () => {
  let stagedFs: StagedFileSystem;
  let realFs: RealFileSystem;
  const testDir = '/tmp';

  beforeEach(() => {
    stagedFs = new StagedFileSystem({ cwd: testDir });
    realFs = new RealFileSystem({ cwd: testDir });
    vol.reset();
    vol.fromJSON({
      [testDir]: null,
      [`${testDir}/existing-file.txt`]: 'existing content',
      [`${testDir}/existing-dir`]: null,
      [`${testDir}/existing-dir/nested-file.txt`]: 'nested content',
    });
  });

  it('should apply all changes to real filesystem', async () => {
    // Setup: Create initial state in staged filesystem
    await stagedFs.writeFile(path.join(testDir, 'new-file.txt'), 'new content');
    await stagedFs.mkdir(path.join(testDir, 'new-dir'));
    await stagedFs.writeFile(path.join(testDir, 'src.txt'), 'source');
    await stagedFs.move(
      path.join(testDir, 'src.txt'),
      path.join(testDir, 'moved.txt'),
    );
    await stagedFs.rm(path.join(testDir, 'existing-file.txt'));

    // Get the diff
    const diff = stagedFs.getDiff();

    // Apply the diff to real filesystem
    await applyStagedFileSystemDiff(diff);

    // Verify changes were applied
    expect(await realFs.exists(path.join(testDir, 'new-file.txt'))).toBe(true);
    expect(await realFs.readFile(path.join(testDir, 'new-file.txt'))).toBe(
      'new content',
    );
    expect(await realFs.exists(path.join(testDir, 'new-dir'))).toBe(true);
    expect(await realFs.exists(path.join(testDir, 'moved.txt'))).toBe(true);
    expect(await realFs.exists(path.join(testDir, 'existing-file.txt'))).toBe(
      false,
    );
  });

  it('should handle empty diff gracefully', async () => {
    const emptyDiff = {
      originalPathMoveOperations: [],
      deletedOriginalPaths: [],
      stagedContentMap: new Map(),
    };

    // Should not throw
    await expect(applyStagedFileSystemDiff(emptyDiff)).resolves.toBeUndefined();
  });

  it('should create nested directories when writing files', async () => {
    const nestedFilePath = path.join(testDir, 'deep', 'nested', 'file.txt');
    const stagedContentMap = new Map();
    stagedContentMap.set(nestedFilePath, Buffer.from('nested content'));
    stagedContentMap.set(
      path.join(testDir, 'deep', 'nested'),
      STAGED_FILE_SYSTEM_DIRECTORY_SYMBOL,
    );
    stagedContentMap.set(
      path.join(testDir, 'deep'),
      STAGED_FILE_SYSTEM_DIRECTORY_SYMBOL,
    );

    const diff = {
      originalPathMoveOperations: [],
      deletedOriginalPaths: [],
      stagedContentMap,
    };

    await applyStagedFileSystemDiff(diff);

    expect(await realFs.exists(nestedFilePath)).toBe(true);
    expect(await realFs.readFile(nestedFilePath)).toBe('nested content');
  });

  it('should handle directories correctly', async () => {
    const dirPath = path.join(testDir, 'test-async-dir');
    const stagedContentMap = new Map();
    stagedContentMap.set(dirPath, STAGED_FILE_SYSTEM_DIRECTORY_SYMBOL);

    const diff = {
      originalPathMoveOperations: [],
      deletedOriginalPaths: [],
      stagedContentMap,
    };

    await applyStagedFileSystemDiff(diff);

    expect(await realFs.exists(dirPath)).toBe(true);
  });

  it('should produce applicable diff from staged operations', async () => {
    // Perform various operations
    await stagedFs.writeFile(
      path.join(testDir, 'integration-file.txt'),
      'test',
    );
    await stagedFs.mkdir(path.join(testDir, 'integration-dir'));
    await stagedFs.writeFile(path.join(testDir, 'to-move.txt'), 'move me');
    await stagedFs.move(
      path.join(testDir, 'to-move.txt'),
      path.join(testDir, 'moved-file.txt'),
    );
    await stagedFs.rm(path.join(testDir, 'existing-file.txt'));

    // Get diff and apply it
    const diff = stagedFs.getDiff();
    await applyStagedFileSystemDiff(diff);

    // Verify final state
    expect(
      await realFs.exists(path.join(testDir, 'integration-file.txt')),
    ).toBe(true);
    expect(await realFs.exists(path.join(testDir, 'integration-dir'))).toBe(
      true,
    );
    expect(await realFs.exists(path.join(testDir, 'moved-file.txt'))).toBe(
      true,
    );
    expect(await realFs.exists(path.join(testDir, 'to-move.txt'))).toBe(false);
    expect(await realFs.exists(path.join(testDir, 'existing-file.txt'))).toBe(
      false,
    );
  });
});
