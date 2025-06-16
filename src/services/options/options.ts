import type { z } from 'zod/v4';

import {
  confirm,
  input,
  number as numberPrompt,
  select,
} from '@inquirer/prompts';

import type { TransformerOptionField } from './types.js';

interface StringOptionBuilder<TRequired extends boolean> {
  validator?: z.ZodString;
  description?: string;
  question?: string;
  defaultValue?: string;
  required?: TRequired;
}

export function stringOption<TRequired extends boolean>({
  validator,
  description,
  defaultValue,
  question,
  required,
}: StringOptionBuilder<TRequired> = {}): TransformerOptionField<
  string,
  TRequired
> {
  return {
    prompt: async (name: string) => {
      let message = question ?? `Please enter a value for ${name}`;
      if (description) {
        message += `\n${description}`;
      }
      const response = await input({
        message,
        default: defaultValue,
        validate: (input) => {
          if (validator) {
            const result = validator.safeParse(input);
            if (!result.success) {
              return result.error.message;
            }
          }
          return true;
        },
      });
      return response;
    },
    validate: (input) => (validator ? validator.parse(input) : input),
    required,
  };
}

interface SelectOptionBuilder<
  TChoices extends readonly string[],
  TRequired extends boolean,
> {
  choices: TChoices;
  validator?: z.ZodType<TChoices[number]>;
  description?: string;
  question?: string;
  defaultValue?: TChoices[number];
  required?: TRequired;
}

export function selectOption<
  TChoices extends readonly string[],
  TRequired extends boolean,
>({
  choices,
  validator,
  description,
  defaultValue,
  question,
  required,
}: SelectOptionBuilder<TChoices, TRequired>): TransformerOptionField<
  TChoices[number],
  TRequired
> {
  return {
    prompt: async (name: string) => {
      let message = question ?? `Please select a value for ${name}`;
      if (description) {
        message += `\n${description}`;
      }
      return await select({
        message,
        choices: choices.map((choice) => ({ name: choice, value: choice })),
        default: defaultValue,
      });
    },
    transformFromString: (input) => {
      if (!choices.includes(input as TChoices[number])) {
        throw new TypeError(
          `Invalid choice: ${input}. Must be one of: ${choices.join(', ')}`,
        );
      }
      return input as TChoices[number];
    },
    validate: (input) =>
      (validator ? validator.parse(input) : input) as TRequired extends true
        ? TChoices[number]
        : TChoices[number] | undefined,
    required,
  };
}

interface ConfirmOptionBuilder<TRequired extends boolean> {
  validator?: z.ZodBoolean;
  description?: string;
  question?: string;
  defaultValue?: boolean;
  required?: TRequired;
}

export function confirmOption<TRequired extends boolean>({
  validator,
  description,
  defaultValue,
  question,
  required,
}: ConfirmOptionBuilder<TRequired> = {}): TransformerOptionField<
  boolean,
  TRequired
> {
  return {
    prompt: async (name: string) => {
      let message = question ?? `${name}?`;
      if (description) {
        message += `\n${description}`;
      }
      return await confirm({
        message,
        default: defaultValue,
      });
    },
    transformFromString: (input) => {
      const normalized = input.toLowerCase();
      if (['true', 'yes', 'y', '1'].includes(normalized)) return true;
      if (['false', 'no', 'n', '0'].includes(normalized)) return false;
      throw new TypeError(
        `Invalid boolean: ${input}. Use true/false, yes/no, y/n, or 1/0`,
      );
    },
    validate: (input) => (validator ? validator.parse(input) : input),
    required,
  };
}

interface NumberOptionBuilder<TRequired extends boolean> {
  validator?: z.ZodNumber;
  description?: string;
  question?: string;
  defaultValue?: number;
  required?: TRequired;
}

export function numberOption<TRequired extends boolean>({
  validator,
  description,
  defaultValue,
  question,
  required,
}: NumberOptionBuilder<TRequired> = {}): TransformerOptionField<
  number,
  TRequired
> {
  return {
    prompt: async (name: string) => {
      let message = question ?? `Please enter a number for ${name}`;
      if (description) {
        message += `\n${description}`;
      }
      return await numberPrompt({
        message,
        default: defaultValue,
        validate: (input) => {
          if (validator) {
            const result = validator.safeParse(input);
            if (!result.success) {
              return result.error.message;
            }
          }
          return true;
        },
      });
    },
    transformFromString: (input) => {
      const num = Number(input);
      if (Number.isNaN(num)) {
        throw new TypeError(`Invalid number: ${input}`);
      }
      return num;
    },
    validate: (input) => (validator ? validator.parse(input) : input),
    required,
  };
}

export const transformerOptionBuilder = {
  string: stringOption,
  select: selectOption,
  confirm: confirmOption,
  number: numberOption,
};
