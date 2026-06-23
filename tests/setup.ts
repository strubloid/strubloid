/**
 * Vitest setup file - loaded before every test file.
 *
 * - Registers @testing-library/jest-dom matchers (toBeInTheDocument, etc.)
 * - Stubs env vars used at import time (Prisma) so purely-logic
 *   unit tests do not need a real .env loaded.
 */

import '@testing-library/jest-dom/vitest';

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./test.db';
}

if (!process.env.COMPACTION_WINDOW_DAYS) {
  process.env.COMPACTION_WINDOW_DAYS = '30';
}
