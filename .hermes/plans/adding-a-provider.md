# Adding a New AI Provider

This guide covers every step to wire a new provider (e.g. **Go OpenCode**) into Strubloid, end to end.

---

## Overview

The app uses a **single dispatch** layer (`getClientForModel`) that routes all AI calls to one client class (`ZenAIClient`), configured per-provider. Adding a provider means:

1. Adding its config loader (DB keys + env fallback)
2. Adding its model fetcher to the refresh endpoint
3. Adding its free/paid classification logic
4. Registering it in the Settings UI

No new client class is needed — `ZenAIClient` is OpenAI-API-compatible and handles all providers via the `TransportConfig`.

---

## Step 1 — Provider Config

Create `src/ais/<provider>/<Provider>Config.ts` (e.g. `src/ais/go-oc/GoOCConfig.ts`).

```ts
// src/ais/<provider>/<Provider>Config.ts
import { db } from '@/lib/db';

export interface ProviderConfig {
  apiKey: string;
  apiBaseUrl: string;
  defaultModel: string;
}

const DEFAULT_BASE_URL = 'https://...';      // provider's base URL
const DEFAULT_MODEL   = '...';               // fallback default model

export async function loadProviderConfig(): Promise<ProviderConfig | null> {
  const configKey   = '<provider>_api_key';           // e.g. 'go_oc_api_key'
  const baseUrlKey  = '<provider>_api_base_url';
  const modelKey    = '<provider>_default_model';

  try {
    const rows = await db.config.findMany({
      where: { key: { in: [configKey, baseUrlKey, modelKey] } },
    });
    const configMap = new Map(rows.map(r => [r.key, r.value]));

    const apiKey = configMap.get(configKey) || process.env[configKey.toUpperCase()] || '';
    if (!apiKey) return null;

    return {
      apiKey,
      apiBaseUrl:  configMap.get(baseUrlKey) || DEFAULT_BASE_URL,
      defaultModel: configMap.get(modelKey)   || DEFAULT_MODEL,
    };
  } catch {
    // DB unavailable (SSR/build) — env-only fallback
    const apiKey = process.env[configKey.toUpperCase()] || '';
    if (!apiKey) return null;
    return { apiKey, apiBaseUrl: DEFAULT_BASE_URL, defaultModel: DEFAULT_MODEL };
  }
}
```

**DB config keys** (stored in the `Config` table, saved via Settings UI):
- `<provider>_api_key`         — the API key
- `<provider>_api_base_url`   — base URL (optional override)
- `<provider>_default_model` — default model ID

---

## Step 2 — Register Config in `getProviderClient.ts`

Open `src/ais/getProviderClient.ts` and:

**a)** Import the new config loader:
```ts
import { loadProviderConfig } from '@/ais/<provider>/<Provider>Config';
```

**b)** Add a branch in `getClientForModel`:
```ts
if (source === '<provider>') {
  const config = await cachedConfig('<provider>_config', loadProviderConfig);
  return { client: new ZenAIClient(config), model };
}
```

The `modelSource` field on the DB record is what triggers the dispatch. When refreshing models, set `modelSource` to the provider's key (e.g. `'go-oc'`).

---

## Step 3 — Add Refresh Logic

Open `src/app/api/ai/models/refresh/route.ts` and add:

**a)** A classifier function:
```ts
function isProviderModelFree(modelId: string): boolean {
  // Return true for free-tier models, false for paid.
  // Use naming patterns the provider follows.
  if (modelId === 'my-free-default') return true;
  if (modelId.endsWith('-free')) return true;
  return false;
}
```

**b)** A fetcher function:
```ts
async function fetchProviderModels(): Promise<{ models: RawModel[]; source: string }> {
  const { loadProviderConfig } = await import('@/ais/<provider>/<Provider>Config');
  const config = await loadProviderConfig();
  if (!config?.apiKey) throw new Error('<Provider> API key is not configured');

  const res = await fetch(`${config.apiBaseUrl}/v1/models`, {
    headers: { Authorization: `Bearer ${config.apiKey}` },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`<Provider> API returned ${res.status}`);

  const data = await res.json();
  return { models: data.data || [], source: '<provider>' };
}
```

The API is expected to return the **OpenAI `/v1/models` response shape**:
```json
{
  "data": [
    { "id": "model-id-here", "owned_by": "organization-or-creator" },
    ...
  ]
}
```

If the provider uses a different shape, transform it in the fetcher before returning.

**c)** Wire it in the route handler (inside the `for` loop):
```ts
if (p === '<provider>') {
  fetched = await fetchProviderModels();
}
```

**d)** Add the post-classify SQL fix (fixes `isFree` on existing DB rows that the API didn't return):
```ts
if (p === '<provider>') {
  const freeClause = `WHEN modelId LIKE '%-free' THEN 1`; // adapt to provider patterns
  fixed = await db.$executeRawUnsafe(
    `UPDATE AiModel SET isFree = CASE ${freeClause} ELSE 0 END
     WHERE modelSource = ? AND isFree <> CASE ${freeClause} ELSE 0 END`,
    fetched.source,
  );
}
```

**e)** Update the default providers list:
```ts
// In POST handler, expand the list:
const providersToRefresh: string[] = provider ? [provider] : ['zen', 'nvidia', '<provider>'];
```

