/**
 * React Hooks for Performance Monitoring
 *
 * Custom hooks that integrate performance logging into React components
 * for tracking render times, effect durations, and calculation performance.
 *
 * @module usePerformance
 */

import { useEffect, useRef, useMemo, useCallback, useState } from 'react';
import { startMeasure, mark, isEnabled } from '../utils/performanceLogger';

/**
 * Track component render performance
 * @param {string} componentName - Name of the component
 * @returns {Object} Performance tracking utilities
 */
export function useRenderPerformance(componentName) {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(null);

  useEffect(() => {
    if (!isEnabled()) return;

    renderCount.current += 1;
    const currentTime = performance.now();

    if (lastRenderTime.current !== null) {
      const timeSinceLastRender = currentTime - lastRenderTime.current;
      if (timeSinceLastRender < 16) {
        console.warn(
          `⚡ ${componentName} re-rendered after ${timeSinceLastRender.toFixed(2)}ms (< 16ms) - potential over-rendering`
        );
      }
    }

    lastRenderTime.current = currentTime;
  });

  return {
    renderCount: renderCount.current,
    lastRenderTime: lastRenderTime.current
  };
}

/**
 * Measure effect execution time
 * @param {string} effectName - Name of the effect
 * @param {Function} effect - Effect callback
 * @param {Array} deps - Effect dependencies
 */
export function useMeasuredEffect(effectName, effect, deps) {
  useEffect(() => {
    if (!isEnabled()) {
      effect();
      return;
    }

    const end = startMeasure(effectName);
    const cleanup = effect();
    end();

    return cleanup;
  }, deps);
}

/**
 * Create a memoized value with performance tracking
 * @param {string} memoName - Name of the memo
 * @param {Function} factory - Factory function
 * @param {Array} deps - Dependencies
 * @returns {*} Memoized value
 */
export function useMeasuredMemo(memoName, factory, deps) {
  return useMemo(() => {
    if (!isEnabled()) return factory();

    const end = startMeasure(`memo:${memoName}`);
    const result = factory();
    end();
    return result;
  }, deps);
}

/**
 * Create a callback with performance tracking
 * @param {string} callbackName - Name of the callback
 * @param {Function} callback - Callback function
 * @param {Array} deps - Dependencies
 * @returns {Function} Memoized callback
 */
export function useMeasuredCallback(callbackName, callback, deps) {
  return useCallback((...args) => {
    if (!isEnabled()) return callback(...args);

    const end = startMeasure(`callback:${callbackName}`);
    const result = callback(...args);
    end();
    return result;
  }, deps);
}

/**
 * Track component lifecycle performance
 * @param {string} componentName - Name of the component
 */
export function useLifecyclePerformance(componentName) {
  const mountTime = useRef(null);
  const updateCount = useRef(0);

  // Track mount
  useEffect(() => {
    if (!isEnabled()) return;

    if (mountTime.current === null) {
      mountTime.current = performance.now();
      mark(`${componentName}:mount`);
      console.log(`🎬 ${componentName} mounted at ${mountTime.current.toFixed(2)}ms`);
    } else {
      updateCount.current += 1;
      mark(`${componentName}:update-${updateCount.current}`);
    }
  });

  // Track unmount
  useEffect(() => {
    if (!isEnabled()) return;

    return () => {
      const unmountTime = performance.now();
      const lifetime = mountTime.current ? unmountTime - mountTime.current : 0;
      mark(`${componentName}:unmount`);
      console.log(
        `🔚 ${componentName} unmounted after ${lifetime.toFixed(2)}ms (${updateCount.current} updates)`
      );
    };
  }, [componentName]);

  return {
    updateCount: updateCount.current,
    mountTime: mountTime.current
  };
}

/**
 * Track slow renders and warn about performance issues
 * @param {string} componentName - Name of the component
 * @param {Object} dependencies - Object with dependency values to track
 * @param {number} threshold - Threshold in ms (default: 16ms)
 */
