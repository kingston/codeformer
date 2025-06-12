/** Base class for all FS errors. */
export class FsError extends Error {}

/** Thrown when a file or directory doesn’t exist. */
export class NotFoundError extends FsError {
  readonly path: string;
  constructor(path: string) {
    super(`No such file or directory: ${path}`);
    this.path = path;
  }
}

/** Thrown when attempting to perform an operation on a directory. */
export class IllegalOperationOnDirectoryError extends FsError {
  readonly path: string;
  constructor(path: string) {
    super(`Illegal operation on a directory: ${path}`);
    this.path = path;
  }
}

/** Thrown when attempting to delete a non-empty directory. */
export class DirectoryNotEmptyError extends FsError {
  readonly path: string;
  constructor(path: string) {
    super(`Directory not empty: ${path}`);
    this.path = path;
  }
}

/** Thrown when you don’t have permission. */
export class PermissionDeniedError extends FsError {
  readonly path: string;
  constructor(path: string) {
    super(`Permission denied: ${path}`);
    this.path = path;
  }
}

/** Thrown when a target already exists. */
export class AlreadyExistsError extends FsError {
  readonly path: string;
  constructor(path: string) {
    super(`Already exists: ${path}`);
    this.path = path;
  }
}
