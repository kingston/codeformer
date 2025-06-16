import { describe, expect, it } from 'vitest';

import type { StagedFileSystemDiff } from './staged-file-system.js';

import { formatStagedDiff } from './format-staged-diff.js';
import { STAGED_FILE_SYSTEM_DIRECTORY_SYMBOL } from './staged-file-system.js';

describe('formatStagedDiff', () => {
  it('should return empty result for empty diff', () => {
    const diff: StagedFileSystemDiff = {
      originalPathMoveOperations: [],
      deletedOriginalPaths: [],
      stagedContentMap: new Map(),
    };

    const result = formatStagedDiff(diff);

    expect(result.totalChanges).toBe(0);
    expect(result.formattedLines).toEqual([]);
  });

  it('should format deleted paths', () => {
    const diff: StagedFileSystemDiff = {
      originalPathMoveOperations: [],
      deletedOriginalPaths: ['/tmp/file1.txt', '/tmp/file2.txt'],
      stagedContentMap: new Map(),
    };

    const result = formatStagedDiff(diff);

    expect(result.totalChanges).toBe(2);
    expect(result.formattedLines).toEqual([
      '  🗑️  Delete: /tmp/file1.txt',
      '  🗑️  Delete: /tmp/file2.txt',
    ]);
  });

  it('should format move operations', () => {
    const diff: StagedFileSystemDiff = {
      originalPathMoveOperations: [
        { type: 'move', srcPath: '/tmp/old.txt', destPath: '/tmp/new.txt' },
        { type: 'move', srcPath: '/tmp/dir1', destPath: '/tmp/dir2' },
      ],
      deletedOriginalPaths: [],
      stagedContentMap: new Map(),
    };

    const result = formatStagedDiff(diff);

    expect(result.totalChanges).toBe(2);
    expect(result.formattedLines).toEqual([
      '  📝 Move: /tmp/old.txt → /tmp/new.txt',
      '  📝 Move: /tmp/dir1 → /tmp/dir2',
    ]);
  });

  it('should format file writes', () => {
    const stagedContentMap = new Map<string, Buffer | typeof STAGED_FILE_SYSTEM_DIRECTORY_SYMBOL>();
    stagedContentMap.set('/tmp/file1.txt', Buffer.from('content1'));
    stagedContentMap.set('/tmp/file2.txt', Buffer.from('content2'));

    const diff: StagedFileSystemDiff = {
      originalPathMoveOperations: [],
      deletedOriginalPaths: [],
      stagedContentMap,
    };

    const result = formatStagedDiff(diff);

    expect(result.totalChanges).toBe(2);
    expect(result.formattedLines).toEqual([
      '  📄 Write file: /tmp/file1.txt',
      '  📄 Write file: /tmp/file2.txt',
    ]);
  });

  it('should format directory creation', () => {
    const stagedContentMap = new Map<string, Buffer | typeof STAGED_FILE_SYSTEM_DIRECTORY_SYMBOL>();
    stagedContentMap.set('/tmp/dir1', STAGED_FILE_SYSTEM_DIRECTORY_SYMBOL);
    stagedContentMap.set('/tmp/dir2', STAGED_FILE_SYSTEM_DIRECTORY_SYMBOL);

    const diff: StagedFileSystemDiff = {
      originalPathMoveOperations: [],
      deletedOriginalPaths: [],
      stagedContentMap,
    };

    const result = formatStagedDiff(diff);

    expect(result.totalChanges).toBe(2);
    expect(result.formattedLines).toEqual([
      '  📁 Create directory: /tmp/dir1',
      '  📁 Create directory: /tmp/dir2',
    ]);
  });

  it('should format mixed operations', () => {
    const stagedContentMap = new Map<string, Buffer | typeof STAGED_FILE_SYSTEM_DIRECTORY_SYMBOL>();
    stagedContentMap.set('/tmp/newfile.txt', Buffer.from('content'));
    stagedContentMap.set('/tmp/newdir', STAGED_FILE_SYSTEM_DIRECTORY_SYMBOL);

    const diff: StagedFileSystemDiff = {
      originalPathMoveOperations: [
        { type: 'move', srcPath: '/tmp/old.txt', destPath: '/tmp/moved.txt' },
      ],
      deletedOriginalPaths: ['/tmp/deleted.txt'],
      stagedContentMap,
    };

    const result = formatStagedDiff(diff);

    expect(result.totalChanges).toBe(4);
    expect(result.formattedLines).toEqual([
      '  🗑️  Delete: /tmp/deleted.txt',
      '  📝 Move: /tmp/old.txt → /tmp/moved.txt',
      '  📄 Write file: /tmp/newfile.txt',
      '  📁 Create directory: /tmp/newdir',
    ]);
  });
});