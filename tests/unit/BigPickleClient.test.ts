import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BigPickleClient } from '@/ais/big-pickle/BigPickleClient';
import { AIProviderError } from '@/ais/AIProviderError';

describe('BigPickleClient', () => {
  const original = { ...process.env };

  beforeEach(() => {
    delete process.env.BIGPICKLE_API_URL;
    delete process.env.BIGPICKLE_API_KEY;
    delete process.env.BIGPICKLE_TIMEOUT_MS;
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = { ...original };
  });

  describe('dev mode', () => {
    it('reports dev mode when BIGPICKLE_API_URL is empty', () => {
      const client = new BigPickleClient();
      const status = client.getStatus();
      expect(status.isConfigured).toBe(false);
      expect(status.isUsingDevMode).toBe(true);
      expect(status.providerName).toBe('BigPickle');
      expect(status.apiUrl).toBeNull();
    });

    it('returns a simulated response without hitting the network', async () => {
      const client = new BigPickleClient();
      const res = await client.sendMessage([
        { role: 'user', content: 'hello world' },
      ]);
      expect(res.model).toBe('dev-mode');
      expect(res.content).toContain('DEV MODE');
      expect(res.content).toContain('hello world');
      expect(res.usage).toBeDefined();
    });

    it('returns a simulated compaction without hitting the network', async () => {
      const client = new BigPickleClient();
      const res = await client.compactMemory([
        {
          id: 'm1',
          role: 'user',
          content: 'test',
          createdAt: new Date(),
        },
      ]);
      expect(res.title).toContain('DEV MODE');
      expect(res.facts).toBeTruthy();
    });
  });

  describe('configured mode', () => {
    beforeEach(() => {
      process.env.BIGPICKLE_API_URL = 'https://api.example.test';
      process.env.BIGPICKLE_API_KEY = 'fake-key';
    });

    it('reports configured and exposes apiUrl', () => {
      const client = new BigPickleClient();
      const status = client.getStatus();
      expect(status.isConfigured).toBe(true);
      expect(status.isUsingDevMode).toBe(false);
      expect(status.apiUrl).toBe('https://api.example.test');
    });

    it('posts to /chat with bearer auth and parses content', async () => {
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ content: 'hi', model: 'test-model', usage: { promptTokens: 1, completionTokens: 2, totalTokens: 3 } }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        );

      const client = new BigPickleClient();
      const res = await client.sendMessage([{ role: 'user', content: 'ping' }]);

      expect(fetchSpy).toHaveBeenCalledOnce();
      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toBe('https://api.example.test/chat');
      expect(init?.method).toBe('POST');
      const headers = init?.headers as Record<string, string>;
      expect(headers['Authorization']).toBe('Bearer fake-key');
      expect(headers['Content-Type']).toBe('application/json');
      expect(res.model).toBe('test-model');
      expect(res.content).toBe('hi');
      expect(res.usage?.totalTokens).toBe(3);
    });

    it('maps HTTP errors to AIProviderError with retry flag', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response('nope', { status: 503 })
      );
      const client = new BigPickleClient();
      await expect(client.sendMessage([{ role: 'user', content: 'x' }])).rejects.toMatchObject({
        code: 'HTTP_ERROR',
        statusCode: 503,
        isRetryable: true,
      });
    });

    it('maps AbortError to AIProviderError.timeout()', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementationOnce(() => {
        const err = new Error('aborted');
        err.name = 'AbortError';
        return Promise.reject(err);
      });
      const client = new BigPickleClient();
      await expect(client.sendMessage([{ role: 'user', content: 'x' }])).rejects.toMatchObject({
        code: 'TIMEOUT',
        isRetryable: true,
      });
    });

    it('maps unknown network failures to PROVIDER_UNAVAILABLE', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('econnreset'));
      const client = new BigPickleClient();
      await expect(client.sendMessage([{ role: 'user', content: 'x' }])).rejects.toBeInstanceOf(
        AIProviderError
      );
    });

    it('throws INVALID_RESPONSE when content missing', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ model: 'x' }), { status: 200 })
      );
      const client = new BigPickleClient();
      await expect(client.sendMessage([{ role: 'user', content: 'x' }])).rejects.toMatchObject({
        code: 'INVALID_RESPONSE',
      });
    });

    it('integrates brain memories into the body when enabled', async () => {
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ content: 'ok', model: 'm' }), { status: 200 })
        );
      const client = new BigPickleClient();
      await client.sendMessage(
        [{ role: 'user', content: 'hi' }],
        { useAiBrain: true, brainMemories: ['User prefers English', 'Project: Strubloid'] }
      );
      const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string);
      expect(body.system).toContain('[Memory 1]: User prefers English');
      expect(body.system).toContain('[Memory 2]: Project: Strubloid');
    });

    it('omits system field when brain disabled', async () => {
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ content: 'ok', model: 'm' }), { status: 200 })
        );
      const client = new BigPickleClient();
      await client.sendMessage([{ role: 'user', content: 'hi' }]);
      const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string);
      expect(body.system).toBeUndefined();
    });
  });
});
