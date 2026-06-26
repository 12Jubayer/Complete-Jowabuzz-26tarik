const cache = new Map();
const DEFAULT_TTL_MS = 5 * 60 * 1000;

export function getCachedProviders(key, ttlMs = DEFAULT_TTL_MS) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > ttlMs) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

export function setCachedProviders(key, data) {
  cache.set(key, { data, ts: Date.now() });
}

export function clearProviderCache() {
  cache.clear();
}
