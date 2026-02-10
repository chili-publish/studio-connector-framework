import { ExecutionError } from '../core/types';

/**
 * Parses an optional boolean flag from CLI option values.
 * Skipped (undefined) is considered false. Accepts "true" and "false" (case-insensitive).
 */
export function parseBoolean(value: string | undefined): boolean {
  if (value === undefined) return false;
  const lower = value.toLowerCase();
  if (lower === 'true') return true;
  if (lower === 'false') return false;
  throw new ExecutionError(
    `Invalid boolean value "${value}". Use true or false.`
  );
}
