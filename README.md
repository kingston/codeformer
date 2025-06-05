# Tool Template

> **Note**: This is a template repository. To adapt this code for your own tool, please:
>
> 1. Update this README.md with your tool's description and usage instructions
> 2. Update `package.json` with your tool's name, description, keywords, repository URL, and author
> 3. Update the CLI name and description in `src/cli.ts` (lines 10-12)
> 4. Uncomment the triggers in `.github/workflows/release.yml` and other workflow files
> 5. Add your `NPM_TOKEN` secret to your GitHub repository settings for automated releases
> 6. Update the LICENSE file if needed
> 7. Remove this note section once you've customized the template

## Description

[Replace this section with a description of what your tool does and its main features]

## Installation

[Replace with installation instructions for your tool, e.g.:]

```bash
npm install -g your-tool-name
# or
pnpm add -g your-tool-name
```

## Usage

[Replace with usage instructions and examples for your tool, e.g.:]

```bash
your-tool-name [options] [arguments]
```

### Options

[Document your CLI options here]

### Examples

[Provide usage examples here]

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
