# Coding Guidelines for tool-template

## Project Structure

- **Node Version**: 20+
- **Module System**: ESM only (`"type": "module"` in package.json)

## File Naming Conventions

- **Files**: Use kebab-case for all file names (e.g., `system-info.ts`, `eslint.config.js`)
- **Directories**: Use kebab-case for directory names
- **Test Files**: Use suffixes:
  - `.test.ts` for unit tests
  - Tests should be collocated with source files in the same directory

## Directory structure

- `src/`: Source code
- `src/cli.ts`: CLI entry point
- `src/index.ts`: Main entry point
- `src/types.ts`: Type definitions
- `src/services/*`: Service files
- `src/utils/*`: Utility files
- `src/commands/*`: Files for each command that should be registered with the CLI

## Import/Export Rules

### ESM-Style Imports

- **Always use .js extensions** in import statements, even when importing TypeScript files
- Example: `import { getSystemInfo } from '@src/system-info.js';`
- This is required for proper ESM module resolution with TypeScript's `NodeNext` module resolution
- **Use default import for `node:path` module**: `import path from 'node:path';` instead of named imports

### Import Organization

Imports must be sorted according to perfectionist rules in this order:

1. Type imports
2. Built-in and external value imports
3. Internal type imports
4. Internal value imports (using `@src/` pattern)
5. Relative type imports (parent, sibling, index)
6. Relative value imports (parent, sibling, index)
7. Side-effect imports

### Type Imports

- Use `import type` for type-only imports: `import type { MyType } from './types.js';`
- Use consistent type exports: `export type { MyType };`

## TypeScript Rules

### Function Return Types

- **Always specify explicit return types** for functions (enforced by `@typescript-eslint/explicit-function-return-type`)
- Exceptions: Expression functions and typed function expressions are allowed
- Example:

  ```typescript
  export function getSystemInfo(): SystemInfo {
    // implementation
  }

  function displaySystemInfo(): void {
    // implementation
  }
  ```

### General TypeScript Rules

- Use strict type checking configuration
- Enable `isolatedModules` for faster compilation
- Use `NodeNext` module resolution
- Prefer destructuring for objects (not arrays)
- Use consistent type imports/exports

## Testing with Vitest

### Configuration

- **No globals**: Import test functions explicitly from 'vitest'
- Example: `import { describe, expect, it } from 'vitest';`
- Tests run from `./src` root directory
- Mock reset enabled by default

### Test Structure

```typescript
import { describe, expect, it } from 'vitest';
import { getSystemInfo } from '#src/system-info.js';

describe('getSystemInfo', () => {
  it('should return a platform', () => {
    const systemInfo = getSystemInfo();
    expect(systemInfo.platform).toBeTruthy();
  });
});
```

## Code Style Rules

### General JavaScript/TypeScript

- **Object shorthand**: Always use shorthand syntax for object properties
- **Template literals**: Prefer template literals over string concatenation
- **Arrow functions**: Use concise arrow function syntax when possible
- **Prefer undefined over null**: Use `undefined` over `null` when possible

### Import Rules

- No extraneous dependencies (must be in package.json)
- Dev dependencies allowed in:
  - Test files (`**/*.test.{js,ts,tsx,jsx}`)
  - Test helpers (`**/*.test-helper.{js,ts,jsx,tsx}`)
  - Config files at root level (`*.{js,ts,mjs,mts,cjs,cts}`)
  - Test directories (`src/tests/**/*`, `**/__mocks__/**/*`)

## Development Commands

Essential commands for maintaining code quality:

```bash
# Install dependencies
pnpm install

# Run linting with fixes
pnpm lint --fix

# Run type checking
pnpm typecheck

# Run tests
pnpm test

# Run Prettier formatting
pnpm prettier:check
pnpm prettier:write

# Build package
pnpm build
```

## Changesets

If you are adding a new feature or changing an existing feature, please also add a new Changeset for it in the `.changeset/` directory of the form (keeping things to patch changes for now):

```markdown
---
'package-name': patch
---

Description of the feature or change
```

## Custom instructions

### Common Test Patterns

#### Mocking the File System

For file system operations, use memfs:

```typescript
import { vol } from 'memfs';

vi.mock('node:fs');
vi.mock('node:fs/promises');

beforeEach(() => {
  vol.reset();
});

test('should do something', () => {
  // Arrange
  vol.fromJSON({
    'test-file.txt': 'test content',
  })

  // Act
  ...

  // Assert
  const files = vol.toJSON();
  expect(files['test-file.txt']).toBe('test content');
});
```

If using fast-glob, make sure we pass the mocked fs adapter:

```typescript
import FastGlob from 'fast-glob';

const files = await FastGlob.async(['**/*.ts'], { fs: nodeFs });
```
