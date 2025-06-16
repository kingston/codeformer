import { enhanceErrorWithContext } from '#src/utils/enhance-error-with-context.js';

import type { InferTransformerOptions, TransformerOptions } from './types.js';

/**
 * Parses an array of CLI arguments in the form key=value to a record of options.
 *
 * @param args - The CLI arguments.
 * @returns The parsed options.
 */
function parseTransformerCliArgs(
  args: string[],
): Partial<Record<string, string>> {
  const options: Partial<Record<string, string>> = {};

  for (const arg of args) {
    const splitIndex = arg.indexOf('=');
    if (splitIndex === -1) {
      throw new TypeError(`Invalid option format: ${arg}. Expected key=value`);
    }
    const key = arg.slice(0, splitIndex);
    const value = arg.slice(splitIndex + 1);
    options[key] = value;
  }

  return options;
}

export async function resolveTransformerOptionsFromCliArgs<
  TOptions extends TransformerOptions,
>(
  optionSchema: TOptions,
  cliArgs: string[],
  { nonInteractive }: { nonInteractive?: boolean } = {},
): Promise<InferTransformerOptions<TOptions>> {
  const resolved: Record<string, unknown> = {};

  const parsedArgs = parseTransformerCliArgs(cliArgs);

  const unknownOptions = Object.keys(parsedArgs).filter(
    (key) => !(key in optionSchema),
  );
  if (unknownOptions.length > 0) {
    throw new TypeError(
      `Unknown options for transformer: ${Object.keys(parsedArgs).join(', ')}`,
    );
  }

  for (const [key, field] of Object.entries(optionSchema)) {
    const cliValue = parsedArgs[key];

    if (cliValue !== undefined) {
      try {
        const transformedValue = (
          field.transformFromString
            ? field.transformFromString(cliValue)
            : cliValue
        ) as unknown;
        resolved[key] = transformedValue;
      } catch (error) {
        throw enhanceErrorWithContext(error, `Invalid value for option ${key}`);
      }
    } else if (field.required) {
      if (nonInteractive) {
        throw new TypeError(`Missing required option ${key} for transformer`);
      }
      const value = (await field.prompt(key)) as unknown;
      resolved[key] = field.validate(value);
    }
  }

  return resolved as InferTransformerOptions<TOptions>;
}
