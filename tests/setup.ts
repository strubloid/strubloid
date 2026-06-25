/**
 * Vitest setup file — loaded before every test file.
 *
 * - Registers @testing-library/jest-dom matchers (toBeInTheDocument, etc.)
 * - Sets env vars consumed at module import time (before setup files run,
 *   these are only picked up by test.env in vitest.config.ts, not here)
 */

import '@testing-library/jest-dom/vitest';
