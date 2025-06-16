import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod/v4';

import { transformerOptionBuilder } from './options.js';

vi.mock('@inquirer/prompts', () => ({
  input: vi.fn(),
  select: vi.fn(),
  confirm: vi.fn(),
  number: vi.fn(),
}));

describe('optionBuilder', () => {
  describe('string', () => {
    it('should create a string option field', () => {
      const field = transformerOptionBuilder.string();

      expect(field.required).toBeUndefined();
      expect(field.transformFromString).toBeUndefined();
      expect(typeof field.prompt).toBe('function');
      expect(typeof field.validate).toBe('function');
    });

    it('should validate input without validator', () => {
      const field = transformerOptionBuilder.string();
      const result = field.validate('test');

      expect(result).toBe('test');
    });

    it('should validate input with zod validator', () => {
      const validator = z.string().min(5);
      const field = transformerOptionBuilder.string({ validator });

      expect(() => field.validate('test')).toThrow();
      expect(field.validate('valid')).toBe('valid');
    });
  });

  describe('select', () => {
    it('should create a select option field', () => {
      const choices = ['a', 'b', 'c'] as const;
      const field = transformerOptionBuilder.select({ choices });

      expect(field.required).toBeUndefined();
      expect(typeof field.transformFromString).toBe('function');
      expect(typeof field.prompt).toBe('function');
      expect(typeof field.validate).toBe('function');
    });

    it('should transform valid string input', () => {
      const choices = ['a', 'b', 'c'] as const;
      const field = transformerOptionBuilder.select({ choices });

      expect(field.transformFromString?.('a')).toBe('a');
    });

    it('should reject invalid string input', () => {
      const choices = ['a', 'b', 'c'] as const;
      const field = transformerOptionBuilder.select({ choices });

      expect(() => field.transformFromString?.('d')).toThrow(TypeError);
      expect(() => field.transformFromString?.('d')).toThrow(
        'Invalid choice: d. Must be one of: a, b, c',
      );
    });
  });

  describe('confirm', () => {
    it('should create a confirm option field', () => {
      const field = transformerOptionBuilder.confirm();

      expect(field.required).toBeUndefined();
      expect(typeof field.transformFromString).toBe('function');
      expect(typeof field.prompt).toBe('function');
      expect(typeof field.validate).toBe('function');
    });

    it('should transform truthy string inputs', () => {
      const field = transformerOptionBuilder.confirm();

      expect(field.transformFromString?.('true')).toBe(true);
      expect(field.transformFromString?.('yes')).toBe(true);
      expect(field.transformFromString?.('y')).toBe(true);
      expect(field.transformFromString?.('1')).toBe(true);
      expect(field.transformFromString?.('TRUE')).toBe(true);
    });

    it('should transform falsy string inputs', () => {
      const field = transformerOptionBuilder.confirm();

      expect(field.transformFromString?.('false')).toBe(false);
      expect(field.transformFromString?.('no')).toBe(false);
      expect(field.transformFromString?.('n')).toBe(false);
      expect(field.transformFromString?.('0')).toBe(false);
      expect(field.transformFromString?.('FALSE')).toBe(false);
    });

    it('should reject invalid string input', () => {
      const field = transformerOptionBuilder.confirm();

      expect(() => field.transformFromString?.('maybe')).toThrow(TypeError);
      expect(() => field.transformFromString?.('maybe')).toThrow(
        'Invalid boolean: maybe. Use true/false, yes/no, y/n, or 1/0',
      );
    });
  });

  describe('number', () => {
    it('should create a number option field', () => {
      const field = transformerOptionBuilder.number();

      expect(field.required).toBeUndefined();
      expect(typeof field.transformFromString).toBe('function');
      expect(typeof field.prompt).toBe('function');
      expect(typeof field.validate).toBe('function');
    });

    it('should transform valid number strings', () => {
      const field = transformerOptionBuilder.number();

      expect(field.transformFromString?.('42')).toBe(42);
      expect(field.transformFromString?.('3.14')).toBe(3.14);
      expect(field.transformFromString?.('-10')).toBe(-10);
    });

    it('should reject invalid number strings', () => {
      const field = transformerOptionBuilder.number();

      expect(() => field.transformFromString?.('not-a-number')).toThrow(
        TypeError,
      );
      expect(() => field.transformFromString?.('not-a-number')).toThrow(
        'Invalid number: not-a-number',
      );
    });

    it('should validate input with zod validator', () => {
      const validator = z.number().min(0);
      const field = transformerOptionBuilder.number({ validator });

      expect(() => field.validate(-1)).toThrow();
      expect(field.validate(5)).toBe(5);
    });
  });
});
