import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { TransformerOptions } from './types.js';

import { resolveTransformerOptionsFromCliArgs } from './cli-parser.js';
import { transformerOptionBuilder } from './options.js';

vi.mock('@inquirer/prompts', () => ({
  input: vi.fn(),
  select: vi.fn(),
  confirm: vi.fn(),
  number: vi.fn(),
}));

const mockedPrompts = vi.mocked(await import('@inquirer/prompts'));

describe('resolveTransformerOptionsFromCliArgs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should parse valid CLI arguments', async () => {
    const schema: TransformerOptions = {
      name: transformerOptionBuilder.string({ required: true }),
      age: transformerOptionBuilder.number({ required: true }),
      isActive: transformerOptionBuilder.confirm({ required: true }),
    };

    const args = ['name=John', 'age=25', 'isActive=true'];
    const result = await resolveTransformerOptionsFromCliArgs(schema, args);

    expect(result).toEqual({
      name: 'John',
      age: 25,
      isActive: true,
    });
  });

  it('should throw on invalid option format', async () => {
    const schema: TransformerOptions = {
      name: transformerOptionBuilder.string({ required: true }),
    };

    const args = ['name'];
    await expect(
      resolveTransformerOptionsFromCliArgs(schema, args),
    ).rejects.toThrow('Invalid option format: name. Expected key=value');
  });

  it('should throw on unknown options', async () => {
    const schema: TransformerOptions = {
      name: transformerOptionBuilder.string({ required: true }),
    };

    const args = ['unknown=value'];
    await expect(
      resolveTransformerOptionsFromCliArgs(schema, args),
    ).rejects.toThrow('Unknown options for transformer: unknown');
  });

  it('should throw on invalid value type', async () => {
    const schema: TransformerOptions = {
      age: transformerOptionBuilder.number({ required: true }),
    };

    const args = ['age=not-a-number'];
    await expect(
      resolveTransformerOptionsFromCliArgs(schema, args),
    ).rejects.toThrow('Invalid value for option age');
  });

  it('should prompt for required string options when not provided', async () => {
    mockedPrompts.input.mockResolvedValueOnce('John');

    const schema: TransformerOptions = {
      name: transformerOptionBuilder.string({ required: true }),
    };

    const args: string[] = [];
    const result = await resolveTransformerOptionsFromCliArgs(schema, args);

    expect(mockedPrompts.input).toHaveBeenCalledWith({
      message: 'Please enter a value for name',
      validate: expect.any(Function) as (input: string) => boolean,
    });
    expect(result).toEqual({ name: 'John' });
  });

  it('should prompt for required number options when not provided', async () => {
    mockedPrompts.number.mockResolvedValueOnce(25);

    const schema: TransformerOptions = {
      age: transformerOptionBuilder.number({ required: true }),
    };

    const args: string[] = [];
    const result = await resolveTransformerOptionsFromCliArgs(schema, args);

    expect(mockedPrompts.number).toHaveBeenCalledWith({
      message: 'Please enter a number for age',
      validate: expect.any(Function) as (input: string) => boolean,
    });
    expect(result).toEqual({ age: 25 });
  });

  it('should prompt for required confirm options when not provided', async () => {
    const { confirm } = await import('@inquirer/prompts');
    (confirm as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      true,
    );

    const schema: TransformerOptions = {
      isActive: transformerOptionBuilder.confirm({ required: true }),
    };

    const args: string[] = [];
    const result = await resolveTransformerOptionsFromCliArgs(schema, args);

    expect(confirm).toHaveBeenCalledWith({
      message: 'isActive?',
    });
    expect(result).toEqual({ isActive: true });
  });

  it('should prompt for required select options when not provided', async () => {
    const { select } = await import('@inquirer/prompts');
    (select as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      'option1',
    );

    const schema: TransformerOptions = {
      choice: transformerOptionBuilder.select({
        choices: ['option1', 'option2'],
        required: true,
      }),
    };

    const args: string[] = [];
    const result = await resolveTransformerOptionsFromCliArgs(schema, args);

    expect(select).toHaveBeenCalledWith({
      message: 'Please select a value for choice',
      choices: [
        { name: 'option1', value: 'option1' },
        { name: 'option2', value: 'option2' },
      ],
    });
    expect(result).toEqual({ choice: 'option1' });
  });

  it('should not prompt for required options in non-interactive mode', async () => {
    const schema: TransformerOptions = {
      name: transformerOptionBuilder.string({ required: true }),
    };

    const args: string[] = [];
    await expect(
      resolveTransformerOptionsFromCliArgs(schema, args, {
        nonInteractive: true,
      }),
    ).rejects.toThrow('Missing required option name for transformer');
  });

  it('should handle optional fields', async () => {
    const schema: TransformerOptions = {
      name: transformerOptionBuilder.string({ required: false }),
    };

    const args: string[] = [];
    const result = await resolveTransformerOptionsFromCliArgs(schema, args);

    expect(result).toEqual({});
  });
});
