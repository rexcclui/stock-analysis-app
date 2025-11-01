// Simple in-memory cache with time-based expiration
const cache = new Map();

/**
 * Get cached data if it exists and hasn't expired
 * @param {string} key - Cache key
 * @returns {any|null} - Cached data or null if expired/not found
 */
export function getCache(key) {
  const cached = cache.get(key);
  if (!cached) return null;

  const now = Date.now();
  if (now > cached.expiresAt) {
    cache.delete(key);
    return null;
  }

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
 * Generate cache key from parameters
 * @param {string} prefix - Prefix for the key (e.g., 'stock', 'sentiment')
 * @param {string} symbol - Stock symbol
 * @returns {string} - Cache key
 */
export function getCacheKey(prefix, symbol) {
  return `${prefix}:${symbol?.toUpperCase() || ''}`;
}
