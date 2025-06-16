/**
 * A field for a transformer option.
 *
 * @param TValue - The type of the option value.
 * @param TRequired - Whether the option is required.
 */
export interface TransformerOptionField<
  TValue = unknown,
  TRequired extends boolean = true,
> {
  /**
   * Whether the option is required.
   */
  required?: TRequired;

  /**
   * Prompt the user for the option value.
   *
   * @param name - The name of the option.
   * @returns The option value.
   */
  prompt: (
    name: string,
  ) => Promise<TRequired extends true ? TValue : TValue | undefined>;

  /**
   * Transform a string input to the option value.
   */
  transformFromString?: (input: string) => TValue;

  /**
   * Validate the option value.
   */
  validate: (
    input: TValue,
  ) => TRequired extends true ? TValue : TValue | undefined;
}

/**
 * A map of field names to their option fields.
 *
 * @param TKey - The type of the option key.
 * @param TValue - The type of the option value.
 */
export type TransformerOptions = Record<
  string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- need any to match any type of option
  TransformerOptionField<any, boolean>
>;

/**
 * Infer the type of the transformer options from a record of option fields.
 *
 * @param TOptions - The record of option fields.
 * @returns The type of the transformer options.
 */
export type InferTransformerOptions<TOptions extends TransformerOptions> = {
  [K in keyof TOptions]: TOptions[K] extends TransformerOptionField<
    infer TValue,
    infer TRequired
  >
    ? TRequired extends true
      ? TValue
      : TValue | undefined
    : never;
};
