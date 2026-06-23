'use client';

import { useEffect, useState, useCallback } from 'react';
import { Sidebar } from '@/components/Sidebar';

type ProviderTab = 'zen' | 'nvidia';

interface AiModel {
  id: number;
  modelId: string;
  name: string;
  endpoint: string;
  provider: string;
  modelSource: string;
  description: string | null;
  isEnabled: boolean;
  isFree: boolean;
  inputPrice: number | null;
  outputPrice: number | null;
}

interface NvidiaApiModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

const PROVIDER_INFO: Record<ProviderTab, {
  label: string;
  configKey: string;
  configBaseUrlKey: string;
  configDefaultModelKey: string;
  apiKeyLabel: string;
  apiKeyPlaceholder: string;
  apiKeyHelpUrl: string;
  apiKeyHelpText: string;
  defaultApiUrl: string;
  defaultModel: string;
}> = {
  zen: {
    label: 'Zen (OpenCode)',
    configKey: 'zen_api_key',
    configBaseUrlKey: 'zen_api_base_url',
    configDefaultModelKey: 'zen_default_model',
    apiKeyLabel: 'OpenCode Zen API Key',
    apiKeyPlaceholder: 'sk-...',
    apiKeyHelpUrl: 'https://opencode.ai/workspace',
    apiKeyHelpText: 'Get yours from opencode.ai/workspace',
    defaultApiUrl: 'https://opencode.ai/zen',
    defaultModel: 'big-pickle',
  },
  nvidia: {
    label: 'NVIDIA NIM',
    configKey: 'nvidia_api_key',
    configBaseUrlKey: 'nvidia_api_base_url',
    configDefaultModelKey: 'nvidia_default_model',
    apiKeyLabel: 'NVIDIA NIM API Key',
    apiKeyPlaceholder: 'nvapi-...',
    apiKeyHelpUrl: 'https://build.nvidia.com',
    apiKeyHelpText: 'Get yours from build.nvidia.com',
    defaultApiUrl: 'https://integrate.api.nvidia.com/v1',
    defaultModel: 'meta/llama-3.3-70b-instruct',
  },
};

