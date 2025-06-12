import type {
  InferOptions,
  TransformerOptions,
} from '../types.js';

export interface RunTransformerOptions {
  dryRun: boolean;
  cwd: string;
  cliOptions: string[];
}

export async function collectOptions<TOptions extends TransformerOptions>(
  optionsSchema: TOptions,
  cliArgs: string[],
): Promise<InferOptions<TOptions>> {
  const result: Record<string, unknown> = {};

  // Parse CLI arguments in --key=value format
  const cliOptions = new Map<string, string>();
  for (const arg of cliArgs) {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=', 2);
      if (value) {
        cliOptions.set(key, value);
      }
    }
  }

  // Process each option
  for (const [key, option] of Object.entries(optionsSchema)) {
    const cliValue = cliOptions.get(key);

    if (cliValue !== undefined) {
      // Parse CLI value based on type
      switch (option.type) {
        case 'string': {
          result[key] = cliValue;
          break;
        }
        case 'boolean': {
          result[key] = cliValue === 'true' || cliValue === '1';
          break;
        }
        case 'number': {
          result[key] = Number(cliValue);
          break;
        }
        case 'array': {
          result[key] = cliValue.split(',');
          break;
        }
        case 'select': {
          if (option.options.includes(cliValue)) {
            result[key] = cliValue;
          } else {
            throw new Error(
              `Invalid value "${cliValue}" for option "${key}". Must be one of: ${option.options.join(', ')}`,
            );
          }
          break;
        }
      }
    } else if (!option.optional) {
      // Prompt for missing required options
      const { input, select, confirm } = await import('@inquirer/prompts');

      switch (option.type) {
        case 'string': {
          result[key] = await input({
            message: option.description,
            required: !option.optional,
          });
          break;
        }
        case 'boolean': {
          result[key] = await confirm({
            message: option.description,
            default: false,
          });
          break;
        }
        case 'number': {
          const numValue = await input({
            message: option.description,
            required: !option.optional,
            validate: (value) => {
              const num = Number(value);
              return !Number.isNaN(num) || 'Please enter a valid number';
            },
          });
          result[key] = Number(numValue);
          break;
        }
        case 'select': {
          result[key] = await select({
            message: option.description,
            choices: option.options.map((opt) => ({ name: opt, value: opt })),
          });
          break;
        }
        case 'array': {
          const arrayValue = await input({
            message: `${option.description} (comma-separated)`,
            required: !option.optional,
          });
          result[key] = arrayValue.split(',').map((s) => s.trim());
          break;
        }
      }
    }
  }

  return result as InferOptions<TOptions>;
}