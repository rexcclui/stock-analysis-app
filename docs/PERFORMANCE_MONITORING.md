# Performance Monitoring Guide

This document describes the performance monitoring system for tracking and optimizing component performance in the stock analysis application.

## Overview

The performance monitoring system provides comprehensive tracking of:
- Component render times
- Calculation durations
- Effect execution times
- Data processing performance
- Async operation timing
- Lifecycle events

## Architecture

### Core Modules

#### 1. Performance Logger (`app/utils/performanceLogger.js`)

Low-level performance utilities for tracking and logging metrics.

**Key Features:**
- Start/stop measurements
- Duration formatting with color coding
- Statistical analysis (avg, min, max, p95, p99)
- Performance metrics storage
- Browser DevTools integration
- Automatic summary on page unload (development mode)

**API:**

```javascript
import { startMeasure, measure, measureAsync } from '../utils/performanceLogger';

// Manual measurement
const end = startMeasure('operationName');
// ... perform operation
const duration = end();

// Function wrapper
const result = measure('calcName', () => {
  return expensiveCalculation();
});

// Async function wrapper
const data = await measureAsync('fetchData', async () => {
  return await api.fetchStockData();
});
```

#### 2. React Hooks (`app/hooks/usePerformance.js`)

React-specific hooks for component performance tracking.

**Available Hooks:**

```javascript
import {
  useRenderPerformance,
  useLifecyclePerformance,
  useMeasuredMemo,
  useMeasuredEffect,
  useMeasuredCallback,
  usePerformanceContext,
  useDataProcessing
} from '../hooks/usePerformance';
```

### Performance Thresholds

The system uses color-coded performance warnings:

- ✅ **Green** (< 16ms): Fast, within 60fps frame budget
- ⚠️ **Orange** (16-100ms): Slow, noticeable lag
- 🐌 **Red** (> 100ms): Very slow, significant performance issue

## Usage Examples

### 1. Basic Component Monitoring

```javascript
function MyComponent() {
  // Track lifecycle and render performance
  useLifecyclePerformance('MyComponent');
  useRenderPerformance('MyComponent');

  return <div>My Component</div>;
}
```

**Console Output:**
```
🎬 MyComponent mounted at 1234.56ms
✅ React.MyComponent.mount: 12.34ms
```

### 2. Tracking Expensive Calculations

```javascript
function ChartComponent({ data }) {
  const perfContext = usePerformanceContext('ChartComponent');

  const processedData = useMemo(() => {
    const end = perfContext.startMeasurement('processData');
    const result = expensiveProcessing(data);
    end();
    return result;
  }, [data]);

  return <Chart data={processedData} />;
}
```

**Console Output:**
```
⚠️ ChartComponent.processData: 45.67ms
```

### 3. Measured Memoization

```javascript
function DataProcessor({ rawData }) {
  // Automatically tracks computation time
  const processed = useMeasuredMemo(
    'dataProcessing',
    () => transformData(rawData),
    [rawData]
  );

  return <Display data={processed} />;
}
```

**Console Output:**
```
✅ memo:dataProcessing: 8.92ms
```

### 4. Effect Performance Tracking

```javascript
function DataFetcher({ stockId }) {
  useMeasuredEffect(
    'fetchStockData',
    () => {
      const fetchData = async () => {
        const data = await api.getStock(stockId);
        setState(data);
      };
      fetchData();
    },
    [stockId]
  );

  return <div>Loading...</div>;
}
```

### 5. Slow Render Warnings

```javascript
function ComplexChart({ data, config, filters }) {
  // Warns if render takes > 16ms and shows what changed
  useSlowRenderWarning('ComplexChart', { data, config, filters }, 16);

  return <Chart data={data} config={config} filters={filters} />;
}
```

**Console Output (when slow):**
```
🐌 ComplexChart took 52.34ms to render (threshold: 16ms)
{
  duration: 52.34,
  changedDeps: {
    data: { old: [...], new: [...] }
  }
}
```

### 6. Data Processing with Size Tracking

```javascript
function VolumeAnalyzer({ priceData }) {
  const volumeProfile = useDataProcessing(
    'calculateVolumeProfile',
    priceData,
    (data) => calculateVolume(data),
    []
  );

  return <VolumeChart profile={volumeProfile} />;
}
```

**Console Output:**
```
✅ calculateVolumeProfile [size: 1000]: 15.23ms
⏱️ calculateVolumeProfile is slow: 0.152ms per item
```

## PricePerformanceChart Integration

The PricePerformanceChart component uses performance monitoring extensively:

```javascript
export function PricePerformanceChart({ ... }) {
  // Track lifecycle and renders
  useLifecyclePerformance('PricePerformanceChart');
  useRenderPerformance('PricePerformanceChart');
  const perfContext = usePerformanceContext('PricePerformanceChart');

  // Measured memoization
  const chartData = useMeasuredMemo(
    'chartData',
    () => selectedStock?.chartData?.[chartPeriod] || [],
    [selectedStock, chartPeriod]
  );

  // Track individual calculations
  const getCurrentDataSlice = () => {
    // ...
    if (colorMode === 'rvi') {
      const end = perfContext.startMeasurement('calculateRVI');
      const result = calculateRVI(slicedData, chartPeriod);
      end();
      return result;
    }
    // ... other modes
  };

  // Track simulations
  const runSimulation = async () => {
    const simEnd = perfContext.startMeasurement('runSimulation');
    // ... simulation logic
    simEnd();
  };
}
```

## Browser DevTools Integration

The performance logger integrates with browser Performance API:

