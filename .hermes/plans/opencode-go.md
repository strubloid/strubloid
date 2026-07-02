# OpenCode Go — Provider Integration Guide

Based on [adding-a-provider.md](./adding-a-provider.md), this documents how to add OpenCode Go as a provider to Strubloid.

---

## What Is OpenCode Go

- **Pricing**: $5 first month, $10/month (subscription)
- **Models included**: GLM-5.2, GLM-5.1, Kimi K2.7 Code, Kimi K2.6, MiMo-V2.5-Pro, MiMo-V2.5, Qwen3.7 Max, Qwen3.7 Plus, Qwen3.6 Plus, MiniMax M3, MiniMax M2.7, DeepSeek V4 Pro, DeepSeek V4 Flash
- **Model providers behind the scenes**: DeepInfra, Fireworks AI, Z.ai, Moonshot AI, Xiaomi MiMo, Alibaba Cloud Model Studio, MiniMax, DeepSeek
- **Free vs paid**: Go is a subscription tier. All Go models are "paid" in the sense they require a Go subscription — there are no `-free` suffixed models for Go.

---

## Key Difference from Zen

Zen has free models (`big-pickle`, `*-free` suffix). Go has no free tier — every model requires an active Go subscription. Therefore:

- **Free/paid classifier**: All Go models should be `isFree = false`. No naming pattern-based heuristics needed.
- **API key**: Go uses a different API key than Zen. Zen key does NOT work for Go and vice versa.
- **API base URL**: Different from Zen. Must be confirmed from the Go workspace/API docs (see below).
- **Setup URL**: `https://opencode.ai/go` → subscribe → workspace for API key

---

## API Details (To Confirm)

The OpenCode Go API is expected to follow the same OpenAI-compatible shape as Zen:

| Endpoint | Purpose |
|----------|---------|
| `GET <base>/v1/models` | List available models |
| `POST <base>/v1/chat/completions` | Send a chat message |

**Base URL pattern** (to verify — likely `https://opencode.ai/go` or `https://opencode.ai/go/api`):
```
https://opencode.ai/go/v1/models
```

**Auth**: `Authorization: Bearer <go_api_key>`

**Response shape** for `/v1/models`:
```json
{
  "data": [
    { "id": "GLM-5.2", "owned_by": "DeepInfra" },
    { "id": "Kimi-K2.7-Code", "owned_by": "Moonshot AI" },
    ...
  ]
}
```

- **API base URL**: `https://opencode.ai/zen/go`
- **Model ID format**: `opencode-go/<model-id>` (e.g. `opencode-go/kimi-k2.7-code`)
- **API key**: From the OpenCode workspace under the Go subscription (same workspace as Zen)
- **Free/paid**: All Go models are paid (subscription tier, no free suffix)

---

## Step-by-Step Implementation

### Step 1 — Config File

Create `src/ais/go-oc/GoOCConfig.ts`:

```ts
// src/ais/go-oc/GoOCConfig.ts
import { db } from '@/lib/db';

export interface GoOCConfig {
  apiKey: string;
  apiBaseUrl: string;
  defaultModel: string;
}

const DEFAULT_BASE_URL = 'https://opencode.ai/zen/go';
const DEFAULT_MODEL   = 'opencode-go/minimax-m3';

export async function loadGoOCConfig(): Promise<GoOCConfig | null> {
  const configKey  = 'go_oc_api_key';
  const baseUrlKey = 'go_oc_api_base_url';
  const modelKey   = 'go_oc_default_model';

  try {
    const rows = await db.config.findMany({
      where: { key: { in: [configKey, baseUrlKey, modelKey] } },
    });
    const configMap = new Map(rows.map(r => [r.key, r.value]));

    const apiKey = configMap.get(configKey) || process.env.GO_OC_API_KEY || '';
    if (!apiKey) return null;

    return {
      apiKey,
      apiBaseUrl:  configMap.get(baseUrlKey) || DEFAULT_BASE_URL,
      defaultModel: configMap.get(modelKey)  || DEFAULT_MODEL,
    };
  } catch {
    const apiKey = process.env.GO_OC_API_KEY || '';
    if (!apiKey) return null;
    return { apiKey, apiBaseUrl: DEFAULT_BASE_URL, defaultModel: DEFAULT_MODEL };
  }
}
```

**DB config keys to save via Settings UI**:
- `go_oc_api_key` — Go API key
- `go_oc_api_base_url` — base URL (default: `https://opencode.ai/go`)
- `go_oc_default_model` — default model ID

---

### Step 2 — Register in `getProviderClient.ts`

```ts
// src/ais/getProviderClient.ts
import { loadGoOCConfig } from '@/ais/go-oc/GoOCConfig';

// In getClientForModel():
if (source === 'go-oc') {
  const config = await cachedConfig('go_oc_config', loadGoOCConfig);
  return { client: new ZenAIClient(config), model };
}
```

The `modelSource` value `'go-oc'` is set during model refresh.

---

### Step 3 — Refresh Logic

