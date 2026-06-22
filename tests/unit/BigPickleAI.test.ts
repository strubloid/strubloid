import { describe, it, expect, vi } from 'vitest';
import { BigPickleAI } from '@/ais/big-pickle/BigPickleAI';
import { BigPickleClient } from '@/ais/big-pickle/BigPickleClient';

describe('BigPickleAI adapter', () => {
  it('forwards sendMessage result to callers', async () => {
    const fakeClient = {
      sendMessage: vi.fn().mockResolvedValue({
        content: 'mock content',
        model: 'mock-model',
        usage: { promptTokens: 1, completionTokens: 2, totalTokens: 3 },
      }),
      compactMemory: vi.fn(),
      getStatus: vi.fn(),
    } as unknown as BigPickleClient;

    const ai = new BigPickleAI(fakeClient);
    const res = await ai.sendMessage({ messages: [{ role: 'user', content: 'ping' }] });
    expect(res.content).toBe('mock content');
    expect(res.model).toBe('mock-model');
    expect(res.usage?.totalTokens).toBe(3);
    expect(fakeClient.sendMessage).toHaveBeenCalledWith(
      [{ role: 'user', content: 'ping' }],
      { useAiBrain: undefined, brainMemories: undefined }
    );
  });

  it('passes brain options through to client', async () => {
    const fakeClient = {
      sendMessage: vi.fn().mockResolvedValue({ content: 'x', model: 'y' }),
    } as unknown as BigPickleClient;

    const ai = new BigPickleAI(fakeClient);
    await ai.sendMessage({
      messages: [{ role: 'user', content: 'hi' }],
      useAiBrain: true,
      brainMemories: ['m1'],
    });
    expect(fakeClient.sendMessage).toHaveBeenCalledWith(
      expect.anything(),
      { useAiBrain: true, brainMemories: ['m1'] }
    );
  });

  it('compactMemory threads sourceChatIds and count', async () => {
    const fakeClient = {
      compactMemory: vi.fn().mockResolvedValue({
        title: 'T',
        summary: 'S',
        facts: 'F',
        preferences: null,
      }),
    } as unknown as BigPickleClient;

    const ai = new BigPickleAI(fakeClient);
    const res = await ai.compactMemory({
      chatMessages: [
        { id: 'a', role: 'user', content: 'x', createdAt: new Date() },
        { id: 'b', role: 'assistant', content: 'y', createdAt: new Date() },
      ],
    });
    expect(res.sourceChatIds).toEqual(['a', 'b']);
    expect(res.compactedCount).toBe(2);
    expect(res.title).toBe('T');
    expect(fakeClient.compactMemory).toHaveBeenCalledOnce();
  });

  it('getProviderName returns BigPickle', () => {
    const fakeClient = {} as unknown as BigPickleClient;
    const ai = new BigPickleAI(fakeClient);
    expect(ai.getProviderName()).toBe('BigPickle');
  });

  it('getStatus delegates to the underlying client', () => {
    const fakeStatus = {
      providerName: 'BigPickle',
      isConfigured: true,
      isUsingDevMode: false,
      apiUrl: 'https://x',
    };
    const fakeClient = { getStatus: vi.fn().mockReturnValue(fakeStatus) } as unknown as BigPickleClient;
    const ai = new BigPickleAI(fakeClient);
    expect(ai.getStatus()).toBe(fakeStatus);
  });
});