---

## Step 4 — Settings UI

Open `src/components/settings/SettingsConsole.tsx` and:

**a)** Add the tab key:
```tsx
type SettingsTab = 'zen' | 'nvidia' | 'chat' | '<provider>';
```

**b)** Add tab label:
```tsx
{ key: '<provider>', label: '<Provider Label>' }
```

**c)** Add to `PROVIDER_INFO`:
```tsx
<provider>: {
  label: '<Provider Display Name>',
  configKey: '<provider>_api_key',
  configBaseUrlKey: '<provider>_api_base_url',
  configDefaultModelKey: '<provider>_default_model',
  apiKeyLabel: '<Provider> API Key',
  apiKeyPlaceholder: 'sk-...',
  apiKeyHelpUrl: 'https://...',
  apiKeyHelpText: 'Get your key from ...',
  defaultApiUrl: 'https://...',
  defaultModel: 'default-model-id',
}
```

---

## Step 5 — Frontend Cache Sync

After adding a new provider, newly fetched models must be visible in the chat model selector without a page reload. This requires two changes:

**a) In `handleRefreshModels()` (SettingsConsole.tsx)** — after a successful refresh, dispatch a custom event and clear the session cache:

```tsx
// After the fetch succeeds:
try { sessionStorage.removeItem('strubloid_models'); } catch { /* ignore */ }
window.dispatchEvent(new CustomEvent('models-refreshed'));
```

**b) In `ChatComposer.tsx`** — listen for the event and reload models:

```tsx
useEffect(() => {
  function onModelsRefreshed() {
    try { sessionStorage.removeItem('strubloid_models'); } catch { /* ignore */ }
    setModelsLoaded(false);
    setModels([]);
    loadModels();
  }
  window.addEventListener('models-refreshed', onModelsRefreshed);
  return () => window.removeEventListener('models-refreshed', onModelsRefreshed);
}, []);
```

**c) In `HeaderBar.tsx`** — same pattern (model selector in the top bar):

```tsx
useEffect(() => {
  function onModelsRefreshed() {
    try { sessionStorage.removeItem('strubloid_models'); } catch { /* ignore */ }
    fetch('/api/ai/models')
      .then((r) => r.json())
      .then((data) => { if (data.models) setModels(data.models); })
      .catch(() => {});
  }
  window.addEventListener('models-refreshed', onModelsRefreshed);
  return () => window.removeEventListener('models-refreshed', onModelsRefreshed);
}, []);
```

**d) In `HackerChatPanel.tsx`** — same pattern (hackermode inline chat):

```tsx
useEffect(() => {
  function onModelsRefreshed() {
    try { sessionStorage.removeItem('strubloid_models'); } catch { /* ignore */ }
    setModelsLoaded(false);
    setModels([]);
    void loadModels();
  }
  window.addEventListener('models-refreshed', onModelsRefreshed);
  return () => window.removeEventListener('models-refreshed', onModelsRefreshed);
}, [loadModels]);
```

This pattern must be applied in every component that loads the model list. Without it, newly fetched models appear in the DB but the model selector stays stale.

---

## Summary of Files Changed

| File | Change |
|------|--------|
| `src/ais/<provider>/<Provider>Config.ts` | **New** — config loader (DB + env fallback) |
| `src/ais/getProviderClient.ts` | Import + dispatch branch |
| `src/app/api/ai/models/refresh/route.ts` | Fetcher + classifier + SQL fix + provider list |
| `src/components/settings/SettingsConsole.tsx` | Tab, tab key (⚠ quoted `'go-oc'`), `PROVIDER_INFO` entry, cache-invalidation on refresh |
| `src/components/ChatComposer.tsx` | `models-refreshed` event listener to reload models after provider refresh |
| `src/components/LayoutShell/HeaderBar.tsx` | `models-refreshed` event listener + sessionStorage clear |
| `src/app/hall/components/chat/HackerChatPanel.tsx` | `models-refreshed` event listener + sessionStorage clear |

---

## What the App Expects from a Provider

- **API shape**: OpenAI-compatible `/v1/chat/completions` for inference, `/v1/models` for listing
- **Auth**: Bearer token in `Authorization` header
- **Response format**: Standard SSE with `data: {...}` chunks for streaming; final chunk contains `usage` field with `prompt_tokens`, `completion_tokens`, `total_tokens`
- **Model IDs**: Must be stable strings used as `model` in chat completions requests

If a provider deviates (custom auth headers, different response shape), wrap it in the fetcher/transformer before it reaches `ZenAIClient`.

---

## Optional: Free/Paid Pricing Data

The `AiModel` table has nullable `inputPrice` and `outputPrice` fields (`$ / 1M tokens`). Currently all providers use naming-pattern heuristics for free/paid classification. If a provider exposes per-model pricing in the `/v1/models` response (e.g. as custom fields), you can extract and store it during the upsert step in `upsertModels()`.
