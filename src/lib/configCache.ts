// TTL-based config cache — reduces DB reads on every AI send.
// Invalidate from settings save endpoints so staleness is at most TTL_MS.

const TTL_MS = 30_000;
const cache = new Map<string, { value: unknown; expires: number }>();

export async function cachedConfig<T>(
  key: string,
  loader: () => Promise<T>
): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value as T;
  const value = await loader();
  cache.set(key, { value, expires: Date.now() + TTL_MS });
  return value;
}

export function invalidateConfig(key?: string) {
  if (key) cache.delete(key);
  else cache.clear();
}
