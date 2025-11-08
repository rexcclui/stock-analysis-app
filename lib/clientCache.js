/**
 * Client-side cache utility with two-level caching mechanism
 * First checks client cache, then falls back to server
 */

const CACHE_DURATIONS = {
  NONE: 0,
  FOUR_HOURS: 4 * 60 * 60 * 1000, // 4 hours in milliseconds
  TWELVE_HOURS: 12 * 60 * 60 * 1000, // 12 hours in milliseconds
};

/**
 * Get data from localStorage cache
 * @param {string} key - Cache key
 * @returns {object|null} - Cached data or null if not found/expired
 */
export function getClientCache(key) {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const { data, timestamp, ttl } = JSON.parse(cached);
    const now = Date.now();

    // Check if cache is still valid
    if (ttl === 0 || now - timestamp > ttl) {
      localStorage.removeItem(key);
      return null;
    }

    console.log(`[Client Cache] ✓ Cache HIT for key: ${key} (age: ${Math.round((now - timestamp) / 1000 / 60)}min)`);
    return data;
  } catch (error) {
    console.error('[Client Cache] Error reading cache:', error);
    return null;
  }
}

/**
 * Set data in localStorage cache
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 * @param {number} ttl - Time to live in milliseconds
 */
export function setClientCache(key, data, ttl) {
  try {
    const cacheEntry = {
      data,
      timestamp: Date.now(),
      ttl,
    };
    localStorage.setItem(key, JSON.stringify(cacheEntry));
    console.log(`[Client Cache] ✓ Cache SET for key: ${key} (TTL: ${ttl / 1000 / 60}min)`);
  } catch (error) {
    console.error('[Client Cache] Error setting cache:', error);
  }
}

/**
 * Clear cache for a specific key
 * @param {string} key - Cache key to clear
 */
export function clearClientCache(key) {
  try {
    localStorage.removeItem(key);
    console.log(`[Client Cache] ✓ Cache CLEARED for key: ${key}`);
  } catch (error) {
    console.error('[Client Cache] Error clearing cache:', error);
  }
}

/**
 * Clear all caches matching a pattern
 * @param {string} pattern - Pattern to match (e.g., 'stock-')
 */
export function clearClientCachePattern(pattern) {
  try {
    const keys = Object.keys(localStorage);
    let cleared = 0;
    keys.forEach(key => {
      if (key.includes(pattern)) {
        localStorage.removeItem(key);
        cleared++;
      }
    });
    console.log(`[Client Cache] ✓ Cleared ${cleared} cache entries matching: ${pattern}`);
  } catch (error) {
    console.error('[Client Cache] Error clearing cache pattern:', error);
  }
}

/**
 * Generate cache key for API calls
 * @param {string} endpoint - API endpoint
 * @param {object} params - Request parameters
 * @returns {string} - Cache key
 */
export function generateCacheKey(endpoint, params = {}) {
  const paramString = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  return `cache-${endpoint}-${paramString}`;
}

/**
 * Fetch with two-level cache (client -> server)
 * @param {string} url - API URL
 * @param {object} options - Fetch options
 * @param {number} cacheTTL - Client cache TTL (0 = no cache)
 * @param {string} cacheKey - Optional custom cache key
 * @returns {Promise<any>} - Response data
 */
export async function fetchWithCache(url, options = {}, cacheTTL = CACHE_DURATIONS.FOUR_HOURS, cacheKey = null) {
  // Generate cache key if not provided
  const key = cacheKey || generateCacheKey(url, options.params || {});

  // Skip client cache if TTL is 0 or forceReload is specified
  const forceReload = options.forceReload || false;

  if (cacheTTL > 0 && !forceReload) {
    // Check client cache first
    const cachedData = getClientCache(key);
    if (cachedData !== null) {
      return cachedData;
    }
  }

  // Client cache miss or disabled - fetch from server
  console.log(`[Client Cache] ✗ Cache MISS for key: ${key} - Fetching from server...`);

  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();

    // Store in client cache if TTL > 0
    if (cacheTTL > 0 && !forceReload) {
      setClientCache(key, data, cacheTTL);
    }

    return data;
  } catch (error) {
    console.error('[Client Cache] Fetch error:', error);
    throw error;
  }
}

/**
 * Fetch with POST method and two-level cache
 * @param {string} url - API URL
 * @param {object} body - Request body
 * @param {number} cacheTTL - Client cache TTL
 * @param {string} cacheKey - Optional custom cache key
 * @returns {Promise<any>} - Response data
 */
export async function fetchPostWithCache(url, body = {}, cacheTTL = CACHE_DURATIONS.FOUR_HOURS, cacheKey = null) {
  // Generate cache key from URL and body
  const key = cacheKey || generateCacheKey(url, body);

  // Skip client cache if forceReload is specified
  const forceReload = body.forceReload || false;

  if (cacheTTL > 0 && !forceReload) {
    // Check client cache first
    const cachedData = getClientCache(key);
    if (cachedData !== null) {
      return cachedData;
    }
  }

  // Client cache miss - fetch from server
  console.log(`[Client Cache] ✗ Cache MISS for key: ${key} - Fetching from server...`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();

    // Store in client cache if TTL > 0
    if (cacheTTL > 0 && !forceReload) {
      setClientCache(key, data, cacheTTL);
    }

    return data;
  } catch (error) {
    console.error('[Client Cache] Fetch error:', error);
    throw error;
  }
}

export { CACHE_DURATIONS };
