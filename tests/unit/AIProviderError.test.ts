import { describe, it, expect } from 'vitest';
import { AIProviderError } from '@/ais/AIProviderError';

describe('AIProviderError', () => {
  it('missingConfig produces non-retryable MISSING_CONFIG', () => {
    const e = AIProviderError.missingConfig('BIGPICKLE_API_URL');
    expect(e.code).toBe('MISSING_CONFIG');
    expect(e.isRetryable).toBe(false);
    expect(e.message).toContain('BIGPICKLE_API_URL');
  });

  it('timeout is retryable', () => {
    const e = AIProviderError.timeout();
    expect(e.code).toBe('TIMEOUT');
    expect(e.isRetryable).toBe(true);
  });

  it('providerUnavailable is retryable and carries cause', () => {
    const cause = new Error('socket reset');
    const e = AIProviderError.providerUnavailable(cause);
    expect(e.code).toBe('PROVIDER_UNAVAILABLE');
    expect(e.isRetryable).toBe(true);
    expect(e.cause).toBe(cause);
  });

  it('invalidResponse is non-retryable', () => {
    const e = AIProviderError.invalidResponse('missing content');
    expect(e.code).toBe('INVALID_RESPONSE');
    expect(e.isRetryable).toBe(false);
  });

  it('httpError marks 5xx as retryable, 4xx not', () => {
    expect(AIProviderError.httpError(500).isRetryable).toBe(true);
    expect(AIProviderError.httpError(503).isRetryable).toBe(true);
    expect(AIProviderError.httpError(429).isRetryable).toBe(true);
    expect(AIProviderError.httpError(400).isRetryable).toBe(false);
    expect(AIProviderError.httpError(401).isRetryable).toBe(false);
  });

  it('httpError defaults expose helpful message per status', () => {
    expect(AIProviderError.httpError(401).message).toContain('BIGPICKLE_API_KEY');
    expect(AIProviderError.httpError(429).message).toContain('Rate limit');
    expect(AIProviderError.httpError(503).message).toContain('temporarily');
  });
});
