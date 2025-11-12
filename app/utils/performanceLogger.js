/**
 * Performance Logging Utilities
 *
 * Provides utilities for tracking and logging component performance metrics
 * including render times, calculation durations, and lifecycle events.
 *
 * @module performanceLogger
 */

/**
 * Performance log levels
 */
export const LOG_LEVEL = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error'
};

/**
 * Global performance logger configuration
 */
let config = {
  enabled: typeof window !== 'undefined' && process.env.NODE_ENV === 'development',
  logLevel: LOG_LEVEL.INFO,
  slowThreshold: 16, // ms (60fps frame budget)
  verySlowThreshold: 100 // ms
};

/**
 * Performance metrics storage
 */
const metrics = new Map();

/**
 * Configure performance logger
 * @param {Object} options - Configuration options
 */
export function configurePerformanceLogger(options = {}) {
  config = { ...config, ...options };
}

/**
 * Get current configuration
 * @returns {Object} Current configuration
 */
export function getConfig() {
  return { ...config };
}

/**
 * Check if performance logging is enabled
 * @returns {boolean}
 */
export function isEnabled() {
  return config.enabled;
}

/**
 * Format duration with color coding
 * @param {number} duration - Duration in milliseconds
 * @returns {Object} Formatted duration with color
 */
function formatDuration(duration) {
  const rounded = duration.toFixed(2);

  if (duration < config.slowThreshold) {
    return { value: rounded, color: '#10B981', emoji: '✅' }; // Green - fast
  } else if (duration < config.verySlowThreshold) {
    return { value: rounded, color: '#F59E0B', emoji: '⚠️' }; // Orange - slow
  } else {
    return { value: rounded, color: '#EF4444', emoji: '🐌' }; // Red - very slow
  }
}

/**
 * Log a performance message
 * @param {string} level - Log level
 * @param {string} message - Message to log
 * @param {Object} data - Additional data
 */
function log(level, message, data = {}) {
  if (!config.enabled) return;

  const levels = ['debug', 'info', 'warn', 'error'];
  const currentLevelIndex = levels.indexOf(config.logLevel);
  const messageLevelIndex = levels.indexOf(level);

  if (messageLevelIndex < currentLevelIndex) return;

  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];

  switch (level) {
    case LOG_LEVEL.DEBUG:
      console.debug(`[${timestamp}] 🔍 ${message}`, data);
      break;
    case LOG_LEVEL.INFO:
      console.log(`[${timestamp}] ℹ️ ${message}`, data);
      break;
    case LOG_LEVEL.WARN:
      console.warn(`[${timestamp}] ⚠️ ${message}`, data);
      break;
    case LOG_LEVEL.ERROR:
      console.error(`[${timestamp}] ❌ ${message}`, data);
      break;
  }
}

/**
 * Start a performance measurement
 * @param {string} name - Measurement name
 * @returns {Function} Function to end the measurement
 */
export function startMeasure(name) {
  if (!config.enabled) return () => {};

  const startTime = performance.now();
  const measureId = `${name}_${startTime}`;

  return () => {
    const endTime = performance.now();
    const duration = endTime - startTime;
    const formatted = formatDuration(duration);

    // Store metric
    if (!metrics.has(name)) {
      metrics.set(name, []);
    }
    metrics.get(name).push({ duration, timestamp: Date.now() });

    // Keep only last 100 measurements per metric
    const metricArray = metrics.get(name);
    if (metricArray.length > 100) {
      metricArray.shift();
    }

    // Log with appropriate level based on duration
    const logLevel = duration < config.slowThreshold
      ? LOG_LEVEL.DEBUG
      : duration < config.verySlowThreshold
        ? LOG_LEVEL.WARN
        : LOG_LEVEL.ERROR;

    log(logLevel, `${formatted.emoji} ${name}: ${formatted.value}ms`, {
      duration,
      threshold: config.slowThreshold,
      verySlowThreshold: config.verySlowThreshold
    });

    return duration;
  };
}

/**
 * Measure execution time of a function
 * @param {string} name - Measurement name
 * @param {Function} fn - Function to measure
 * @returns {*} Function result
 */
export function measure(name, fn) {
  if (!config.enabled) return fn();

  const end = startMeasure(name);
  try {
    const result = fn();
    end();
    return result;
  } catch (error) {
    end();
    throw error;
  }
}

/**
 * Measure execution time of an async function
 * @param {string} name - Measurement name
 * @param {Function} fn - Async function to measure
 * @returns {Promise<*>} Function result
 */
export async function measureAsync(name, fn) {
  if (!config.enabled) return fn();

  const end = startMeasure(name);
  try {
    const result = await fn();
    end();
    return result;
  } catch (error) {
    end();
    throw error;
  }
}

/**
 * Get statistics for a metric
 * @param {string} name - Metric name
 * @returns {Object|null} Statistics or null if no data
 */
