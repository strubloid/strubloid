'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';

interface AiStatus {
  providerName: string;
  isConfigured: boolean;
  isUsingDevMode: boolean;
  apiUrl: string | null;
}

export default function SettingsPage() {
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStatus();
  }, []);

  async function loadStatus() {
    try {
      const res = await fetch('/api/ai/status');
      if (!res.ok) throw new Error('Failed to load AI status');
      const data: AiStatus = await res.json();
      setStatus(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load status';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex h-screen">
      <Sidebar />

      <main className="flex-1 overflow-y-auto bg-[--color-bg]">
        <div className="mx-auto max-w-2xl p-8">
          <h1 className="mb-2 text-2xl font-bold">Settings</h1>
          <p className="mb-8 text-sm text-[--color-text-dim]">
            Strubloid configuration and AI provider status
          </p>

          {error && (
            <div className="mb-6 rounded-lg border border-red-700/50 bg-red-900/30 p-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="py-12 text-center text-[--color-text-dim]">Loading status...</div>
          ) : (
            <>
              <section className="mb-8 rounded-lg border border-[--color-border] bg-[--color-bg-secondary] p-6">
                <h2 className="mb-4 text-lg font-semibold">AI Provider</h2>

                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[--color-text-dim]">Provider</span>
                    <span className="font-mono">{status?.providerName ?? 'unknown'}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[--color-text-dim]">Status</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        status?.isUsingDevMode
                          ? 'bg-yellow-900/40 text-yellow-300'
                          : status?.isConfigured
                          ? 'bg-green-900/40 text-green-300'
                          : 'bg-red-900/40 text-red-300'
                      }`}
                    >
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

                {status?.isUsingDevMode && (
                  <div className="mt-6 rounded-lg border border-yellow-700/50 bg-yellow-900/20 p-3 text-xs text-yellow-200">
                    <p className="mb-2 font-semibold">Dev mode is active.</p>
                    <p>
                      Set <code className="rounded bg-black/40 px-1">BIGPICKLE_API_URL</code> in your{' '}
                      <code className="rounded bg-black/40 px-1">.env</code> file and restart the dev
                      server to enable real AI responses.
                    </p>
                  </div>
                )}
              </section>

              <section className="rounded-lg border border-[--color-border] bg-[--color-bg-secondary] p-6">
                <h2 className="mb-4 text-lg font-semibold">Environment</h2>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-[--color-text-dim]">DATABASE_URL</dt>
                    <dd className="font-mono text-xs">(set)</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-[--color-text-dim]">BIGPICKLE_API_URL</dt>
                    <dd className="font-mono text-xs">{status?.apiUrl ?? '(unset)'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-[--color-text-dim]">BIGPICKLE_API_KEY</dt>
                    <dd className="font-mono text-xs">(redacted)</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-[--color-text-dim]">COMPACTION_WINDOW_DAYS</dt>
                    <dd className="font-mono text-xs">30</dd>
                  </div>
                </dl>
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