/** Format a model ID like "meta/llama-3.3-70b-instruct" into a display name. */
function formatNvidiaModelName(id: string): string {
  const parts = id.split('/');
  const name = parts.length > 1 ? parts[1] : id;
  return name
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<ProviderTab>('zen');
  const [dbModels, setDbModels] = useState<AiModel[]>([]);
  const [nvidiaLiveModels, setNvidiaLiveModels] = useState<NvidiaApiModel[]>([]);
  const [nvidiaModelsLoading, setNvidiaModelsLoading] = useState(false);
  const [configs, setConfigs] = useState<Record<string, string>>({});
  const [apiKey, setApiKey] = useState('');
  const [defaultModel, setDefaultModel] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showApiKey, setShowApiKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const info = PROVIDER_INFO[activeTab];
  const activeApiUrl = configs[info.configBaseUrlKey] || info.defaultApiUrl;

  // For Zen: models come from DB
  const zenModels = dbModels.filter((m) => m.modelSource === 'zen');
  const nvidiaModels = nvidiaLiveModels;

  const loadData = useCallback(async () => {
    try {
      const [modelsRes, configRes] = await Promise.all([
        fetch('/api/ai/models'),
        fetch('/api/ai/config'),
      ]);

      if (modelsRes.ok) {
        const data = await modelsRes.json();
        setDbModels(data.models);
      }
      if (configRes.ok) {
        const data = await configRes.json();
        setConfigs(data.configs);
        setApiKey(data.configs[PROVIDER_INFO.zen.configKey] || '');
        setDefaultModel(data.configs[PROVIDER_INFO.zen.configDefaultModelKey] || PROVIDER_INFO.zen.defaultModel);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch NVIDIA models through our server proxy (avoids CORS)
  const fetchNvidiaModels = useCallback(async () => {
    setNvidiaModelsLoading(true);
    try {
      const res = await fetch('/api/ai/nvidia-models');
      if (res.ok) {
        const data = await res.json();
        setNvidiaLiveModels(data.data || []);
      }
    } catch {
      // If fetch fails, models stay empty
    } finally {
      setNvidiaModelsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // When switching to NVIDIA tab, fetch live models
  useEffect(() => {
    if (activeTab === 'nvidia' && nvidiaLiveModels.length === 0 && !nvidiaModelsLoading) {
      fetchNvidiaModels();
    }
  }, [activeTab, nvidiaLiveModels.length, nvidiaModelsLoading, fetchNvidiaModels]);

  // Sync form fields when switching tabs
  useEffect(() => {
    setApiKey(configs[info.configKey] || '');
    setDefaultModel(configs[info.configDefaultModelKey] || info.defaultModel);
    setSaveMsg(null);
  }, [activeTab, configs, info]);

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
    await saveConfig(info.configKey, apiKey.trim());
  }

  async function saveDefaultModel() {
    await saveConfig(info.configDefaultModelKey, defaultModel);
  }

  async function saveBaseUrl() {
    const current = configs[info.configBaseUrlKey] || info.defaultApiUrl;
    const value = prompt(`Base URL for ${info.label}:`, current);
    if (value !== null && value.trim()) {
      await saveConfig(info.configBaseUrlKey, value.trim());
      // Refresh NVIDIA models when URL changes
      if (activeTab === 'nvidia') {
        setNvidiaLiveModels([]);
      }
    }
  }

  const currentModels = activeTab === 'zen' ? zenModels : nvidiaModels;
  const currentModelsCount = activeTab === 'zen'
    ? zenModels.length
    : nvidiaModels.length;

  return (
    <div className="flex h-screen">
      <Sidebar />

      <main className="flex-1 overflow-y-auto bg-[--color-bg]">
        <div className="mx-auto max-w-4xl p-8">
          <h1 className="mb-2 text-2xl font-bold">Settings</h1>
          <p className="mb-8 text-sm text-[--color-text-dim]">
            Strubloid configuration and AI provider management
          </p>

          {error && (
            <div className="mb-6 rounded-lg border border-red-700/50 bg-red-900/30 p-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* Provider Tabs */}
          <div className="mb-8 flex gap-1 rounded-lg border border-[--color-border] bg-[--color-bg-secondary] p-1">
            {(Object.keys(PROVIDER_INFO) as ProviderTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-blue-600 text-white'
                    : 'text-[--color-text-dim] hover:text-white'
                }`}
              >
                {PROVIDER_INFO[tab].label}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-[--color-text-dim]">Loading...</div>
          ) : (
            <>
              {/* Provider Status */}
              <section className="mb-8 rounded-lg border border-[--color-border] bg-[--color-bg-secondary] p-6">
                <h2 className="mb-4 text-lg font-semibold">Provider Status</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[--color-text-dim]">Provider</span>
                    <span className="font-mono">{info.label}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[--color-text-dim]">Status</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      !apiKey
                        ? 'bg-red-900/40 text-red-300'
                        : 'bg-green-900/40 text-green-300'
                    }`}>
                      {apiKey ? 'KEY STORED' : 'NO KEY'}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-[--color-text-dim]">API URL</span>
                    <span className="break-all text-right font-mono text-xs">
                      {activeApiUrl}
                      <button
                        onClick={saveBaseUrl}
                        className="ml-2 text-blue-400 underline hover:text-blue-300"
                        title="Change base URL"
                      >
                        edit
                      </button>
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
                  {info.apiKeyLabel}.{' '}
                  <a
                    href={info.apiKeyHelpUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 underline"
                  >
                    {info.apiKeyHelpText}
                  </a>
                </p>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder={info.apiKeyPlaceholder}
                      className="w-full rounded-lg border border-[--color-border] bg-[--color-bg] px-3 py-2 font-mono text-sm outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[--color-text-dim] hover:text-white"
                      title={showApiKey ? 'Hide API key' : 'Show API key'}
                    >
                      {showApiKey ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                          <line x1="1" y1="1" x2="23" y2="23"/>
                          <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/>
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      )}
                    </button>
                  </div>
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
                  Default AI model used for new chats when this provider is active
                </p>
                <div className="flex gap-3">
                  <select
                    value={defaultModel}
                    onChange={(e) => setDefaultModel(e.target.value)}
                    className="flex-1 rounded-lg border border-[--color-border] bg-[--color-bg] px-3 py-2 text-sm outline-none focus:border-blue-500"
                  >
                    {currentModelsCount === 0 && (
                      <option value="">No models available</option>
                    )}
                    {activeTab === 'zen' && (zenModels as AiModel[]).map((m) => (
                      <option key={m.modelId} value={m.modelId}>
                        {m.name} {m.isFree ? '(Free)' : ''}
                      </option>
                    ))}
                    {activeTab === 'nvidia' && (nvidiaModels as NvidiaApiModel[]).map((m) => (
                      <option key={m.id} value={m.id}>
                        {formatNvidiaModelName(m.id)}
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

              {/* All Models for this Provider */}
              <section className="rounded-lg border border-[--color-border] bg-[--color-bg-secondary] p-6">
                <h2 className="mb-4 text-lg font-semibold">Available Models</h2>

                {activeTab === 'zen' && (
                  <>
                    <p className="mb-4 text-sm text-[--color-text-dim]">
                      All {zenModels.length} {info.label} models seeded from OpenCode Zen.
                    </p>
                    <div className="space-y-2">
                      {(zenModels as AiModel[]).map((model) => (
                        <div
                          key={model.modelId}
                          className="flex items-center gap-3 rounded-lg border border-green-800/40 bg-green-900/10 px-4 py-3 text-sm"
                        >
                          <span className="text-lg text-green-400">✓</span>
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
                            <span className="rounded bg-green-900/40 px-2 py-0.5 text-xs text-green-300">FREE</span>
                          )}
                        </div>
                      ))}
                      {zenModels.length === 0 && (
                        <div className="py-8 text-center text-sm text-[--color-text-dim]">
                          No Zen models seeded. Run the seed script.
                        </div>
                      )}
                    </div>
                  </>
                )}

                {activeTab === 'nvidia' && (
                  <>
                    <p className="mb-4 text-sm text-[--color-text-dim]">
                      {nvidiaModelsLoading
                        ? 'Loading models from NVIDIA...'
                        : nvidiaModels.length > 0
                        ? `${nvidiaModels.length} models available via NVIDIA NIM at ${activeApiUrl}`
                        : `No models loaded. Try fetching from the base URL above. Click "reload" to try again.`
                      }
                      {!nvidiaModelsLoading && (
                        <button
                          onClick={() => { setNvidiaLiveModels([]); fetchNvidiaModels(); }}
                          className="ml-2 text-blue-400 underline hover:text-blue-300"
                        >
                          reload
                        </button>
                      )}
                    </p>
                    <div className="space-y-2">
                      {(nvidiaModels as NvidiaApiModel[]).map((model) => (
                        <div
                          key={model.id}
                          className="flex items-center gap-3 rounded-lg border border-green-800/40 bg-green-900/10 px-4 py-3 text-sm"
                        >
                          <span className="text-lg text-green-400">✓</span>
                          <div className="flex-1">
                            <span className="font-medium">{formatNvidiaModelName(model.id)}</span>
                            <span className="ml-2 font-mono text-xs text-[--color-text-dim]">
                              {model.id}
                            </span>
                          </div>
                          <span className="rounded bg-[--color-bg] px-2 py-0.5 text-xs text-[--color-text-dim]">
                            {model.owned_by}
                          </span>
                        </div>
                      ))}
                      {nvidiaModels.length === 0 && !nvidiaModelsLoading && (
                        <div className="py-8 text-center text-sm text-[--color-text-dim]">
                          No models loaded from NVIDIA API.
                        </div>
                      )}
                      {nvidiaModelsLoading && (
                        <div className="py-8 text-center text-sm text-[--color-text-dim]">
                          Loading...
                        </div>
                      )}
                    </div>
                  </>
                )}
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
