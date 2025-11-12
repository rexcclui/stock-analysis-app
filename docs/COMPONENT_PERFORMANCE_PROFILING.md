# Component Performance Profiling

This document explains how to analyze loading (render) time for each major component when you start a stock search.

## What Was Added
- `PerfProfiler` component (`app/components/PerfProfiler.js`) wraps key UI components in a React `Profiler`.
- Instrumentation marks + measures in `app/page.js` around the stock search lifecycle.
- Integration with existing `performanceLogger` utilities (`app/utils/performanceLogger.js`).

## Search Cycle Identifiers
Each search initializes a `searchCycleId` with `Date.now()` + stock code (e.g. `1731436800000-AAPL`). All profiler IDs are prefixed with this cycle id so you can group metrics per search.

Example profiler ID: `1731436800000-AAPL:PricePerformanceChart`.

## Markers & Measures
`page.js` emits these Performance marks:
- `search:start` — user initiated search.
- `search:primaryDataReady` — main stock API data resolved.
- `search:selectedStockSet` — React state updated with primary stock.
- `search:benchmarksReady` — SPY/QQQ finished loading.
- `search:relatedReady` — related stocks finished loading.
- `search:savedReady` — saved comparison stocks loaded.
- `search:comparisonStocksSet` — comparison list state updated.
- `search:fetchComplete` — all async fetch tasks concluded.

A `performance.measure('search.fetchDuration', 'search:start', 'search:fetchComplete')` is recorded and logged.

## Viewing Metrics
Open DevTools Console in development:

```js
// Print aggregated summary
window.__performanceLogger.printSummary();

// Inspect individual metric stats
window.__performanceLogger.getStats('React.PricePerformanceChart.mount');

// Export all raw measurements
window.__performanceLogger.exportMetrics();
```

Profiler entries log automatically when a component's mount or update duration exceeds thresholds (default: >16ms warns, >100ms error-level with 🐌 emoji).

## Filtering For Mount Times
All mount phase metrics have the pattern:
```
React.<cycleId:ComponentName>.mount
```
You can isolate a single search by its cycleId prefix.

Example quick filter:
```js
Object.entries(window.__performanceLogger.getMetrics()).filter(([name]) => name.includes('1731436800000-AAPL') && name.endsWith('.mount'));
```

## Adjusting Thresholds
```js
window.__performanceLogger.configure({ slowThreshold: 8, verySlowThreshold: 50 });
```

## Interpreting Output
Color / Emoji legend:
- ✅ Fast (< slowThreshold)
- ⚠️ Slow (>= slowThreshold and < verySlowThreshold)
- 🐌 Very Slow (>= verySlowThreshold)

Focus first on components with:
- High `Avg (ms)` and high `Max (ms)` in summary table.
- Large gap between `baseDuration` and `actualDuration` (overhead) reported in individual render logs.

## Next Optimization Steps
1. Memoization: Wrap heavy components with `React.memo` or memoize expensive derived data.
2. Virtualization: For large tables (e.g., comparison lists) consider windowing (react-window / react-virtualized).
3. Debounce Search: Avoid overlapping fetch cycles when typing rapidly.
4. Split Suspense Boundaries: Lazy-load secondary panels (News, AI analysis) after primary stock card.
5. Move Heavy Calculations Off Main Thread: Web Worker for Fourier / cycle analysis calculations if they become bottlenecks.

## Reset Metrics
```js
window.__performanceLogger.clearMetrics();
```

---
Maintainer Tip: If you want server-side timing, add an API wrapper calling `performanceLogger.startMeasure('Server.<route>')` at the start of each route file and end it before response.
