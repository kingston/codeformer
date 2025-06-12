/**
 * Represents a file or directory entry in the file system.
 */
export interface DirEntry {
  /**
   * The base name of the entry (no path separators).
   */
  name: string;

  /**
   * The absolute path to the entry.
   */
  path: string;

  /**
   * True if the entry is a directory; false if it is a file.
   */
  isDirectory: boolean;
}

export interface RmOptions {
  /**
   * If true, the directory will be removed recursively.
   */
  recursive?: boolean;
}

/**
 * Standardized file system abstraction for interacting with the file system.
 */
export interface FileSystem {
  /**
   * True if this file system treats paths case-sensitively.
   */
  readonly isCaseSensitive: boolean;

  /**
   * Returns the current working directory (absolute path).
   */
  cwd(): string;

  // --- Directory operations ---

  /**
   * Reads all entries in a directory. Includes dot-files by default.
   * @param dirPath - Path to the directory (absolute or relative).
   * @returns Array of directory entries with absolute paths.
   */
  readDir(dirPath: string): Promise<DirEntry[]>;

  /**
   * Synchronous version of readDir.
   */
  readDirSync(dirPath: string): DirEntry[];

  /**
   * Creates a directory, including parents if needed.
   * @param dirPath - Path to create (absolute or relative).
   */
  mkdir(dirPath: string): Promise<void>;

  /**
   * Synchronous version of mkdir.
   */
  mkdirSync(dirPath: string): void;

  /**
   * Removes a file or directory.
   * @param targetPath - Path to delete.
   * @param options - Options for the operation.
   */
  rm(targetPath: string, options?: RmOptions): Promise<void>;

  /**
   * Synchronous version of rm.
   */
  rmSync(targetPath: string, options?: RmOptions): void;

  /**
   * Moves or renames a file or directory.
   * @param srcPath - Source path.
   * @param destPath - Destination path.
   */
  move(srcPath: string, destPath: string): Promise<void>;

  /**
   * Synchronous version of move.
   */
  moveSync(srcPath: string, destPath: string): void;

  /**
   * Copies a file or directory (directory must be empty).
   * @param srcPath - Source path.
   * @param destPath - Destination path.
   */
  copy(srcPath: string, destPath: string): Promise<void>;

  /**
   * Synchronous version of copy.
   */
  copySync(srcPath: string, destPath: string): void;

  // --- File operations ---

  /**
   * Reads a file's contents as a UTF-8 string.
   * @param filePath - Path to the file.
   * @returns File contents.
   */
  readFile(filePath: string): Promise<string>;

  /**
   * Synchronous version of readFile.
   */
  readFileSync(filePath: string): string;

  /**
   * Reads a file's contents as a Buffer.
   * @param filePath - Path to the file.
   * @returns File data.
   */
  readBuffer(filePath: string): Promise<Buffer>;

  /**
   * Synchronous version of readBuffer.
   */
  readBufferSync(filePath: string): Buffer;

  /**
   * Writes a UTF-8 string to a file, creating or truncating it.
   * @param filePath - Path to the file.
   * @param content - String data to write.
   */
  writeFile(filePath: string, content: string): Promise<void>;

  /**
   * Synchronous version of writeFile.
   */
  writeFileSync(filePath: string, content: string): void;

  /**
   * Writes a Buffer to a file, creating or truncating it.
   * @param filePath - Path to the file.
   * @param data - Buffer data to write.
   */
  writeBuffer(filePath: string, data: Buffer): Promise<void>;

  /**
   * Synchronous version of writeBuffer.
   */
  writeBufferSync(filePath: string, data: Buffer): void;

  // --- Existence checks ---

  /**
   * Returns true if the given path exists (file or directory).
   */
  exists(path: string): Promise<boolean>;

  /**
   * Synchronous version of exists.
   */
  existsSync(path: string): boolean;

  // --- Glob pattern matching ---

  /**
   * Finds files or directories matching the given patterns.
   * Always returns absolute paths.
   * @param patterns - Single glob or array of globs.
   */
  glob(patterns: string | string[]): Promise<string[]>;

  /**
   * Synchronous version of glob.
   */
  globSync(patterns: string | string[]): string[];
}
