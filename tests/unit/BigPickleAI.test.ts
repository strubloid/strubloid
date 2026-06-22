import { describe, it, expect, vi } from 'vitest';
import { BigPickleAI } from '@/ais/big-pickle/BigPickleAI';

describe('BigPickleAI adapter', () => {
  it('delegates sendMessage and forwards result', async () => {
    const ai = new BigPickleAI();
    vi.spyOn(ai as any, 'getStatus').mockReturnValue({
      providerName: 'BigPickle',
      isConfigured: false,
      isUsingDevMode: true,
      apiUrl: null,
    });
    // Drive via the underlying client path - dev mode returns deterministic output.
    const res = await ai.sendMessage({ messages: [{ role: 'user', content: 'ping' }] });
    expect(res.content).toContain('DEV MODE');
    expect(res.model).toBe('dev-mode');
  });

  it('compactMemory threads sourceChatIds and count', async () => {
    const ai = new BigPickleAI();
    const res = await ai.compactMemory({
      chatMessages: [
        { id: 'a', role: 'user', content: 'x', createdAt: new Date() },
        { id: 'b', role: 'assistant', content: 'y', createdAt: new Date() },
      ],
    });
    expect(res.sourceChatIds).toEqual(['a', 'b']);
    expect(res.compactedCount).toBe(2);
    expect(res.title).toContain('DEV MODE');
  });

  it('getProviderName returns BigPickle', () => {
    const ai = new BigPickleAI();
    expect(ai.getProviderName()).toBe('BigPickle');
  });
});
