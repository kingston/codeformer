import type { z } from 'zod';

export interface TransformerOptionBase<Type = unknown> {
  type: string;
  description: string;
  optional?: boolean;
}

export interface TransformerOptionString extends TransformerOptionBase<string> {
  type: 'string';
  validator?: z.ZodSchema<string>;
}

export interface TransformerOptionBoolean
  extends TransformerOptionBase<boolean> {
  type: 'boolean';
}

export interface TransformerOptionNumber extends TransformerOptionBase<number> {
  type: 'number';
  validator?: z.ZodSchema<number>;
}

export interface TransformerOptionArray<T = string>
  extends TransformerOptionBase<T[]> {
  type: 'array';
  validator?: z.ZodSchema<T[]>;
}

export interface TransformerOptionSelect<TOptions extends string>
  extends TransformerOptionBase<TOptions> {
  type: 'select';
  options: TOptions[];
}

export type TransformerOption =
  | TransformerOptionString
  | TransformerOptionBoolean
  | TransformerOptionNumber
  | TransformerOptionArray
  | TransformerOptionSelect<string>;

export type TransformerOptions = Record<string, TransformerOption>;

export type InferOptions<TOptions extends TransformerOptions> = {
  [K in keyof TOptions]: TOptions[K] extends TransformerOptionString
    ? string
    : TOptions[K] extends TransformerOptionBoolean
      ? boolean
      : TOptions[K] extends TransformerOptionNumber
        ? number
        : TOptions[K] extends TransformerOptionArray<infer T>
          ? T[]
          : TOptions[K] extends TransformerOptionSelect<infer U>
            ? U
            : unknown;
};

export interface TransformContext {
  fs: FileSystem;
  cwd: string;
  toSubdirectory(subdir: string): TransformContext;
}

export interface Transformer<
  TOptions extends TransformerOptions = TransformerOptions,
> {
  name: string;
  description?: string;
  options?: TOptions;
  transform: (
    context: TransformContext,
    options: InferOptions<TOptions>,
  ) => Promise<void>;
}

export interface TransformerModule<
  TOptions extends TransformerOptions = TransformerOptions,
> {
  default: Transformer<TOptions>;
}
