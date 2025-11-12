'use client';
import React, { Profiler } from 'react';
import { onRenderProfiler } from '../utils/performanceLogger';

/**
 * PerfProfiler wraps children in a React Profiler to capture mount/update durations.
 * It auto-adds a cycle identifier for correlation with a specific stock search.
 *
 * Props:
 *  id: base id of the component being profiled
 *  cycleId: identifier for current search cycle (e.g., timestamp or stock symbol)
 *  enabled: optional boolean to enable/disable profiling (defaults to true in dev)
 */
export function PerfProfiler({ id, cycleId, enabled = process.env.NODE_ENV === 'development', children }) {
  if (!enabled) return children;
  const profilerId = cycleId ? `${cycleId}:${id}` : id;
  return (
    <Profiler id={profilerId} onRender={onRenderProfiler}>
      {children}
    </Profiler>
  );
}

export default PerfProfiler;
