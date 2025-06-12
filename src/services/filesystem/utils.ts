/**
 * Utility to map Node.js file system errors to custom FsError subclasses.
 */
import {
  AlreadyExistsError,
  DirectoryNotEmptyError,
  NotFoundError,
  PermissionDeniedError,
} from './errors.js';

/**
 * Convert a Node.js FS error into a custom FsError, then throw it.
 * @param err - Original Node.js error (should have a `code` property).
 * @param path - File or directory path related to the error.
 * @throws {FsError|Error} Custom FsError for known codes, original error otherwise.
 */
export function mapFsError(err: unknown, path: string): never {
  if (err instanceof Error && 'code' in err) {
    switch (err.code) {
      case 'ENOENT': {
        throw new NotFoundError(path);
      }
      case 'EACCES':
      case 'EPERM': {
        throw new PermissionDeniedError(path);
      }
      case 'ENOTEMPTY': {
        throw new DirectoryNotEmptyError(path);
      }
      case 'EEXIST': {
        throw new AlreadyExistsError(path);
      }
      default: {
        throw err;
      }
    }
  }
  throw err;
}
