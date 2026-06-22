/**
 * Vitest setup file - loaded before every test file.
 *
 * - Registers @testing-library/jest-dom matchers (toBeInTheDocument, etc.)
 * - Stubs env vars used at import time (Prisma, BigPickle) so purely-logic
 *   unit tests do not need a real .env loaded.
 */

import '@testing-library/jest-dom/vitest';

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./test.db';
}

if (!process.env.BIGPICKLE_API_URL) {
  // Empty string triggers dev-mode fallback in BigPickleClient by design.
  process.env.BIGPICKLE_API_URL = '';
}

if (!process.env.BIGPICKLE_API_KEY) {
  process.env.BIGPICKLE_API_KEY = 'test-key-not-real';
}

if (!process.env.COMPACTION_WINDOW_DAYS) {
  process.env.COMPACTION_WINDOW_DAYS = '30';
}
