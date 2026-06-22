import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BigPickleClient } from '@/ais/big-pickle/BigPickleClient';
import { AIProviderError } from '@/ais/AIProviderError';

const OPENAI_OK = (content: string, model = 'big-pickle') =>
  new Response(
    JSON.stringify({
      id: 'chatcmpl-1',
      object: 'chat.completion',
      model,
      choices: [
        { index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' },
      ],
      usage: { prompt_tokens: 5, completion_tokens: 7, total_tokens: 12 },
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );

describe('BigPickleClient', () => {
  const original = { ...process.env };

  beforeEach(() => {
    delete process.env.BIGPICKLE_API_URL;
    delete process.env.BIGPICKLE_API_KEY;
    delete process.env.BIGPICKLE_MODEL;
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
      const res = await client.sendMessage([{ role: 'user', content: 'hello world' }]);
      expect(res.model).toBe('dev-mode');
      expect(res.content).toContain('DEV MODE');
      expect(res.content).toContain('hello world');
      expect(res.usage).toBeDefined();
      expect(res.usage?.totalTokens).toBeGreaterThan(0);
    });

    it('returns a simulated compaction without hitting the network', async () => {
      const client = new BigPickleClient();
      const res = await client.compactMemory([
        { id: 'm1', role: 'user', content: 'test', createdAt: new Date() },
      ]);
      expect(res.title).toContain('DEV MODE');
      expect(res.facts).toBeTruthy();
      expect(res.preferences).toBeNull();
    });
  });

  describe('configured mode', () => {
    const TEST_KEY = 'ENV-INJECTED-FAKE-KEY-DO-NOT-USE';

    beforeEach(() => {
      process.env.BIGPICKLE_API_URL = 'https://api.example.test';
      process.env.BIGPICKLE_API_KEY = TEST_KEY;
      process.env.BIGPICKLE_MODEL = 'big-pickle';
    });

    it('reports configured and exposes apiUrl', () => {
      const client = new BigPickleClient();
      const status = client.getStatus();
      expect(status.isConfigured).toBe(true);
      expect(status.isUsingDevMode).toBe(false);
      expect(status.apiUrl).toBe('https://api.example.test');
    });

    it('posts to /chat/completions with bearer auth and parses OpenAI shape', async () => {
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(OPENAI_OK('hi there', 'big-pickle-large'));

      const client = new BigPickleClient();
      const res = await client.sendMessage([{ role: 'user', content: 'ping' }]);

      expect(fetchSpy).toHaveBeenCalledOnce();
      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toBe('https://api.example.test/chat/completions');
      expect(init?.method).toBe('POST');
      const headers = init?.headers as Record<string, string>;
      expect(headers['Authorization']).toBe(`Bearer ${TEST_KEY}`);
      expect(headers['Content-Type']).toBe('application/json');

      const body = JSON.parse((init as RequestInit).body as string);
      expect(body.model).toBe('big-pickle');
      expect(body.messages[0].role).toBe('user');
      expect(body.messages[0].content).toBe('ping');

      expect(res.model).toBe('big-pickle-large');
      expect(res.content).toBe('hi there');
      expect(res.usage).toEqual({
        promptTokens: 5,
        completionTokens: 7,
        totalTokens: 12,
      });
    });

    it('maps HTTP errors to AIProviderError with retry flag', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('nope', { status: 503 }));
      const client = new BigPickleClient();
      await expect(
        client.sendMessage([{ role: 'user', content: 'x' }])
      ).rejects.toMatchObject({ code: 'HTTP_ERROR', statusCode: 503, isRetryable: true });
    });

    it('maps AbortError to AIProviderError.timeout()', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementationOnce(() => {
        const err = new Error('aborted');
        err.name = 'AbortError';
        return Promise.reject(err);
      });
      const client = new BigPickleClient();
      await expect(
        client.sendMessage([{ role: 'user', content: 'x' }])
      ).rejects.toMatchObject({ code: 'TIMEOUT', isRetryable: true });
    });

    it('maps unknown network failures to PROVIDER_UNAVAILABLE', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('econnreset'));
      const client = new BigPickleClient();
      await expect(client.sendMessage([{ role: 'user', content: 'x' }])).rejects.toBeInstanceOf(
        AIProviderError
      );
    });

    it('throws INVALID_RESPONSE when choices missing', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ model: 'x' }), { status: 200 })
      );
      const client = new BigPickleClient();
      await expect(
        client.sendMessage([{ role: 'user', content: 'x' }])
      ).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
    });

    it('throws INVALID_RESPONSE when choices[0].message.content missing', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ choices: [{ message: {} }] }), { status: 200 })
      );
      const client = new BigPickleClient();
      await expect(
        client.sendMessage([{ role: 'user', content: 'x' }])
      ).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
    });

    it('integrates brain memories as a system message when enabled', async () => {
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(OPENAI_OK('ok'));

      const client = new BigPickleClient();
      await client.sendMessage([{ role: 'user', content: 'hi' }], {
        useAiBrain: true,
        brainMemories: ['User prefers English', 'Project: Strubloid'],
      });
      const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string);
      expect(body.messages[0].role).toBe('system');
      expect(body.messages[0].content).toContain('[Memory 1]: User prefers English');
      expect(body.messages[0].content).toContain('[Memory 2]: Project: Strubloid');
      expect(body.messages[1].role).toBe('user');
      expect(body.messages[1].content).toBe('hi');
    });

    it('omits system message when brain disabled', async () => {
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(OPENAI_OK('ok'));

      const client = new BigPickleClient();
      await client.sendMessage([{ role: 'user', content: 'hi' }]);
      const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string);
      expect(body.messages[0].role).toBe('user');
      expect(body.messages[0].content).toBe('hi');
    });

    it('parses compaction JSON from completion content', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        OPENAI_OK(
          JSON.stringify({
            title: 'Onboarding plan',
            summary: 'Discussed onboarding flow',
            facts: '- Needs welcome email\n- Needs tutorial',
            preferences: 'concise',
          })
        )
      );
      const client = new BigPickleClient();
      const res = await client.compactMemory([
        { id: 'a', role: 'user', content: 'x', createdAt: new Date() },
      ]);
      expect(res.title).toBe('Onboarding plan');
      expect(res.summary).toBe('Discussed onboarding flow');
      expect(res.facts).toContain('welcome email');
      expect(res.preferences).toBe('concise');
    });

    it('falls back when compaction content is not JSON', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        OPENAI_OK('free-form memory summary written by the model')
      );
      const client = new BigPickleClient();
      const res = await client.compactMemory([
        { id: 'a', role: 'user', content: 'x', createdAt: new Date() },
      ]);
      expect(res.title).toBe('Memory Compaction');
      expect(res.summary).toContain('free-form memory summary');
      expect(res.facts).toBe('');
    });
  });
});