In `src/app/api/ai/models/refresh/route.ts`:

**a) Classifier (all Go models are paid — no free tier)**:
```ts
function isGoOCModelFree(modelId: string): boolean {
  // Go has no free models — all require an active subscription
  return false;
}
```

**b) Fetcher**:
```ts
async function fetchGoOCModels(): Promise<{ models: RawModel[]; source: string }> {
  const { loadGoOCConfig } = await import('@/ais/go-oc/GoOCConfig');
  const config = await loadGoOCConfig();
  if (!config?.apiKey) throw new Error('OpenCode Go API key is not configured');

  // ⚠ Verify this endpoint — confirm from https://opencode.ai/go docs
  const res = await fetch(`${config.apiBaseUrl}/v1/models`, {
    headers: { Authorization: `Bearer ${config.apiKey}` },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`OpenCode Go API returned ${res.status}`);

  const data = await res.json();
  return { models: data.data || [], source: 'go-oc' };
}
```

**c) Wire in POST handler**:
```ts
// In the for loop:
if (p === 'go-oc') {
  fetched = await fetchGoOCModels();
}
```

**d) Post-classify SQL fix (trivial — all false)**:
```ts
if (p === 'go-oc') {
  // All Go models are paid — ensure no stale isFree=true
  fixed = await db.$executeRawUnsafe(
    `UPDATE AiModel SET isFree = 0 WHERE modelSource = ? AND isFree <> 0`,
    'go-oc',
  );
}
```

**e) Expand provider list**:
```ts
const providersToRefresh: string[] = provider ? [provider] : ['zen', 'nvidia', 'go-oc'];
```

---

### Step 4 — Settings UI

In `src/components/settings/SettingsConsole.tsx`:

```tsx
// Tab key
type SettingsTab = 'zen' | 'nvidia' | 'go-oc' | 'chat';

// Tab label
{ key: 'go-oc', label: 'Go (OpenCode)' }

// PROVIDER_INFO entry — NOTE: 'go-oc' must be quoted as a JS computed key
'go-oc': {
  label: 'Go (OpenCode)',
  configKey: 'go_oc_api_key',
  configBaseUrlKey: 'go_oc_api_base_url',
  configDefaultModelKey: 'go_oc_default_model',
  apiKeyLabel: 'OpenCode Go API Key',
  apiKeyPlaceholder: 'go-...',
  apiKeyHelpUrl: 'https://opencode.ai/go',
  apiKeyHelpText: 'Subscribe at opencode.ai/go, then get your key from the workspace',
  defaultApiUrl: 'https://opencode.ai/zen/go',
  defaultModel: 'opencode-go/minimax-m3'
}
```

> ⚠ `'go-oc'` must be a quoted key (`'go-oc': {...}`) because hyphens are not valid bare JS identifiers. Using `go_oc` as the key will cause a `Cannot read properties of undefined (reading 'label')` runtime error when the tab is selected.

---

### Step 5 — Frontend Cache Sync

After the first model refresh for a new provider, `ChatComposer` needs to pick up the new models without a page reload. See `adding-a-provider.md` Step 5 for the full pattern. The two changes needed are:

**In SettingsConsole.tsx `handleRefreshModels()`** (already applied to Go, always do this):
```tsx
try { sessionStorage.removeItem('strubloid_models'); } catch { /* ignore */ }
window.dispatchEvent(new CustomEvent('models-refreshed'));
```

**In ChatComposer.tsx** (already applied, always do this when adding a new provider):
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

Without this, Go models exist in the DB but never appear in the chat model selector.

---

## Verification Checklist

After implementation, verify:

- [ ] API key saves correctly to DB (`go_oc_api_key` in Config table)
- [ ] `POST /api/ai/models/refresh?provider=go-oc` returns model list from Go API
- [ ] Models appear in Settings UI under "Go (OpenCode)" tab after clicking Refresh Models
- [ ] Models can be enabled/disabled and toggle persists
- [ ] **After refresh, Go models appear in the chat model selector without page reload** (models-refreshed event fires)
- [ ] Sending a chat with a Go model routes correctly through `ZenAIClient`
- [ ] Token usage (`prompt_tokens`, `completion_tokens`, `total_tokens`) is captured

---

## Known Unknowns to Resolve First

Before implementing, confirm these by visiting the Go docs/workspace:

1. **API base URL**: Is it `https://opencode.ai/go` or something like `https://opencode.ai/go/api`?
2. **API key format**: What does the key look like? (prefix, length)
3. **Model IDs**: What exact IDs does `/v1/models` return? (e.g. `GLM-5.2` vs `glm-5.2`)
4. **Response shape**: Does it match the standard OpenAI `/v1/models` JSON shape?
5. **Streaming support**: Does Go support SSE streaming for `/v1/chat/completions`?
6. **Default model**: Which model should be the default for Go?

Check `https://opencode.ai/go` → Docs link, or `https://opencode.ai/go/workspace` (if accessible) for the authoritative answers.
