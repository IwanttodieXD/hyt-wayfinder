/**
 * Joins class names, dropping falsy entries.
 *
 * Kept dependency-free on purpose: `classnames`/`clsx` are not in
 * package.json, and the UI kit only needs this one operation.
 */
export function cn(
  ...parts: Array<string | false | null | undefined>
): string {
  return parts.filter(Boolean).join(' ');
}
