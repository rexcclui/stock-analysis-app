// Simple in-memory cache with time-based expiration + stats
const cache = new Map();
const cacheStats = {
  hits: {}, // prefix -> count
  misses: {}, // prefix -> count
  totalHits: 0,
  totalMisses: 0,
};

/**
 * Get cached data if it exists and hasn't expired
 * @param {string} key - Cache key
 * @returns {any|null} - Cached data or null if expired/not found
 */
export function getCache(key) {
  const cached = cache.get(key);
  const prefix = key.split(':')[0] || 'unknown';
  if (!cached) {
    cacheStats.misses[prefix] = (cacheStats.misses[prefix] || 0) + 1;
    cacheStats.totalMisses++;
    return null;
  }

  const now = Date.now();
  if (now > cached.expiresAt) {
    cache.delete(key);
    cacheStats.misses[prefix] = (cacheStats.misses[prefix] || 0) + 1; // expired counts as miss
    cacheStats.totalMisses++;
    return null;
  }

  cacheStats.hits[prefix] = (cacheStats.hits[prefix] || 0) + 1;
  cacheStats.totalHits++;
  // No console spam; callers can log if needed
  return cached.data;
}

/**
 * Set cache data with expiration time
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 * @param {number} ttlMinutes - Time to live in minutes (default: 1440 = 24 hours)
 */
export function setCache(key, data, ttlMinutes = 1440) {
  const expiresAt = Date.now() + ttlMinutes * 60 * 1000;
  cache.set(key, { data, expiresAt });
  console.log(`[CACHE SET] ${key} (expires in ${ttlMinutes} minutes)`);
}

/** Convenience: get value or compute & set */
export async function getOrSetCache(key, fn, ttlMinutes = 1440) {
  const existing = getCache(key);
  if (existing !== null) return existing;
  const data = await fn();
  setCache(key, data, ttlMinutes);
  return data;
}

/**
 * Clear specific cache entry
 * @param {string} key - Cache key
 */
export function clearCache(key) {
  cache.delete(key);
}

/**
 * Clear all cache
 */
export function clearAllCache() {
  cache.clear();
}

/**
 * Get snapshot of cache statistics
 */
export function getCacheStats() {
  return {
    ...cacheStats,
    now: new Date().toISOString(),
    size: cache.size,
  };
}

/**
 * Generate cache key from parameters
 * @param {string} prefix - Prefix for the key (e.g., 'stock', 'sentiment')
 * @param {string} symbol - Stock symbol
 * @returns {string} - Cache key
 */
export function getCacheKey(prefix, symbol) {
  return `${prefix}:${symbol?.toUpperCase() || ''}`;
}

// 4 hour TTL constant (minutes)
export const FOUR_HOUR_TTL_MINUTES = 240;
