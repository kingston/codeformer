import fs from 'node:fs/promises';

import { enhanceErrorWithContext } from '#src/utils/enhance-error-with-context.js';

import type { StagedFileSystemDiff } from './staged-file-system.js';

import { STAGED_FILE_SYSTEM_DIRECTORY_SYMBOL } from './staged-file-system.js';

/**
 * Applies a staged filesystem diff to the real filesystem.
 *
 * This function performs the following operations in order:
 * 1. Delete files/directories in the deleted paths list
 * 2. Apply move operations sequentially
 * 3. Write all staged content (files and create directories)
 *
 * @param diff The staged filesystem diff to apply
 * @param realFs The real filesystem to apply changes to
 */
export async function applyStagedFileSystemDiff(
  diff: StagedFileSystemDiff,
): Promise<void> {
  // Step 1: Delete files and directories
  for (const deletedPath of diff.deletedOriginalPaths) {
    try {
      await fs.rm(deletedPath, { recursive: true, force: true });
    } catch (err) {
      throw enhanceErrorWithContext(
        err,
        `Failed to delete path: ${deletedPath}`,
      );
    }
  }

  // Step 2: Apply move operations sequentially
  for (const moveOp of diff.originalPathMoveOperations) {
    try {
      await fs.rename(moveOp.srcPath, moveOp.destPath);
    } catch (err) {
      throw enhanceErrorWithContext(
        err,
        `Failed to move path from ${moveOp.srcPath} to ${moveOp.destPath}`,
      );
    }
  }

  // Step 3: Write staged content (files and directories)
  const stagedContentFiles = [...diff.stagedContentMap.entries()].toSorted(
    (a, b) => a[0].localeCompare(b[0]),
  );
  for (const [stagedPath, content] of stagedContentFiles) {
    if (content === STAGED_FILE_SYSTEM_DIRECTORY_SYMBOL) {
      try {
        // Create directory
        await fs.mkdir(stagedPath, { recursive: true });
      } catch (err) {
        throw enhanceErrorWithContext(
          err,
          `Failed to create directory: ${stagedPath}`,
        );
      }
    } else {
      // Write the file content
      try {
        await fs.writeFile(stagedPath, content);
      } catch (err) {
        throw enhanceErrorWithContext(
          err,
          `Failed to write file: ${stagedPath}`,
        );
      }
    }
  }
}
