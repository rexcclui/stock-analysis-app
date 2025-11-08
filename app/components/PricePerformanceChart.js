import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ReferenceDot, Scatter, ReferenceArea } from 'recharts';
import { LoadingState } from './LoadingState';
import { useAIPriceAnalysis } from '../hooks/useAIPriceAnalysis';
import { useAICycleAnalysis } from '../hooks/useAICycleAnalysis';
import { AIPriceAnalysisButton } from './ai/AIPriceAnalysisButton';
import { AIPriceAnalysisPanel } from './ai/AIPriceAnalysisPanel';
import { AICycleAnalysisButton } from './ai/AICycleAnalysisButton';
import { AICycleAnalysisPanel } from './ai/AICycleAnalysisPanel';

/**
 * PricePerformanceChart
 * Displays either raw price chart for single stock or normalized percentage comparison lines.
 * Props:
 * - selectedStock: primary stock object with chartData
 * - chartPeriod: current period key
 * - setChartPeriod: function to update period
 * - periods: array of period keys
 * - chartCompareStocks: [{ code, series, __stockRef }]
 * - addChartCompareStock: function to add a comparison stock
 * - removeChartCompareStock: function to remove comparison stock by code
 * - chartCompareInput: current input string for adding comparison stock
 * - setChartCompareInput: setter for input
 * - buildNormalizedSeries: helper to build normalized series
 * - buildMultiStockDataset: helper to merge multiple series
 */