```javascript
import { mark, measureMarks } from '../utils/performanceLogger';

mark('dataFetch:start');
await fetchData();
mark('dataFetch:end');
measureMarks('dataFetch', 'dataFetch:start', 'dataFetch:end');
```

View measurements in Chrome DevTools:
1. Open DevTools > Performance tab
2. Click Record
3. Perform actions
4. Stop recording
5. View User Timing marks/measures

## Global Performance API (Development Only)

In development mode, performance utilities are available globally:

```javascript
// In browser console
window.__performanceLogger.printSummary();
window.__performanceLogger.getMetrics();
window.__performanceLogger.getStats('calculateRVI');
window.__performanceLogger.exportMetrics(); // Returns JSON
window.__performanceLogger.clearMetrics();
```

## Performance Summary

The system automatically prints a summary on page unload in development:

```
📊 Performance Summary
┌──────────────────────────────┬───────┬──────────┬──────────┬──────────┬──────────┬──────────┐
│ Metric                       │ Count │ Avg (ms) │ Min (ms) │ Max (ms) │ P95 (ms) │ P99 (ms) │
├──────────────────────────────┼───────┼──────────┼──────────┼──────────┼──────────┼──────────┤
│ React.PricePerformanceChart  │ 42    │ 12.34    │ 8.23     │ 45.67    │ 23.45    │ 38.90    │
│ calculateRVI                 │ 15    │ 5.67     │ 4.12     │ 12.34    │ 8.90     │ 11.23    │
│ calculateVSPY                │ 8     │ 15.23    │ 12.34    │ 23.45    │ 20.12    │ 22.34    │
│ runSimulation                │ 3     │ 2345.67  │ 2234.56  │ 2456.78  │ 2456.78  │ 2456.78  │
└──────────────────────────────┴───────┴──────────┴──────────┴──────────┴──────────┴──────────┘
```

## Configuration

Configure the performance logger:

```javascript
import { configurePerformanceLogger, LOG_LEVEL } from '../utils/performanceLogger';

configurePerformanceLogger({
  enabled: true,
  logLevel: LOG_LEVEL.INFO,
  slowThreshold: 16,      // ms
  verySlowThreshold: 100  // ms
});
```

## Best Practices

### 1. Use Measured Memoization

❌ **Before:**
```javascript
const data = useMemo(() => expensiveCalc(), [deps]);
```

✅ **After:**
```javascript
const data = useMeasuredMemo('calcName', () => expensiveCalc(), [deps]);
```

### 2. Track Critical Paths

Focus on:
- Initial render performance
- Data transformation functions
- API calls and data fetching
- Complex calculations (RVI, VSPY, channels)
- Simulation functions

### 3. Set Appropriate Thresholds

- **UI Interactions**: < 100ms (perceived as instant)
- **Animations**: < 16ms (60fps)
- **Page Load**: < 1000ms (acceptable)
- **Background Tasks**: < 5000ms (tolerable)

### 4. Monitor Over Time

Use statistical measures:
- **Average**: Overall performance trend
- **P95/P99**: Worst-case scenarios
- **Max**: Absolute worst case

### 5. React to Warnings

When you see slow render warnings:
1. Check what dependencies changed
2. Consider memoization
3. Split components if too complex
4. Move expensive calculations to Web Workers
5. Use virtualization for large lists

## Optimization Workflow

1. **Identify**: Use performance hooks to find slow operations
2. **Measure**: Get baseline metrics
3. **Optimize**: Apply optimization techniques
4. **Verify**: Compare before/after metrics
5. **Monitor**: Track over time

## Common Performance Issues

### Over-Rendering

**Problem:** Component renders too frequently

**Solution:**
```javascript
useSlowRenderWarning('MyComponent', { prop1, prop2 }, 16);
// Check console for what's changing
// Use React.memo, useMemo, useCallback appropriately
```

### Expensive Calculations

**Problem:** Calculations taking too long

**Solution:**
```javascript
// Memoize results
const result = useMeasuredMemo('calc', () => calc(data), [data]);

// Or move to Web Worker for heavy computations
```

### Large Data Sets

**Problem:** Processing large arrays is slow

**Solution:**
- Use virtualization (react-window, react-virtualized)
- Paginate data
- Process incrementally
- Use binary search for sorted data

## Troubleshooting

### Performance Logging Not Working

Check:
1. Is `NODE_ENV === 'development'`?
2. Is performance logging enabled in config?
3. Check browser console for errors

### Measurements Seem Inaccurate

- Clear metrics and re-test
- Check for browser extensions interfering
- Test in incognito mode
- Ensure consistent test conditions

### Console Spam

Reduce log level:
```javascript
configurePerformanceLogger({
  logLevel: LOG_LEVEL.WARN // Only show slow operations
});
```

## Production Considerations

Performance monitoring is disabled by default in production. To enable:

```javascript
// Only enable for specific users or sampling
if (shouldEnablePerformanceTracking()) {
  configurePerformanceLogger({
    enabled: true,
    logLevel: LOG_LEVEL.ERROR // Only critical issues
  });
}
```

## Resources

- [Web Performance APIs](https://developer.mozilla.org/en-US/docs/Web/API/Performance)
- [React Profiler API](https://react.dev/reference/react/Profiler)
- [Chrome DevTools Performance](https://developer.chrome.com/docs/devtools/performance/)

## Future Enhancements

Potential improvements:
1. Server-side performance tracking
2. Real User Monitoring (RUM)
3. Performance budgets and CI integration
4. Flame graphs for complex operations
5. Memory usage tracking
6. Network performance metrics
