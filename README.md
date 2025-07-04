# Codeformer

Codeformer is a TypeScript-based code transformation orchestrator that enables developers to create and run composable transformations across codebases. It goes beyond traditional AST-only tools by providing a unified API for file operations, code transformations, and multi-step workflows.

## Features

- **Composable Transformers**: Create reusable transformation modules that can invoke other transformers
- **Unified File Operations**: Abstracted file system operations with glob pattern matching
- **Interactive Options**: CLI prompts for missing transformer options using @inquirer/prompts
- **Dry Run Mode**: Test transformations safely with memory-based file system mocking
- **ESM Native**: Built for modern TypeScript/ESM workflows
- **Extensible**: Plugin architecture for AST tools (JSCodeshift, ast-grep, etc.)

## Installation

```bash
npm install -g codeformer
# or
pnpm add -g codeformer
```

## Usage

### Running Transformers

```bash
# Run a local transformer
codeformer run ./my-transformer.ts

# Run with dry-run mode
codeformer run ./my-transformer.ts --dry-run

# Run from a different directory
codeformer run ./my-transformer.ts --cwd /path/to/project

# Pass transformer options (after --)
codeformer run ./my-transformer.ts -- targetFramework=react outputDir=./dist
```

### CLI Options

The `run` command supports the following options:

- `-d, --dry-run`: Run in dry-run mode without making changes to the filesystem
- `-c, --cwd <dir>`: Specify the working directory (defaults to current directory)
- `-- [transformer options]`: Pass options to the transformer in `key=value` format

### Creating Transformers

```typescript
// my-transformer.ts
export default {
  name: 'my-transformer',
  description: 'Transforms my code',
  options: {
    targetFramework: {
      type: 'select',
      description: 'Target framework',
      options: ['react', 'vue', 'angular'],
    },
  },
  transform: async (ctx, options) => {
    // Your transformation logic here
    const files = await ctx.fs.glob('**/*.ts');
    for (const file of files) {
      // Transform each file
    }
  },
};
```

### Examples

```bash
# Rename files to kebab-case
codeformer run ./transformers/rename-to-kebab.ts

# Convert CommonJS to ESM with dry-run
codeformer run ./transformers/convert-to-esm.ts --dry-run

# Update imports across monorepo with transformer options
codeformer run ./transformers/update-imports.ts -- package=@myorg/ui newPackage=@myorg/ui-v2

# Run transformer in a specific directory
codeformer run ./transformers/fix-imports.ts --cwd ./packages/web-app

# Combine multiple options
codeformer run ./transformers/migrate-framework.ts --dry-run --cwd ./src -- framework=vue version=3
```

## Development

This project uses Node.js 20+ with ESM modules and TypeScript.

### Setup

```bash
# Install dependencies
pnpm install
```

### Available Scripts

```bash
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

### Testing

Tests are written with Vitest and should be collocated with source files using the `.test.ts` suffix.

```bash
pnpm test
```

### Releases

This project uses Changesets for version management. When making changes:

1. Add a changeset: `pnpm changeset`
2. Commit your changes including the changeset
3. The release workflow will handle publishing when changesets are merged

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
