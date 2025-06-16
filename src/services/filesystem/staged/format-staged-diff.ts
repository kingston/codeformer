import type { StagedFileSystemDiff } from './staged-file-system.js';

import { STAGED_FILE_SYSTEM_DIRECTORY_SYMBOL } from './staged-file-system.js';

/**
 * Result of formatting a staged filesystem diff.
 */
export interface FormattedDiffResult {
  totalChanges: number;
  formattedLines: string[];
}

/**
 * Formats a staged filesystem diff into human-readable lines.
 * 
 * @param diff The staged filesystem diff to format
 * @returns An object containing the total number of changes and formatted lines
 */
export function formatStagedDiff(diff: StagedFileSystemDiff): FormattedDiffResult {
  const formattedLines: string[] = [];
  
  const totalChanges =
    diff.originalPathMoveOperations.length +
    diff.deletedOriginalPaths.length +
    diff.stagedContentMap.size;

  if (totalChanges === 0) {
    return { totalChanges, formattedLines };
  }

  // Show deleted files
  for (const deletedPath of diff.deletedOriginalPaths) {
    formattedLines.push(`  🗑️  Delete: ${deletedPath}`);
  }

  // Show move operations
  for (const moveOp of diff.originalPathMoveOperations) {
    formattedLines.push(`  📝 Move: ${moveOp.srcPath} → ${moveOp.destPath}`);
  }

  // Show written/created files and directories
  for (const [stagedPath, content] of diff.stagedContentMap) {
    if (content === STAGED_FILE_SYSTEM_DIRECTORY_SYMBOL) {
      formattedLines.push(`  📁 Create directory: ${stagedPath}`);
    } else {
      formattedLines.push(`  📄 Write file: ${stagedPath}`);
    }
  }

  return { totalChanges, formattedLines };
}