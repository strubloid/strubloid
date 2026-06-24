'use client';

import { useEffect, useState, useCallback } from 'react';
import { Sidebar } from '@/components/Sidebar';

type SettingsTab = 'zen' | 'nvidia' | 'chat';

const TABS: { key: SettingsTab; label: string }[] = [
  { key: 'chat', label: 'Chat' },
  { key: 'zen', label: 'Zen (OpenCode)' },
  { key: 'nvidia', label: 'NVIDIA NIM' },
];

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

const PROVIDER_INFO: Record<string, {
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

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('chat');
  const [allModels, setAllModels] = useState<AiModel[]>([]);
  const [configs, setConfigs] = useState<Record<string, string>>({});
  const [apiKey, setApiKey] = useState('');
  const [defaultModel, setDefaultModel] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showApiKey, setShowApiKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [collapsedFree, setCollapsedFree] = useState(false);
  const [collapsedPaid, setCollapsedPaid] = useState(false);
  const [refreshingModels, setRefreshingModels] = useState(false);
  const [refreshResult, setRefreshResult] = useState<string | null>(null);

  // Clean random chats state
  const [cleanAutoEnabled, setCleanAutoEnabled] = useState(false);
  const [cleanPeriodDays, setCleanPeriodDays] = useState('30');
  const [cleaningInProgress, setCleaningInProgress] = useState(false);
  const [cleanResult, setCleanResult] = useState<string | null>(null);
  const [cleanError, setCleanError] = useState<string | null>(null);

  const info = activeTab !== 'chat' ? PROVIDER_INFO[activeTab] : null;
  const activeApiUrl = info ? configs[info.configBaseUrlKey] || info.defaultApiUrl : '';

  // Models for the active provider — enabled models always sort first within their section
  const byEnabledThenName = (a: AiModel, b: AiModel) => {
    if (a.isEnabled !== b.isEnabled) return a.isEnabled ? -1 : 1;
    return a.name.localeCompare(b.name);
  };
  const providerModels = activeTab !== 'chat' ? allModels.filter((m) => m.modelSource === activeTab) : [];
  const freeModels = providerModels.filter((m) => m.isFree).sort(byEnabledThenName);
  const paidModels = providerModels.filter((m) => !m.isFree).sort(byEnabledThenName);

  // All enabled models across providers for the Chat tab's default model selector
  const chatModels = allModels.filter((m) => m.isEnabled);

  const loadData = useCallback(async () => {
    try {
      const [modelsRes, configRes] = await Promise.all([
        fetch('/api/ai/models?all=true'),
        fetch('/api/ai/config'),
      ]);

      if (modelsRes.ok) {
        const data = await modelsRes.json();
        setAllModels(data.models);
      }
      if (configRes.ok) {
        const data = await configRes.json();
        setConfigs(data.configs);
        setApiKey(data.configs[PROVIDER_INFO.zen.configKey] || '');
        setDefaultModel(
          data.configs[PROVIDER_INFO.zen.configDefaultModelKey] ||
          data.configs[PROVIDER_INFO.nvidia.configDefaultModelKey] ||
          PROVIDER_INFO.zen.defaultModel
        );
        setCleanAutoEnabled(data.configs['random_chat_auto_clean_enabled'] === 'true');
        setCleanPeriodDays(data.configs['random_chat_clean_period_days'] || '30');
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

  // Sync form fields when switching between provider tabs
  useEffect(() => {
    if (!info) return;
    setApiKey(configs[info.configKey] || '');
    setSaveMsg(null);
    // Collapse free/paid sections that have no enabled models; expand those that do
    const pf = allModels.filter(m => m.modelSource === activeTab && m.isFree);
    const pp = allModels.filter(m => m.modelSource === activeTab && !m.isFree);
    setCollapsedFree(pf.filter(m => m.isEnabled).length === 0);
    setCollapsedPaid(pp.filter(m => m.isEnabled).length === 0);
  }, [activeTab, configs, info, allModels]);

  async function saveConfig(key: string, value: string) {
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch('/api/ai/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configs: [{ key, value }] }),
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
    if (!info || !apiKey.trim()) return;
    await saveConfig(info.configKey, apiKey.trim());
  }

  async function saveDefaultModel() {
    if (!info) return;
    await saveConfig(info.configDefaultModelKey, defaultModel);
  }

  async function saveChatDefaultModel() {
    const model = allModels.find((m) => m.modelId === defaultModel);
    if (!model) return;
    const configKey = model.modelSource === 'nvidia' ? 'nvidia_default_model' : 'zen_default_model';
    await saveConfig(configKey, defaultModel);
  }

  async function saveBaseUrl() {
    if (!info) return;
    const current = configs[info.configBaseUrlKey] || info.defaultApiUrl;
    const value = prompt(`Base URL for ${info.label}:`, current);
    if (value !== null && value.trim()) {
      await saveConfig(info.configBaseUrlKey, value.trim());
    }
  }

  async function handleRefreshModels() {
    if (activeTab === 'chat') return;
    setRefreshingModels(true);
    setRefreshResult(null);
    try {
      const res = await fetch(`/api/ai/models/refresh?provider=${activeTab}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.models) setAllModels(data.models);

      const r = data.results?.[activeTab];
      if (r) {
        const parts: string[] = [];
        if (r.added > 0) parts.push(`${r.added} new`);
        if (r.updated > 0) parts.push(`${r.updated} updated`);
        parts.push(`${r.total} total from API`);
        setRefreshResult(`✓ ${parts.join(', ')}`);
      } else if (data.results && Object.keys(data.results).length === 0) {
        setRefreshResult('No models refreshed — check API key is set');
      } else if (data.errors?.[activeTab]) {
        setRefreshResult(`✗ ${data.errors[activeTab]}`);
      }
      if (res.ok && data.errors?.[activeTab]) {
        setRefreshResult(`⚠ Partially failed: ${data.errors[activeTab]}`);
      }
    } catch (err) {
      setRefreshResult(`✗ ${err instanceof Error ? err.message : 'Request failed'}`);
    } finally {
      setRefreshingModels(false);
      setTimeout(() => setRefreshResult(null), 6000);
    }
  }

  async function toggleModelEnabled(modelId: string, enabled: boolean) {
    const model = allModels.find((m) => m.modelId === modelId);
    if (!model) return;

    try {
      const res = await fetch('/api/ai/models', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates: [{ id: model.id, isEnabled: enabled }] }),
      });
      if (res.ok) {
        const data = await res.json();
        setAllModels(data.models);
      }
    } catch {
      // ignore
    }
  }

  async function toggleSectionEnabled(models: AiModel[], enabled: boolean) {
    const updates = models
      .filter((m) => m.isEnabled !== enabled)
      .map((m) => ({ id: m.id, isEnabled: enabled }));

    if (updates.length === 0) return;

    try {
      const res = await fetch('/api/ai/models', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });
      if (res.ok) {
        const data = await res.json();
        setAllModels(data.models);
      }
    } catch {
      // ignore
    }
  }

  // Clean random chats handlers
  async function handleToggleAutoClean() {
    const newVal = !cleanAutoEnabled;
    setCleanAutoEnabled(newVal);
    await saveConfig('random_chat_auto_clean_enabled', newVal ? 'true' : 'false');
  }

  async function handleSaveCleanConfig() {
    const days = Math.max(1, Math.min(365, parseInt(cleanPeriodDays, 10) || 30));
    setCleanPeriodDays(String(days));
    await saveConfig('random_chat_clean_period_days', String(days));
  }

  async function handleCleanNow() {
    setCleaningInProgress(true);
    setCleanResult(null);
    setCleanError(null);
    try {
      const res = await fetch('/api/chats/clean-random', {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        const parts: string[] = [];
        if (data.compactedCount > 0) parts.push(`${data.compactedCount} compressed → ${data.entry?.title || 'memory'}`);
        if (data.emptyChatsCount > 0) parts.push(`${data.emptyChatsCount} empty skipped`);
        if (data.deletedCount > 0) parts.push(`${data.deletedCount} deleted`);
        setCleanResult(`✓ ${parts.join(', ')}`);
      } else {
        setCleanError(`✗ ${data.error || 'Failed to clean random chats'}`);
      }
    } catch (err) {
      setCleanError(`✗ ${err instanceof Error ? err.message : 'Request failed'}`);
    } finally {
      setCleaningInProgress(false);
      setTimeout(() => {
        setCleanResult(null);
        setCleanError(null);
      }, 8000);
    }
  }

  function renderModelSection(title: string, models: AiModel[], collapsed: boolean, onToggleCollapse: () => void, emoji: string) {
    const allEnabled = models.length > 0 && models.every((m) => m.isEnabled);
    const noneEnabled = models.every((m) => !m.isEnabled);

    return (
      <div className="mb-3 rounded-lg border border-[--color-border]">
        {/* Section header — clickable to collapse/expand */}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="flex w-full items-center gap-2 rounded-t-lg bg-[--color-bg-secondary] px-4 py-3 text-left text-sm font-medium hover:bg-[--color-bg]"
        >
          <span className="text-base">{collapsed ? '▶' : '▼'}</span>
          <span>{emoji}</span>
          <span>{title}</span>
          <span className="text-xs text-[--color-text-dim]">
            ({models.filter((m) => m.isEnabled).length}/{models.length} selected)
          </span>
        </button>

        {!collapsed && (
          <div className="border-t border-[--color-border] px-4 py-2">
            {/* Select All / None */}
            <label className="flex items-center gap-2 py-1 text-xs text-[--color-text-dim] hover:text-white cursor-pointer">
              <input
                type="checkbox"
                checked={allEnabled}
                ref={(el) => {
                  if (el) el.indeterminate = !allEnabled && !noneEnabled;
                }}
                onChange={() => toggleSectionEnabled(models, !allEnabled)}
                className="h-4 w-4 rounded border-[--color-border] bg-[--color-bg]"
              />
              {allEnabled ? 'Deselect all' : 'Select all'}
            </label>

            <div className="mt-1 space-y-1">
              {models.map((model) => (
                <label
                  key={model.modelId}
                  className="flex cursor-pointer items-center gap-3 rounded px-3 py-2 text-sm hover:bg-[--color-bg]"
                >
                  <input
                    type="checkbox"
                    checked={model.isEnabled}
                    onChange={() => toggleModelEnabled(model.modelId, !model.isEnabled)}
                    className="h-4 w-4 rounded border-[--color-border] bg-[--color-bg]"
                  />
                  <span className="font-medium">{model.name}</span>
                  <span className="font-mono text-xs text-[--color-text-dim]">{model.modelId}</span>
                  {model.description && (
                    <span className="hidden truncate text-xs text-[--color-text-dim] sm:inline">
                      — {model.description}
                    </span>
                  )}
                  {model.inputPrice != null && (
                    <span className="ml-auto text-xs text-[--color-text-dim]">
                      ${model.inputPrice.toFixed(2)} / ${model.outputPrice?.toFixed(2)} /1M tok
                    </span>
                  )}
                </label>
              ))}
              {models.length === 0 && (
                <div className="py-4 text-center text-xs text-[--color-text-dim]">
                  No models in this category
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

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

          {/* Tabs */}
          <div className="mb-8 flex gap-1 rounded-lg border border-[--color-border] bg-[--color-bg-secondary] p-1">
            {TABS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === key
                    ? 'bg-blue-600 text-white'
                    : 'text-[--color-text-dim] hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-[--color-text-dim]">Loading...</div>
          ) : (
            <>
              {activeTab !== 'chat' && (
                <>
                  {/* Provider Status */}
                  <section className="mb-8 rounded-lg border border-[--color-border] bg-[--color-bg-secondary] p-6">
                    <h2 className="mb-4 text-lg font-semibold">Provider Status</h2>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-[--color-text-dim]">Provider</span>
                        <span className="font-mono">{info!.label}</span>
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
                      {info!.apiKeyLabel}.{' '}
                      <a
                        href={info!.apiKeyHelpUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 underline"
                      >
                        {info!.apiKeyHelpText}
                      </a>
                    </p>
                    <div className="flex gap-3">
                      <div className="relative flex-1">
                        <input
                          type={showApiKey ? 'text' : 'password'}
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          placeholder={info!.apiKeyPlaceholder}
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

                  {/* Available Models - collapsible free / paid sections */}
                  <section className="rounded-lg border border-[--color-border] bg-[--color-bg-secondary] p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-semibold">Available Models</h2>
                        <p className="mt-1 text-sm text-[--color-text-dim]">
                          Check which models appear in the chat model selector. Unchecked models are hidden.
                        </p>
                      </div>
                      <button
                        onClick={handleRefreshModels}
                        disabled={refreshingModels}
                        className="flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-600 disabled:opacity-50"
                        title={`Fetch latest models from the API`}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className={refreshingModels ? 'animate-spin' : ''}
                        >
                          <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                          <path d="M3 3v5h5" />
                          <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                          <path d="M16 21h5v-5" />
                        </svg>
                        {refreshingModels ? 'Refreshing...' : 'Refresh Models'}
                      </button>
                    </div>

                    {refreshResult && (
                      <div className={`mb-3 rounded px-3 py-2 text-sm ${
                        refreshResult.startsWith('✓')
                          ? 'bg-green-900/30 text-green-300'
                          : refreshResult.startsWith('⚠')
                            ? 'bg-yellow-900/30 text-yellow-300'
                            : 'bg-red-900/30 text-red-300'
                      }`}>
                        {refreshResult}
                      </div>
                    )}

                    {renderModelSection(
                      `Free Models`,
                      freeModels,
                      collapsedFree,
                      () => setCollapsedFree((v) => !v),
                      '🆓'
                    )}

                    {renderModelSection(
                      `Paid Models`,
                      paidModels,
                      collapsedPaid,
                      () => setCollapsedPaid((v) => !v),
                      '💳'
                    )}
                  </section>
                </>
              )}

              {activeTab === 'chat' && (
                <>
                  {/* Default Model */}
                  <section className="mb-8 rounded-lg border border-[--color-border] bg-[--color-bg-secondary] p-6">
                    <h2 className="mb-4 text-lg font-semibold">Default AI Model</h2>
                    <p className="mb-4 text-sm text-[--color-text-dim]">
                      Default AI model used for new chats. Choose from all available models across providers.
                    </p>
                    <div className="flex gap-3">
                      <select
                        value={defaultModel}
                        onChange={(e) => setDefaultModel(e.target.value)}
                        className="flex-1 rounded-lg border border-[--color-border] bg-[--color-bg] px-3 py-2 text-sm outline-none focus:border-blue-500"
                      >
                        {chatModels.length === 0 && (
                          <option value="">No models available</option>
                        )}
                        {chatModels.map((m) => (
                          <option key={m.modelId} value={m.modelId}>
                            {m.name} ({m.modelSource === 'zen' ? 'Zen' : 'NVIDIA'}) {m.isFree ? '(Free)' : ''}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={saveChatDefaultModel}
                        disabled={saving}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </section>

                  {/* Clean Random Chats */}
                  <section className="rounded-lg border border-[--color-border] bg-[--color-bg-secondary] p-6">
                    <h2 className="mb-4 text-lg font-semibold">
                      🧹 Clean Random Chats
                    </h2>
                    <p className="mb-4 text-sm text-[--color-text-dim]">
                      Compact all random chats into memory entries and remove them.
                      The knowledge from random chats is preserved as compressed
                      memories so the AI Brain can still reference it.
                    </p>

                    <div className="space-y-4">
                      {/* Auto-clean toggle + periodicity */}
                      <div className="rounded-lg border border-[--color-border] bg-[--color-bg] p-4">
                        <h3 className="mb-3 text-sm font-medium">
                          Automatic Cleaning
                        </h3>
                        <div className="space-y-3">
                          <label className="flex cursor-pointer items-center gap-3">
                            <input
                              type="checkbox"
                              checked={cleanAutoEnabled}
                              onChange={handleToggleAutoClean}
                              className="h-4 w-4 rounded border-[--color-border] bg-[--color-bg]"
                            />
                            <span className="text-sm">
                              Auto-clean random chats periodically
                            </span>
                          </label>

                          <div className="flex items-center gap-3">
                            <label className="text-sm text-[--color-text-dim]">
                              Every
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="365"
                              value={cleanPeriodDays}
                              onChange={(e) => setCleanPeriodDays(e.target.value)}
                              className="w-20 rounded-lg border border-[--color-border] bg-[--color-bg] px-3 py-1.5 text-center text-sm outline-none focus:border-blue-500"
                              disabled={!cleanAutoEnabled}
                            />
                            <label className="text-sm text-[--color-text-dim]">
                              days
                            </label>
                            <button
                              onClick={handleSaveCleanConfig}
                              disabled={saving}
                              className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
                            >
                              {saving ? 'Saving...' : 'Save'}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Manual clean button */}
                      <div className="rounded-lg border border-[--color-border] bg-[--color-bg] p-4">
                        <h3 className="mb-3 text-sm font-medium">
                          Manual Clean
                        </h3>
                        <p className="mb-3 text-xs text-[--color-text-dim]">
                          Compact all current random chats into memory entries and
                          delete them immediately.
                        </p>
                        <button
                          onClick={handleCleanNow}
                          disabled={cleaningInProgress}
                          className="flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-500 disabled:opacity-50"
                        >
                          {cleaningInProgress ? (
                            <>
                              <svg
                                className="animate-spin"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                                <path d="M3 3v5h5" />
                              </svg>
                              Cleaning...
                            </>
                          ) : (
                            '🧹 Clean Now'
                          )}
                        </button>
                      </div>

                      {/* Result / Error messages */}
                      {cleanResult && (
                        <div className="rounded-lg bg-green-900/30 px-4 py-3 text-sm text-green-300">
                          {cleanResult}
                        </div>
                      )}
                      {cleanError && (
                        <div className="rounded-lg bg-red-900/30 px-4 py-3 text-sm text-red-300">
                          {cleanError}
                        </div>
                      )}
                    </div>
                  </section>
                </>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
