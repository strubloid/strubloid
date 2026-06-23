'use client';

import { useEffect, useState, useCallback } from 'react';
import { Sidebar } from '@/components/Sidebar';

interface AiModel {
  id: number;
  modelId: string;
  name: string;
  endpoint: string;
  provider: string;
  description: string | null;
  isEnabled: boolean;
  isFree: boolean;
  inputPrice: number | null;
  outputPrice: number | null;
}

interface AiStatus {
  providerName: string;
  isConfigured: boolean;
  isUsingDevMode: boolean;
  apiUrl: string | null;
}

export default function SettingsPage() {
  const [models, setModels] = useState<AiModel[]>([]);
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [configs, setConfigs] = useState<Record<string, string>>({});
  const [apiKey, setApiKey] = useState('');
  const [defaultModel, setDefaultModel] = useState('big-pickle');
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [statusRes, modelsRes, configRes] = await Promise.all([
        fetch('/api/ai/status'),
        fetch('/api/ai/models'),
        fetch('/api/ai/config'),
      ]);

      if (statusRes.ok) setStatus(await statusRes.json());
      if (modelsRes.ok) {
        const data = await modelsRes.json();
        setModels(data.models);
      }
      if (configRes.ok) {
        const data = await configRes.json();
        setConfigs(data.configs);
        setApiKey(data.configs.zen_api_key || '');
        setDefaultModel(data.configs.zen_default_model || 'big-pickle');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function saveConfig(key: string, value: string) {
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch('/api/ai/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          configs: [{ key, value }],
        }),
      });

      if (!res.ok) throw new Error('Failed to save');

      setConfigs((prev) => ({ ...prev, [key]: value }));
      setSaveMsg('Saved successfully');

      // Clear save message after 3s
      setTimeout(() => setSaveMsg(null), 3000);
    } catch (err) {
      setSaveMsg('Failed to save');
      setTimeout(() => setSaveMsg(null), 3000);
    } finally {
      setSaving(false);
    }
  }

  async function saveApiKey() {
    if (!apiKey.trim()) return;
    await saveConfig('zen_api_key', apiKey.trim());
    // Refresh status after saving key
    const statusRes = await fetch('/api/ai/status');
    if (statusRes.ok) setStatus(await statusRes.json());
  }

  async function saveDefaultModel() {
    await saveConfig('zen_default_model', defaultModel);
  }

  return (
    <div className="flex h-screen">
      <Sidebar />

      <main className="flex-1 overflow-y-auto bg-[--color-bg]">
        <div className="mx-auto max-w-4xl p-8">
          <h1 className="mb-2 text-2xl font-bold">Settings</h1>
          <p className="mb-8 text-sm text-[--color-text-dim]">
            Strubloid configuration and Zen AI model management
          </p>

          {error && (
            <div className="mb-6 rounded-lg border border-red-700/50 bg-red-900/30 p-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="py-12 text-center text-[--color-text-dim]">Loading...</div>
          ) : (
            <>
              {/* AI Status */}
              <section className="mb-8 rounded-lg border border-[--color-border] bg-[--color-bg-secondary] p-6">
                <h2 className="mb-4 text-lg font-semibold">AI Provider</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[--color-text-dim]">Provider</span>
                    <span className="font-mono">{status?.providerName ?? 'unknown'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[--color-text-dim]">Status</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      status?.isUsingDevMode
                        ? 'bg-yellow-900/40 text-yellow-300'
                        : status?.isConfigured
                        ? 'bg-green-900/40 text-green-300'
                        : 'bg-red-900/40 text-red-300'
                    }`}>
                      {status?.isUsingDevMode
                        ? 'DEV MODE'
                        : status?.isConfigured
                        ? 'CONNECTED'
                        : 'NOT CONFIGURED'}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-[--color-text-dim]">API URL</span>
                    <span className="break-all text-right font-mono text-xs">
                      {status?.apiUrl ?? '(not set)'}
                    </span>
                  </div>
                </div>

                {saveMsg && (
                  <div className={`mt-4 text-sm ${saveMsg === 'Saved successfully' ? 'text-green-400' : 'text-red-400'}`}>
                    {saveMsg}
                  </div>
                )}
              </section>

              {/* API Key Configuration */}
              <section className="mb-8 rounded-lg border border-[--color-border] bg-[--color-bg-secondary] p-6">
                <h2 className="mb-4 text-lg font-semibold">API Key</h2>
                <p className="mb-4 text-sm text-[--color-text-dim]">
                  Your OpenCode Zen API key. Get yours from{' '}
                  <a
                    href="https://opencode.ai/workspace"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 underline"
                  >
                    opencode.ai/workspace
                  </a>
                </p>
                <div className="flex gap-3">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="flex-1 rounded-lg border border-[--color-border] bg-[--color-bg] px-3 py-2 font-mono text-sm outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={saveApiKey}
                    disabled={saving || !apiKey.trim()}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </section>

              {/* Default Model */}
              <section className="mb-8 rounded-lg border border-[--color-border] bg-[--color-bg-secondary] p-6">
                <h2 className="mb-4 text-lg font-semibold">Default Model</h2>
                <p className="mb-4 text-sm text-[--color-text-dim]">
                  Default AI model used for new chats
                </p>
                <div className="flex gap-3">
                  <select
                    value={defaultModel}
                    onChange={(e) => setDefaultModel(e.target.value)}
                    className="flex-1 rounded-lg border border-[--color-border] bg-[--color-bg] px-3 py-2 text-sm outline-none focus:border-blue-500"
                  >
                    {models.map((m) => (
                      <option key={m.modelId} value={m.modelId}>
                        {m.name} {m.isFree ? '(Free)' : ''}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={saveDefaultModel}
                    disabled={saving}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </section>

              {/* All Zen AI Models */}
              <section className="rounded-lg border border-[--color-border] bg-[--color-bg-secondary] p-6">
                <h2 className="mb-4 text-lg font-semibold">Available Models</h2>
                <p className="mb-4 text-sm text-[--color-text-dim]">
                  All {models.length} Zen AI models.{' '}
                  <span className="text-green-400">Green checkmark</span> = has chat/completions endpoint,{' '}
                  <span className="text-yellow-400">yellow</span> = needs SDK support.
                </p>

                <div className="space-y-2">
                  {models.map((model) => {
                    const isChatCompatible = model.provider === 'openai' && model.endpoint.includes('chat/completions');
                    return (
                      <div
                        key={model.modelId}
                        className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm ${
                          isChatCompatible
                            ? 'border-green-800/40 bg-green-900/10'
                            : 'border-yellow-800/40 bg-yellow-900/10'
                        }`}
                      >
                        <span className={`text-lg ${
                          isChatCompatible ? 'text-green-400' : 'text-yellow-400'
                        }`}>
                          {isChatCompatible ? '✓' : '○'}
                        </span>
                        <div className="flex-1">
                          <span className="font-medium">{model.name}</span>
                          <span className="ml-2 font-mono text-xs text-[--color-text-dim]">
                            {model.modelId}
                          </span>
                          {model.description && (
                            <span className="ml-2 text-xs text-[--color-text-dim]">
                              — {model.description}
                            </span>
                          )}
                        </div>
                        {model.isFree && (
                          <span className="rounded bg-green-900/40 px-2 py-0.5 text-xs text-green-300">
                            FREE
                          </span>
                        )}
                        {model.inputPrice != null && (
                          <span className="text-xs text-[--color-text-dim]">
                            ${model.inputPrice.toFixed(2)} / ${model.outputPrice?.toFixed(2)} per 1M tokens
                          </span>
                        )}
                        <span className="rounded bg-[--color-bg] px-2 py-0.5 text-xs text-[--color-text-dim]">
                          {model.provider}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
