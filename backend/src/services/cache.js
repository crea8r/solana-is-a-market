const cache = new Map();

export function setCache(key, value) {
  cache.set(key, { value, ts: Date.now() });
}

export function getCache(key) {
  return cache.get(key) || null;
}

export function isFresh(key, ttlMs) {
  const hit = cache.get(key);
  if (!hit) return false;
  return Date.now() - hit.ts <= ttlMs;
}