export function useSlowRenderWarning(componentName, dependencies = {}, threshold = 16) {
  const renderStartTime = useRef(null);
  const previousDeps = useRef(null);

  // Mark render start
  renderStartTime.current = performance.now();

  useEffect(() => {
    if (!isEnabled()) return;

    const renderDuration = performance.now() - renderStartTime.current;

    if (renderDuration > threshold) {
      const changedDeps = {};
      if (previousDeps.current) {
        Object.keys(dependencies).forEach(key => {
          if (dependencies[key] !== previousDeps.current[key]) {
            changedDeps[key] = {
              old: previousDeps.current[key],
              new: dependencies[key]
            };
          }
        });
      }

      console.warn(
        `🐌 ${componentName} took ${renderDuration.toFixed(2)}ms to render (threshold: ${threshold}ms)`,
        {
          duration: renderDuration,
          changedDeps: Object.keys(changedDeps).length > 0 ? changedDeps : 'initial render'
        }
      );
    }

    previousDeps.current = { ...dependencies };
  });
}

/**
 * Create a performance-tracked async function
 * @param {string} functionName - Name of the function
 * @param {Function} asyncFn - Async function to track
 * @returns {Function} Tracked async function
 */
export function useTrackedAsyncFunction(functionName, asyncFn) {
  return useCallback(async (...args) => {
    if (!isEnabled()) return asyncFn(...args);

    const end = startMeasure(`async:${functionName}`);
    try {
      const result = await asyncFn(...args);
      end();
      return result;
    } catch (error) {
      end();
      throw error;
    }
  }, [functionName, asyncFn]);
}

/**
 * Track data processing performance
 * @param {string} operationName - Name of the operation
 * @param {*} data - Data being processed
 * @param {Function} processor - Processing function
 * @param {Array} deps - Dependencies
 * @returns {*} Processed data
 */
export function useDataProcessing(operationName, data, processor, deps = []) {
  return useMemo(() => {
    if (!isEnabled() || !data) return processor(data);

    const dataSize = Array.isArray(data) ? data.length : Object.keys(data).length;
    const end = startMeasure(`${operationName} [size: ${dataSize}]`);
    const result = processor(data);
    const duration = end();

    // Warn if processing is slow relative to data size
    const timePerItem = dataSize > 0 ? duration / dataSize : 0;
    if (timePerItem > 0.1) { // More than 0.1ms per item is slow
      console.warn(
        `⏱️ ${operationName} is slow: ${timePerItem.toFixed(3)}ms per item`,
        { dataSize, duration: duration.toFixed(2) }
      );
    }

    return result;
  }, [operationName, data, ...deps]);
}

/**
 * Track state updates performance
 * @param {string} stateName - Name of the state
 * @param {*} initialState - Initial state value
 * @returns {[*, Function]} State and setter with performance tracking
 */
export function usePerformanceState(stateName, initialState) {
  const [state, setState] = useState(initialState);
  const updateCount = useRef(0);

  const trackedSetState = useCallback((newState) => {
    if (!isEnabled()) {
      setState(newState);
      return;
    }

    updateCount.current += 1;
    const end = startMeasure(`state:${stateName}:update-${updateCount.current}`);
    setState(newState);
    end();
  }, [stateName]);

  return [state, trackedSetState];
}

/**
 * Performance monitoring context for nested measurements
 */
export function usePerformanceContext(contextName) {
  const measurements = useRef({});

  const startMeasurement = useCallback((name) => {
    if (!isEnabled()) return () => {};

    const fullName = `${contextName}.${name}`;
    const end = startMeasure(fullName);
    return () => {
      const duration = end();
      measurements.current[name] = duration;
      return duration;
    };
  }, [contextName]);

  const getMeasurements = useCallback(() => {
    return { ...measurements.current };
  }, []);

  const clearMeasurements = useCallback(() => {
    measurements.current = {};
  }, []);

  return {
    startMeasurement,
    getMeasurements,
    clearMeasurements
  };
}
