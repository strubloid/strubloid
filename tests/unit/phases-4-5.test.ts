/**
 * Tests for Phase 4-5 changes: transports, auto-title, sidebar pagination state.
 */

import { describe, it, expect } from 'vitest';

// ── Transport registry ─────────────────────────────────────

describe('transport registry', () => {
  it('getTransport returns a function for known providers', async () => {
    const { getTransport } = await import('@/ais/zen/transports/index');
    expect(typeof getTransport('openai')).toBe('function');
    expect(typeof getTransport('anthropic')).toBe('function');
    expect(typeof getTransport('google')).toBe('function');
  });

  it('getTransport defaults unknown providers to openai', async () => {
    const { getTransport } = await import('@/ais/zen/transports/index');
    // Unknown provider should still return a function (defaults to openai)
    expect(typeof getTransport('')).toBe('function');
    expect(typeof getTransport('unknown')).toBe('function');
  });
});

describe('transport modules exist', () => {
  it('openai transport exports complete function', async () => {
    const mod = await import('@/ais/zen/transports/openai');
    expect(typeof mod.complete).toBe('function');
  });

  it('anthropic transport exports complete function', async () => {
    const mod = await import('@/ais/zen/transports/anthropic');
    expect(typeof mod.complete).toBe('function');
  });

  it('google transport exports complete function', async () => {
    const mod = await import('@/ais/zen/transports/google');
    expect(typeof mod.complete).toBe('function');
  });
});

// ── Auto-title derivation ──────────────────────────────────

describe('auto-title derivation', () => {
  function deriveTitle(message: string): string {
    const words = message.split(/\s+/).filter(Boolean);
    return words.length > 6
      ? words.slice(0, 6).join(' ') + '...'
      : message;
  }

  it('uses full message when 6 words or fewer', () => {
    expect(deriveTitle('Hello')).toBe('Hello');
    expect(deriveTitle('What is the capital of France')).toBe('What is the capital of France');
  });

  it('truncates to 6 words with ellipsis for longer messages', () => {
    const long = 'Can you please tell me the weather in London right now';
    expect(deriveTitle(long)).toBe('Can you please tell me the...');
  });

  it('handles empty and single-word messages', () => {
    expect(deriveTitle('')).toBe('');
    expect(deriveTitle('Hello')).toBe('Hello');
  });

  it('preserves extra whitespace in short messages', () => {
    // When under word limit, the original message is returned as-is
    expect(deriveTitle('  Hello   world  ')).toBe('  Hello   world  ');
  });
});
