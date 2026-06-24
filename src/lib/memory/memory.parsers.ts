/**
 * Safe JSON field helpers for MemoryEntry storage.
 *
 * Prisma schema stores facts, preferences, and sourceChatIds as String (SQLite).
 * At runtime these fields may hold arrays, objects, or JSON strings.
 * These helpers normalize them so read/write is consistent everywhere.
 */

/**
 * Normalise an unknown value to a JSON string for Prisma field storage.
 * Arrays become JSON arrays, objects become JSON objects, null/undefined becomes null.
 */
export function stringifyJsonField(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

/**
 * Parse a Prisma string field that may contain a JSON array.
 * Returns [] for null/undefined/invalid values.
 */
export function parseJsonArrayField(value: string | null | undefined): string[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(Boolean).map(String) : [];
  } catch {
    // Not JSON — return as single-element array
    return [value];
  }
}

/**
 * Parse a Prisma string field that may contain a JSON object.
 * Returns null for null/undefined/invalid plain-string values.
 */
export function parseJsonObjectField<T extends Record<string, unknown>>(
  value: string | null | undefined
): T | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as T)
      : null;
  } catch {
    return null;
  }
}

/**
 * Format a MemoryEntry's facts for display to the AI.
 * Handles both JSON-array strings and plain-text strings.
 */
export function formatFactsForPrompt(facts: string | null | undefined): string {
  if (!facts) return '';

  // Try JSON array first
  const parsed = parseJsonArrayField(facts);
  if (parsed.length > 1) {
    return parsed.map((f) => `- ${f}`).join('\n');
  }

  // Single string — use as-is
  return facts;
}
