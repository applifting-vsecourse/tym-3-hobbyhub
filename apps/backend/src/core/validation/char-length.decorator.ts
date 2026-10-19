import { ValidateBy, ValidationOptions } from 'class-validator';

// Characters as Postgres counts them (`char_length`, `VARCHAR(n)`): code
// points, not the UTF-16 units of `string.length`, where an emoji counts twice.
export const charCount = (value: string): number => [...value].length;

/**
 * Like `@Length`, but counts characters the way the database does, so a value
 * the API accepts never breaks a column limit or CHECK constraint (→ 500).
 */
export function CharLength(
  min: number,
  max: number,
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return ValidateBy(
    {
      name: 'charLength',
      constraints: [min, max],
      validator: {
        validate: (value: unknown): boolean =>
          typeof value === 'string' &&
          charCount(value) >= min &&
          charCount(value) <= max,
        defaultMessage: (args): string =>
          `${args?.property ?? 'value'} must be between ${min} and ${max} characters long`,
      },
    },
    validationOptions,
  );
}
