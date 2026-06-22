import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  buildBigPickleConfig,
  isBigPickleConfigured,
} from '@/ais/big-pickle/BigPickleConfig';

describe('BigPickleConfig', () => {
  const original = { ...process.env };

  beforeEach(() => {
    delete process.env.BIGPICKLE_API_URL;
    delete process.env.BIGPICKLE_API_KEY;
    delete process.env.BIGPICKLE_TIMEOUT_MS;
  });

  afterEach(() => {
    process.env = { ...original };
  });

  it('returns null when BIGPICKLE_API_URL is unset', () => {
    expect(buildBigPickleConfig()).toBeNull();
    expect(isBigPickleConfigured()).toBe(false);
  });

  it('returns config when BIGPICKLE_API_URL is set', () => {
    process.env.BIGPICKLE_API_URL = 'https://example.test/v1';
    expect(isBigPickleConfigured()).toBe(true);
    const cfg = buildBigPickleConfig();
    expect(cfg?.apiUrl).toBe('https://example.test/v1');
    expect(cfg?.apiKey).toBe('');
    expect(cfg?.timeoutMs).toBe(30000);
  });

  it('respects BIGPICKLE_TIMEOUT_MS override', () => {
    process.env.BIGPICKLE_API_URL = 'https://example.test/v1';
    process.env.BIGPICKLE_TIMEOUT_MS = '12345';
    expect(buildBigPickleConfig()?.timeoutMs).toBe(12345);
  });

  it('trims whitespace around URL', () => {
    process.env.BIGPICKLE_API_URL = '   https://example.test/v1  ';
    expect(buildBigPickleConfig()?.apiUrl).toBe('https://example.test/v1');
  });
});