export function getMetricStats(name) {
  const data = metrics.get(name);
  if (!data || data.length === 0) return null;

  const durations = data.map(d => d.duration);
  const sorted = [...durations].sort((a, b) => a - b);

  return {
    count: durations.length,
    min: Math.min(...durations),
    max: Math.max(...durations),
    avg: durations.reduce((a, b) => a + b, 0) / durations.length,
    median: sorted[Math.floor(sorted.length / 2)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    p99: sorted[Math.floor(sorted.length * 0.99)]
  };
}

/**
 * Get all metrics
 * @returns {Object} All metrics with statistics
 */
export function getAllMetrics() {
  const result = {};
  for (const [name, data] of metrics.entries()) {
    result[name] = {
      measurements: data.length,
      stats: getMetricStats(name)
    };
  }
  return result;
}

/**
 * Print performance summary to console
 */
export function printPerformanceSummary() {
  if (!config.enabled) return;

  console.group('📊 Performance Summary');

  const allMetrics = getAllMetrics();
  const sortedMetrics = Object.entries(allMetrics)
    .sort(([, a], [, b]) => (b.stats?.avg || 0) - (a.stats?.avg || 0));

  if (sortedMetrics.length === 0) {
    console.log('No performance data collected');
  } else {
    console.table(
      sortedMetrics.reduce((acc, [name, data]) => {
        if (data.stats) {
          acc[name] = {
            'Count': data.measurements,
            'Avg (ms)': data.stats.avg.toFixed(2),
            'Min (ms)': data.stats.min.toFixed(2),
            'Max (ms)': data.stats.max.toFixed(2),
            'P95 (ms)': data.stats.p95.toFixed(2),
            'P99 (ms)': data.stats.p99.toFixed(2)
          };
        }
        return acc;
      }, {})
    );
  }

  console.groupEnd();
}

/**
 * Clear all metrics
 */
export function clearMetrics() {
  metrics.clear();
  log(LOG_LEVEL.INFO, 'Performance metrics cleared');
}

/**
 * Export metrics to JSON
 * @returns {string} JSON string of all metrics
 */
export function exportMetrics() {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    config,
    metrics: Object.fromEntries(metrics)
  }, null, 2);
}

/**
 * React component profiler callback
 * @param {string} id - Component ID
 * @param {string} phase - "mount" or "update"
 * @param {number} actualDuration - Actual render time
 * @param {number} baseDuration - Estimated render time without memoization
 * @param {number} startTime - When React started rendering
 * @param {number} commitTime - When React committed changes
 */
export function onRenderProfiler(id, phase, actualDuration, baseDuration, startTime, commitTime) {
  if (!config.enabled) return;

  const metricName = `React.${id}.${phase}`;
  const formatted = formatDuration(actualDuration);

  // Store metric
  if (!metrics.has(metricName)) {
    metrics.set(metricName, []);
  }
  metrics.get(metricName).push({
    duration: actualDuration,
    baseDuration,
    startTime,
    commitTime,
    timestamp: Date.now()
  });

  // Log slow renders
  if (actualDuration > config.slowThreshold) {
    log(
      actualDuration > config.verySlowThreshold ? LOG_LEVEL.WARN : LOG_LEVEL.INFO,
      `${formatted.emoji} ${id} (${phase}): ${formatted.value}ms`,
      {
        actualDuration,
        baseDuration,
        overhead: (actualDuration - baseDuration).toFixed(2)
      }
    );
  }
}

/**
 * Create a performance marker for browser DevTools
 * @param {string} name - Marker name
 */
export function mark(name) {
  if (!config.enabled || typeof performance === 'undefined') return;

  try {
    performance.mark(name);
  } catch (error) {
    // Ignore errors if performance API is not available
  }
}

/**
 * Measure between two marks in browser DevTools
 * @param {string} name - Measurement name
 * @param {string} startMark - Start mark name
 * @param {string} endMark - End mark name
 */
export function measureMarks(name, startMark, endMark) {
  if (!config.enabled || typeof performance === 'undefined') return;

  try {
    performance.measure(name, startMark, endMark);
    const measures = performance.getEntriesByName(name);
    if (measures.length > 0) {
      const duration = measures[measures.length - 1].duration;
      log(LOG_LEVEL.INFO, `${name}: ${duration.toFixed(2)}ms`);
    }
  } catch (error) {
    // Ignore errors if performance API is not available
  }
}

// Export performance summary on page unload in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  window.addEventListener('beforeunload', () => {
    if (config.enabled) {
      printPerformanceSummary();
    }
  });

  // Make performance logger available globally in dev
  window.__performanceLogger = {
    getMetrics: getAllMetrics,
    getStats: getMetricStats,
    printSummary: printPerformanceSummary,
    clearMetrics,
    exportMetrics,
    configure: configurePerformanceLogger
  };
}
