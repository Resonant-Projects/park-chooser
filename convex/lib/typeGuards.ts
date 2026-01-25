/**
 * Type guard utility functions for filtering null/undefined from arrays
 * with proper TypeScript type narrowing.
 */

/**
 * Type guard that checks if a value is defined (not null or undefined).
 * Unlike `.filter(Boolean)`, this provides proper type narrowing.
 *
 * @example
 * const items = [1, null, 2, undefined, 3];
 * const defined = items.filter(isDefined); // TypeScript knows: number[]
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}