export function PricePerformanceChart({
  selectedStock,
  chartPeriod,
  setChartPeriod,
  periods,
  chartCompareStocks,
  addChartCompareStock,
  removeChartCompareStock,
  chartCompareInput,
  setChartCompareInput,
  buildNormalizedSeries,
  buildMultiStockDataset,
  loading = false
}) {
  const chartData = useMemo(() => selectedStock?.chartData?.[chartPeriod] || [], [selectedStock, chartPeriod]);
  const fullHistoricalData = useMemo(() => selectedStock?.chartData?.fullHistorical || [], [selectedStock]);
  const [dataOffset, setDataOffset] = useState(0); // Offset in days from most recent

  // AI Analysis using custom hook
  const {
    aiAnalysis,
    aiLoading,
    aiError,
    showAiAnalysis,
    setShowAiAnalysis,
    handleAiAnalysis
  } = useAIPriceAnalysis(selectedStock, fullHistoricalData);

  // AI Cycle Analysis using custom hook
  const {
    cycleAnalysis,
    cycleLoading,
    cycleError,
    showCycleAnalysis,
    setShowCycleAnalysis,
    handleCycleAnalysis
  } = useAICycleAnalysis(selectedStock, fullHistoricalData);

  // Don't return early here; render decisions happen after hooks are declared to keep hooks order stable.
  const shouldShowLoading = !selectedStock && loading;

  const [zoomDomain, setZoomDomain] = useState({ start: 0, end: 100 });
  const zoomDomainRef = useRef({ start: 0, end: 100 });
  const chartContainerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, startOffset: 0 });

  // Keep ref in sync with state
  useEffect(() => {
    zoomDomainRef.current = zoomDomain;
  }, [zoomDomain]);

  // Reset offset when period changes
  useEffect(() => {
    setDataOffset(0);
  }, [chartPeriod]);

  // Helper to get period size in days
  const getPeriodDays = (period) => {
    const periodMap = { '1D': 1, '7D': 7, '1M': 30, '3M': 90, '6M': 180, '1Y': 252, '3Y': 756, '5Y': 1260 };
    return periodMap[period] || 30;
  };

  // Helper to format date based on period
  const formatChartDate = (dateStr, period) => {
    const d = new Date(dateStr);
    const isLongPeriod = period === '3Y' || period === '5Y';
    if (isLongPeriod) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      return `${yyyy}-${mm}`;
    } else {
      const yy = String(d.getFullYear()).slice(-2);
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yy}-${mm}-${dd}`;
    }
  };

  // Get current data slice based on offset and period
  const getCurrentDataSlice = () => {
    if (fullHistoricalData.length === 0) {
      return chartData; // Fallback to pre-sliced data
    }

    const periodDays = getPeriodDays(chartPeriod);
    const totalDays = fullHistoricalData.length;

    // Calculate slice indices (newest data is at the end)
    const endIndex = totalDays - dataOffset;
    const startIndex = Math.max(0, endIndex - periodDays);

    // Slice and format the data
    const slicedData = fullHistoricalData.slice(startIndex, endIndex).map(d => ({
      date: formatChartDate(d.date, chartPeriod),
      price: d.price
    }));

    return slicedData;
  };

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const isZoomingIn = e.deltaY < 0; // Negative deltaY = zoom in (scroll up)
    const isZoomingOut = e.deltaY > 0; // Positive deltaY = zoom out (scroll down)
    const delta = isZoomingOut ? 1.1 : 0.9;

    setZoomDomain(currentZoom => {
      const { start, end } = currentZoom;
      const range = end - start;
      const newRange = range * delta;

      // Check if we need to switch periods
      const currentIndex = periods.indexOf(chartPeriod);

      // Zoom in to limit - switch to shorter/more detailed period
      if (isZoomingIn && range <= 12 && currentIndex > 0) {
        setChartPeriod(periods[currentIndex - 1]);
        if (typeof window !== 'undefined') {
          localStorage.setItem('chartPeriod', periods[currentIndex - 1]);
        }
        return { start: 0, end: 100 };
      }

      // Zoom out to limit - switch to longer/broader period
      if (isZoomingOut && range >= 98 && currentIndex < periods.length - 1) {
        setChartPeriod(periods[currentIndex + 1]);
        if (typeof window !== 'undefined') {
          localStorage.setItem('chartPeriod', periods[currentIndex + 1]);
        }
        return { start: 0, end: 100 };
      }

      // Calculate mouse position as zoom center
      const chartElement = chartContainerRef.current;
      if (!chartElement) return currentZoom;

      const rect = chartElement.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const chartWidth = rect.width;
      const mousePercent = (mouseX / chartWidth) * 100; // Position in chart 0-100

      // Convert mouse position to position within current zoom domain
      const mousePositionInData = start + (mousePercent / 100) * range;

      // Normal zoom behavior centered on mouse cursor
      const clampedRange = Math.min(100, Math.max(10, newRange));

      // Calculate how much of the new range should be before/after the mouse position
      const mouseRatioInView = (mousePositionInData - start) / range;
      let newStart = mousePositionInData - clampedRange * mouseRatioInView;
      let newEnd = mousePositionInData + clampedRange * (1 - mouseRatioInView);

      // Adjust if out of bounds
      if (newStart < 0) {
        newStart = 0;
        newEnd = clampedRange;
      }
      if (newEnd > 100) {
        newEnd = 100;
        newStart = 100 - clampedRange;
      }

      return { start: newStart, end: newEnd };
    });
  }, [chartPeriod, periods, setChartPeriod]);
  // Note: setChartPeriod is a prop that may change; include it to satisfy exhaustive-deps

  const resetZoom = () => {
    setZoomDomain({ start: 0, end: 100 });
  };

  const handleMouseDown = useCallback((e) => {
    // Only start drag on left mouse button
    if (e.button !== 0) return;
    e.preventDefault();

    dragStartRef.current = {
      x: e.clientX,
      startOffset: dataOffset,
      isDragging: true
    };
    setIsDragging(true);
      // ...existing code...
  }, [dataOffset]);

  const handleMouseMove = useCallback((e) => {
    if (!dragStartRef.current?.isDragging) {
      return;
    }

    e.preventDefault();

    const chartElement = chartContainerRef.current;
    if (!chartElement) {
      return;
    }

    const rect = chartElement.getBoundingClientRect();
    const chartWidth = rect.width;

    // Calculate drag distance
    const dragDistance = e.clientX - dragStartRef.current.x;

    // Convert drag distance to days offset
    // Drag right (positive) = go back in time (increase offset)
    // Drag left (negative) = go forward in time (decrease offset)
    const periodDays = getPeriodDays(chartPeriod);
    const pixelsPerDay = chartWidth / periodDays;
    const dragDays = Math.round(dragDistance / pixelsPerDay);

    let newOffset = dragStartRef.current.startOffset + dragDays;

    // Clamp offset to valid range
    const totalDays = fullHistoricalData.length;
    const maxOffset = Math.max(0, totalDays - periodDays);
    newOffset = Math.max(0, Math.min(maxOffset, newOffset));

      // ...existing code...

    setDataOffset(newOffset);
  }, [chartPeriod, fullHistoricalData]);

  const handleMouseUp = useCallback(() => {
    // ...existing code...
    if (dragStartRef.current) {
      dragStartRef.current.isDragging = false;
    }
    setIsDragging(false);
  }, []);

  // Attach wheel and mouse event listeners
  useEffect(() => {
    const chartElement = chartContainerRef.current;
    if (chartElement) {
      chartElement.addEventListener('wheel', handleWheel, { passive: false });
      chartElement.addEventListener('mousedown', handleMouseDown);
      return () => {
        chartElement.removeEventListener('wheel', handleWheel);
        chartElement.removeEventListener('mousedown', handleMouseDown);
      };
    }
  }, [handleWheel, handleMouseDown]);

  // Attach global mouse move and up listeners when dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  if (shouldShowLoading) {
    return <LoadingState message="Loading price performance chart..." className="mb-6" />;
  }

  return (
  <div className="mb-6" style={{ marginTop: '1rem' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3 w-full">
          <h3 className="text-xl font-bold text-center" style={{ color: '#3B82F6' }}>Price Chart</h3>

          {/* AI Analysis Button */}
          <AIPriceAnalysisButton
            onAnalyze={handleAiAnalysis}
            isLoading={aiLoading}
            isDisabled={!selectedStock || chartCompareStocks.length > 0}
            disabledReason={chartCompareStocks.length > 0 ? 'AI analysis only available for single stock view' : 'No stock selected'}
          />

          {/* Toggle AI Analysis Display */}
          {aiAnalysis && !aiLoading && (
            <button
              onClick={() => setShowAiAnalysis(!showAiAnalysis)}
              className="px-3 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-lg text-xs font-medium transition"
              title={showAiAnalysis ? 'Hide AI markers' : 'Show AI markers'}
            >
              {showAiAnalysis ? 'Hide AI Markers' : 'Show AI Markers'}
            </button>
          )}

          {/* AI Cycle Analysis Button */}
          <AICycleAnalysisButton
            onAnalyze={handleCycleAnalysis}
            isLoading={cycleLoading}
            isDisabled={!selectedStock || chartCompareStocks.length > 0}
            disabledReason={chartCompareStocks.length > 0 ? 'AI cycle analysis only available for single stock view' : 'No stock selected'}
          />

          {/* Toggle Cycle Analysis Display */}
          {cycleAnalysis && !cycleLoading && (
            <button
              onClick={() => setShowCycleAnalysis(!showCycleAnalysis)}
              className="px-3 py-2 bg-green-700 hover:bg-green-600 text-white rounded-lg text-xs font-medium transition"
              title={showCycleAnalysis ? 'Hide cycle markers' : 'Show cycle markers'}
            >
              {showCycleAnalysis ? 'Hide Cycles' : 'Show Cycles'}
            </button>
          )}
          <div className="flex items-center" style={{ marginLeft: '12px' }}>
            <input
              type="text"
              placeholder="Input stock"
              value={chartCompareInput}
              onChange={(e)=> setChartCompareInput(e.target.value)}
              onKeyDown={(e)=> e.key==='Enter' && addChartCompareStock()}
              className="w-32 px-2 py-1 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 placeholder-gray-400"
              style={{ minWidth: '100px', maxWidth: '140px' }}
            />
            <button
              onClick={addChartCompareStock}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition"
              style={{ marginLeft: '4px' }}
            >Add to Chart</button>
          </div>
          {(zoomDomain.start !== 0 || zoomDomain.end !== 100) && (
            <button
              onClick={resetZoom}
              className="px-3 py-1 rounded-lg text-xs font-medium bg-gray-700 text-gray-300 hover:bg-gray-600 transition"
              title="Reset zoom"
            >
              Reset Zoom
            </button>
          )}
          {dataOffset > 0 && (
            <button
              onClick={() => setDataOffset(0)}
              className="px-3 py-1 rounded-lg text-xs font-medium bg-blue-700 text-white hover:bg-blue-600 transition"
              title="Jump to most recent data"
            >
              ← Back to Present ({dataOffset} days ago)
            </button>
          )}
        </div>
        <div className="flex gap-2">
          {periods.map(period => (
            <button
              key={period}
              onClick={() => {
                setChartPeriod(period);
                setZoomDomain({ start: 0, end: 100 });
                if (typeof window !== 'undefined') {
                  localStorage.setItem('chartPeriod', period);
                }
              }}
              className="px-3 py-1 rounded-lg text-sm font-medium transition"
              style={{
                backgroundColor: chartPeriod === period ? '#2563eb' : '#374151',
                color: chartPeriod === period ? '#ffffff' : '#9ca3af',
                border: chartPeriod === period ? '2px solid #3b82f6' : '2px solid transparent',
                fontWeight: chartPeriod === period ? 'bold' : 'normal'
              }}
            >
              {period}
            </button>
          ))}
        </div>
      </div>
  <div className="bg-gray-800 rounded-xl shadow-xl border border-gray-700" style={{ padding: '4px 24px -24px -24px', margin: 0 }}>
        {chartCompareStocks.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {chartCompareStocks.map(s => (
              <span key={s.code} className="flex items-center gap-1 bg-gray-700 px-2 py-1 rounded text-xs text-gray-200">
                {s.code}
                <button onClick={()=> removeChartCompareStock(s.code)} className="text-red-400 hover:text-red-300">×</button>
              </span>
            ))}
          </div>
        )}
        {/* Cycle Timeline Visualization */}
        {showCycleAnalysis && cycleAnalysis && cycleAnalysis.cycles && (() => {
          // Get current visible data slice
          const visibleData = getCurrentDataSlice();

          // Filter cycles that overlap with visible date range
          const visibleCycles = cycleAnalysis.cycles.filter(cycle => {
            const cycleStart = new Date(cycle.startDate).getTime();
            const cycleEnd = new Date(cycle.endDate).getTime();

            // Get visible date range from chart data
            if (visibleData.length === 0) return false;
            const chartStart = new Date(visibleData[0].date || visibleData[0].rawDate).getTime();
            const chartEnd = new Date(visibleData[visibleData.length - 1].date || visibleData[visibleData.length - 1].rawDate).getTime();

            // Check if cycle overlaps with visible range
            return cycleEnd >= chartStart && cycleStart <= chartEnd;
          });

          if (visibleCycles.length === 0) return null;

          return (
            <div className="mb-2 px-4">
              <div className="text-xs text-gray-400 mb-1">
                Cycle Timeline ({visibleCycles.length} of {cycleAnalysis.cycles.length} visible):
              </div>
              <div className="relative h-6 bg-gray-700 rounded flex items-center overflow-hidden">
                {visibleCycles.map((cycle, idx) => {
                  const cycleColor = cycle.type === 'bull' ? 'bg-green-500' :
                                    cycle.type === 'bear' ? 'bg-red-500' :
                                    'bg-yellow-500';

                  return (
                    <div
                      key={`timeline-${idx}`}
                      className={`h-4 ${cycleColor} border-l border-white flex items-center justify-center text-white font-bold overflow-hidden`}
                      style={{
                        flex: cycle.duration,
                        fontSize: '9px',
                        padding: '0 2px'
                      }}
                      title={`${cycle.type.toUpperCase()} cycle: ${cycle.startDate} to ${cycle.endDate} (${cycle.duration} days)`}
                    >
                      <span className="whitespace-nowrap overflow-hidden text-ellipsis">
                        {cycle.type.toUpperCase().slice(0, 4)} #{idx + 1}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        <div
          ref={chartContainerRef}
          style={{
            cursor: isDragging ? 'grabbing' : 'grab',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            MozUserSelect: 'none',
            msUserSelect: 'none'
          }}
          onMouseLeave={handleMouseUp}
        >
          <ResponsiveContainer width="100%" height={320} style={{ margin: 0, padding: 0 }}>
            {(() => {
              // Get current data slice based on offset
              const currentData = getCurrentDataSlice();

              let fullData;
              if (chartCompareStocks.length === 0) {
                // Single stock: use the sliced data that respects offset
                fullData = currentData;
              } else {
                // Multiple stocks: build normalized series from sliced full historical data
                if (fullHistoricalData.length > 0) {
                  // Build sliced and normalized data for the primary stock
                  const periodDays = getPeriodDays(chartPeriod);
                  const totalDays = fullHistoricalData.length;
                  const endIndex = totalDays - dataOffset;
                  const startIndex = Math.max(0, endIndex - periodDays);
                  const slicedData = fullHistoricalData.slice(startIndex, endIndex);

                  // Normalize the primary stock
                  const base = slicedData.length > 0 ? slicedData[0].price : 1;
                  const primarySeries = slicedData.map(d => ({
                    date: formatChartDate(d.date, chartPeriod),
                    pct: base ? parseFloat((((d.price - base) / base) * 100).toFixed(2)) : 0
                  }));

                  // Build normalized series for comparison stocks with the same offset
                  const offsetCompareStocks = chartCompareStocks.map(s => {
                    const stockFullData = s.__stockRef?.chartData?.fullHistorical || [];
                    if (stockFullData.length === 0) {
                      return { code: s.code, series: s.series }; // Fallback to original series
                    }
                    const stockTotalDays = stockFullData.length;
                    const stockEndIndex = stockTotalDays - dataOffset;
                    const stockStartIndex = Math.max(0, stockEndIndex - periodDays);
                    const stockSlicedData = stockFullData.slice(stockStartIndex, stockEndIndex);
                    const stockBase = stockSlicedData.length > 0 ? stockSlicedData[0].price : 1;
                    const series = stockSlicedData.map(d => ({
                      date: formatChartDate(d.date, chartPeriod),
                      pct: stockBase ? parseFloat((((d.price - stockBase) / stockBase) * 100).toFixed(2)) : 0
                    }));
                    return { code: s.code, series };
                  });

                  fullData = buildMultiStockDataset(primarySeries, offsetCompareStocks);
                } else {
                  // Fallback: use original method without offset support
                  const primarySeries = buildNormalizedSeries(selectedStock, chartPeriod);
                  fullData = buildMultiStockDataset(primarySeries, chartCompareStocks);
                }
              }

              // Apply zoom by slicing data based on domain
              const startIndex = Math.floor((zoomDomain.start / 100) * fullData.length);
              const endIndex = Math.ceil((zoomDomain.end / 100) * fullData.length);
              const multiData = fullData.slice(startIndex, endIndex);
              console.log('Rendering chart with offset:', dataOffset, 'dataLength:', fullData.length, 'showing:', startIndex, 'to', endIndex);

              return (
                <LineChart data={multiData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="date"
                    stroke="#9CA3AF"
                    angle={-90}
                    textAnchor="end"
                    height={80}
                    tick={{ fontSize: 10 }}
                  />
                {chartCompareStocks.length === 0 ? (
                  (() => {
                    const hasData = chartData.length > 0;
                    const rawMin = hasData ? Math.min(...chartData.map(d => d.price)) * 0.95 : 0;
                    const rawMax = hasData ? Math.max(...chartData.map(d => d.price)) * 1.05 : 10;
                    const intMin = Math.floor(rawMin);
                    const intMax = Math.ceil(rawMax);
                    return (
                      <YAxis
                        stroke="#9CA3AF"
                        allowDecimals={false}
                        domain={[intMin, intMax]}
                        tickFormatter={(v) => Math.round(v)}
                      />
                    );
                  })()
                ) : (
                  <YAxis
                    stroke="#9CA3AF"
                    tickFormatter={(v)=> `${Math.round(v)}%`}
                    domain={['auto','auto']}
                    allowDecimals={false}
                  />
                )}
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                  labelStyle={{ color: '#F3F4F6' }}
                  formatter={(value, name) => [chartCompareStocks.length === 0 ? `$${value.toFixed(2)}` : `${value.toFixed(2)}%`, name]}
                />
                <Legend wrapperStyle={{ paddingTop: '0px', marginTop: '0px', marginLeft: '0px', paddingLeft: '0px', width: 'auto' }} layout="vertical" verticalAlign="top" height={30} />
                {chartCompareStocks.length === 0 && selectedStock?.resistance && (
                  <>
                    <ReferenceLine
                      y={selectedStock.resistance}
                      stroke="#ef4444"
                      strokeDasharray="5 5"
                      label={{ value: `Resistance: $${selectedStock.resistance.toFixed(2)}`, position: 'right', fill: '#ef4444', fontSize: 12 }}
                    />
                    {selectedStock?.support && (
                      <ReferenceLine
                        y={selectedStock.support}
                        stroke="#10b981"
                        strokeDasharray="5 5"
                        label={{ value: `Support: $${selectedStock.support.toFixed(2)}`, position: 'right', fill: '#10b981', fontSize: 12 }}
                      />
                    )}
                  </>
                )}

                {/* AI Cycle Analysis - Vertical boundary markers and price ranges */}
                {showCycleAnalysis && cycleAnalysis && chartCompareStocks.length === 0 && cycleAnalysis.cycles && multiData.length > 0 && (
                  <>
                    {/* Vertical lines marking cycle boundaries */}
                    {cycleAnalysis.cycles.flatMap((cycle, idx) => {
                      // Find matching dates
                      const findClosestDate = (originalDate) => {
                        const targetTime = new Date(originalDate).getTime();
                        let closest = multiData[0];
                        let closestDiff = Infinity;

                        multiData.forEach(d => {
                          if (!d.date) return;
                          let dateStr = d.date;
                          if (dateStr.includes('-')) {
                            const parts = dateStr.split('-');
                            if (parts[0].length === 2) {
                              dateStr = `20${parts[0]}-${parts[1]}-${parts[2]}`;
                            } else if (parts.length === 2) {
                              dateStr = `${parts[0]}-${parts[1]}-01`;
                            }
                          }
                          const time = new Date(dateStr).getTime();
                          if (isNaN(time)) return;
                          const diff = Math.abs(time - targetTime);
                          if (diff < closestDiff) {
                            closestDiff = diff;
                            closest = d;
                          }
                        });
                        return closest;
                      };

                      const startDateObj = findClosestDate(cycle.startDate);
                      const endDateObj = findClosestDate(cycle.endDate);
                      const startDate = startDateObj.date;
                      const endDate = endDateObj.date;

                      const strokeColor = cycle.type === 'bull' ? '#22c55e' :
                                         cycle.type === 'bear' ? '#ef4444' :
                                         '#eab308';

                      return [
                        <ReferenceLine
                          key={`cycle-start-${idx}`}
                          x={startDate}
                          stroke={strokeColor}
                          strokeWidth={2}
                          label={{
                            value: `${cycle.type.toUpperCase()} ${idx + 1}`,
                            position: 'top',
                            fill: strokeColor,
                            fontSize: 10,
                            fontWeight: 'bold'
                          }}
                        />,
                        <ReferenceLine
                          key={`cycle-end-${idx}`}
                          x={endDate}
                          stroke={strokeColor}
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          label={{
                            value: `END`,
                            position: 'bottom',
                            fill: strokeColor,
                            fontSize: 10,
                            fontWeight: 'bold'
                          }}
                        />
                      ];
                    })}

                    {/* Horizontal price range lines for current cycle */}
                    {cycleAnalysis.currentCycle && (
                      <>
                        <ReferenceLine
                          y={cycleAnalysis.currentCycle.priceRange.high}
                          stroke="#22c55e"
                          strokeDasharray="5 5"
                          strokeWidth={2}
                          label={{
                            value: `Cycle High: $${cycleAnalysis.currentCycle.priceRange.high?.toFixed(2)}`,
                            position: 'right',
                            fill: '#22c55e',
                            fontSize: 11,
                            fontWeight: 'bold'
                          }}
                        />
                        <ReferenceLine
                          y={cycleAnalysis.currentCycle.priceRange.low}
                          stroke="#ef4444"
                          strokeDasharray="5 5"
                          strokeWidth={2}
                          label={{
                            value: `Cycle Low: $${cycleAnalysis.currentCycle.priceRange.low?.toFixed(2)}`,
                            position: 'right',
                            fill: '#ef4444',
                            fontSize: 11,
                            fontWeight: 'bold'
                          }}
                        />
                      </>
                    )}
                  </>
                )}

                {/* AI Analysis Overlay - Buy/Sell Signals and Support/Resistance */}
                {showAiAnalysis && aiAnalysis && chartCompareStocks.length === 0 && (
                  <>
                    {/* AI Resistance Levels */}
                    {aiAnalysis.resistanceLevels && aiAnalysis.resistanceLevels.length > 0 && aiAnalysis.resistanceLevels.map((level, idx) => (
                      <ReferenceLine
                        key={`ai-resistance-${idx}`}
                        y={level.price}
                        stroke="#f97316"
                        strokeDasharray="3 3"
                        strokeWidth={level.strength === 'strong' ? 2 : 1}
                        label={{
                          value: `AI Resistance: $${level.price.toFixed(2)}`,
                          position: idx % 2 === 0 ? 'right' : 'left',
                          fill: '#f97316',
                          fontSize: 10
                        }}
                      />
                    ))}

                    {/* AI Support Levels */}
                    {aiAnalysis.supportLevels && aiAnalysis.supportLevels.length > 0 && aiAnalysis.supportLevels.map((level, idx) => (
                      <ReferenceLine
                        key={`ai-support-${idx}`}
                        y={level.price}
                        stroke="#eab308"
                        strokeDasharray="3 3"
                        strokeWidth={level.strength === 'strong' ? 2 : 1}
                        label={{
                          value: `AI Support: $${level.price.toFixed(2)}`,
                          position: idx % 2 === 0 ? 'right' : 'left',
                          fill: '#eab308',
                          fontSize: 10
                        }}
                      />
                    ))}

                    {/* AI Buy Signals */}
                    {aiAnalysis.buySignals && aiAnalysis.buySignals.length > 0 && multiData.length > 0 && aiAnalysis.buySignals.map((signal, idx) => {
                      const closestPoint = multiData.reduce((closest, point) => {
                        if (!point.price || !closest.price) return closest;
                        const currentDiff = Math.abs(point.price - signal.price);
                        const closestDiff = Math.abs(closest.price - signal.price);
                        return currentDiff < closestDiff ? point : closest;
                      }, multiData[0]);

                      return closestPoint && closestPoint.price ? (
                        <ReferenceDot
                          key={`ai-buy-${idx}`}
                          x={closestPoint.date}
                          y={signal.price}
                          r={6}
                          fill="#3b82f6"
                          stroke="#ffffff"
                          strokeWidth={2}
                          label={{
                            value: `BUY $${signal.price.toFixed(2)}`,
                            position: 'top',
                            fill: '#3b82f6',
                            fontSize: 9,
                            fontWeight: 'bold'
                          }}
                        />
                      ) : null;
                    })}

                    {/* AI Sell Signals */}
                    {aiAnalysis.sellSignals && aiAnalysis.sellSignals.length > 0 && multiData.length > 0 && aiAnalysis.sellSignals.map((signal, idx) => {
                      const closestPoint = multiData.reduce((closest, point) => {
                        if (!point.price || !closest.price) return closest;
                        const currentDiff = Math.abs(point.price - signal.price);
                        const closestDiff = Math.abs(closest.price - signal.price);
                        return currentDiff < closestDiff ? point : closest;
                      }, multiData[0]);

                      return closestPoint && closestPoint.price ? (
                        <ReferenceDot
                          key={`ai-sell-${idx}`}
                          x={closestPoint.date}
                          y={signal.price}
                          r={6}
                          fill="#ec4899"
                          stroke="#ffffff"
                          strokeWidth={2}
                          label={{
                            value: `SELL $${signal.price.toFixed(2)}`,
                            position: 'bottom',
                            fill: '#ec4899',
                            fontSize: 9,
                            fontWeight: 'bold'
                          }}
                        />
                      ) : null;
                    })}
                  </>
                )}
                {chartCompareStocks.length === 0 ? (
                  <Line type="monotone" dataKey="price" name={`${selectedStock?.code || ''} Price`} stroke="#3B82F6" strokeWidth={2} dot={false} />
                ) : (
                  <>
                    <Line type="monotone" dataKey={selectedStock.code} name={selectedStock.code} stroke="#3B82F6" strokeWidth={2} dot={false} />
                    {chartCompareStocks.map((s, idx) => (
                      <Line
                        key={s.code}
                        type="monotone"
                        dataKey={s.code}
                        name={s.code}
                        strokeWidth={2}
                        dot={false}
                        stroke={['#10B981','#F59E0B','#EF4444','#8B5CF6','#0EA5E9','#84CC16','#D946EF'][idx % 7]}
                      />
                    ))}
                  </>
                )}
              </LineChart>
            );
          })()}
        </ResponsiveContainer>
        </div>
      </div>

      {/* AI Analysis Panel - Shows analysis summary and errors */}
      <AIPriceAnalysisPanel
        aiAnalysis={aiAnalysis}
        showAiAnalysis={showAiAnalysis}
        onRefresh={handleAiAnalysis}
        aiError={aiError}
      />

      {/* AI Cycle Analysis Panel - Shows cycle analysis summary and errors */}
      <AICycleAnalysisPanel
        cycleAnalysis={cycleAnalysis}
        showCycleAnalysis={showCycleAnalysis}
        onRefresh={handleCycleAnalysis}
        cycleError={cycleError}
      />
    </div>
  );
}
