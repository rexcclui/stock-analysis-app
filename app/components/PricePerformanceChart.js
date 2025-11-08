import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ReferenceDot, Scatter } from 'recharts';
import { LoadingState } from './LoadingState';
import { Sparkles, TrendingUp, TrendingDown, Target } from 'lucide-react';

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

  // AI Analysis state
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [showAiAnalysis, setShowAiAnalysis] = useState(false);

  // Don't return early here; render decisions happen after hooks are declared to keep hooks order stable.
  const shouldShowLoading = !selectedStock && loading;

  // Debug: Log fullHistoricalData availability
  useEffect(() => {
    console.log('fullHistoricalData length:', fullHistoricalData.length);
    console.log('chartData keys:', Object.keys(selectedStock?.chartData || {}));
  }, [fullHistoricalData, selectedStock]);
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

  // Reset AI analysis when stock changes
  useEffect(() => {
    setAiAnalysis(null);
    setAiError(null);
    setShowAiAnalysis(false);
  }, [selectedStock?.code]);

  // Handle AI price analysis
  const handleAiAnalysis = async (forceReload = false) => {
    if (!selectedStock || !fullHistoricalData || fullHistoricalData.length === 0) {
      setAiError('No price data available for analysis');
      return;
    }

    setAiLoading(true);
    setAiError(null);

    try {
      const response = await fetch('/api/analyze-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: selectedStock.code,
          priceData: fullHistoricalData,
          currentPrice: selectedStock.price,
          forceReload
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze price');
      }

      setAiAnalysis(data);
      setShowAiAnalysis(true);
    } catch (error) {
      console.error('AI Analysis Error:', error);
      setAiError(error.message);
    } finally {
      setAiLoading(false);
    }
  };

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
    console.log('Mouse down, starting drag at', e.clientX, 'offset:', dataOffset);
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

    console.log('Dragging:', {
      dragDistance,
      dragDays,
      oldOffset: dragStartRef.current.startOffset,
      newOffset,
      maxOffset
    });

    setDataOffset(newOffset);
  }, [chartPeriod, fullHistoricalData]);

  const handleMouseUp = useCallback(() => {
    console.log('Mouse up, ending drag');
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
          <button
            onClick={() => handleAiAnalysis(false)}
            disabled={aiLoading || !selectedStock || chartCompareStocks.length > 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all text-sm ${
              aiLoading || !selectedStock || chartCompareStocks.length > 0
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
            }`}
            title={chartCompareStocks.length > 0 ? 'AI analysis only available for single stock view' : 'Analyze price trend with AI'}
          >
            {aiLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500"></div>
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                AI Analysis
              </>
            )}
          </button>

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

                {/* AI Analysis - Resistance Levels */}
                {chartCompareStocks.length === 0 && showAiAnalysis && aiAnalysis?.resistanceLevels && aiAnalysis.resistanceLevels.map((level, idx) => (
                  <ReferenceLine
                    key={`resistance-${idx}`}
                    y={level.price}
                    stroke="#ef4444"
                    strokeDasharray="3 3"
                    strokeWidth={level.strength === 'strong' ? 2 : 1}
                    label={{
                      value: `AI Resistance: $${level.price.toFixed(2)}`,
                      position: idx % 2 === 0 ? 'right' : 'left',
                      fill: '#ef4444',
                      fontSize: 10
                    }}
                  />
                ))}

                {/* AI Analysis - Support Levels */}
                {chartCompareStocks.length === 0 && showAiAnalysis && aiAnalysis?.supportLevels && aiAnalysis.supportLevels.map((level, idx) => (
                  <ReferenceLine
                    key={`support-${idx}`}
                    y={level.price}
                    stroke="#10b981"
                    strokeDasharray="3 3"
                    strokeWidth={level.strength === 'strong' ? 2 : 1}
                    label={{
                      value: `AI Support: $${level.price.toFixed(2)}`,
                      position: idx % 2 === 0 ? 'right' : 'left',
                      fill: '#10b981',
                      fontSize: 10
                    }}
                  />
                ))}

                {/* AI Analysis - Buy Signals */}
                {chartCompareStocks.length === 0 && showAiAnalysis && aiAnalysis?.buySignals && aiAnalysis.buySignals.map((signal, idx) => {
                  // Find the closest data point to this price
                  const closestPoint = multiData.reduce((closest, point) => {
                    const currentDiff = Math.abs(point.price - signal.price);
                    const closestDiff = Math.abs(closest.price - signal.price);
                    return currentDiff < closestDiff ? point : closest;
                  }, multiData[0]);

                  return closestPoint ? (
                    <ReferenceDot
                      key={`buy-${idx}`}
                      x={closestPoint.date}
                      y={signal.price}
                      r={6}
                      fill="#10b981"
                      stroke="#ffffff"
                      strokeWidth={2}
                      label={{
                        value: `BUY $${signal.price.toFixed(2)}`,
                        position: 'top',
                        fill: '#10b981',
                        fontSize: 9,
                        fontWeight: 'bold'
                      }}
                    />
                  ) : null;
                })}

                {/* AI Analysis - Sell Signals */}
                {chartCompareStocks.length === 0 && showAiAnalysis && aiAnalysis?.sellSignals && aiAnalysis.sellSignals.map((signal, idx) => {
                  // Find the closest data point to this price
                  const closestPoint = multiData.reduce((closest, point) => {
                    const currentDiff = Math.abs(point.price - signal.price);
                    const closestDiff = Math.abs(closest.price - signal.price);
                    return currentDiff < closestDiff ? point : closest;
                  }, multiData[0]);

                  return closestPoint ? (
                    <ReferenceDot
                      key={`sell-${idx}`}
                      x={closestPoint.date}
                      y={signal.price}
                      r={6}
                      fill="#ef4444"
                      stroke="#ffffff"
                      strokeWidth={2}
                      label={{
                        value: `SELL $${signal.price.toFixed(2)}`,
                        position: 'bottom',
                        fill: '#ef4444',
                        fontSize: 9,
                        fontWeight: 'bold'
                      }}
                    />
                  ) : null;
                })}
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

      {/* AI Analysis Summary Panel */}
      {aiAnalysis && showAiAnalysis && !aiLoading && (
        <div className="mt-4 bg-gradient-to-br from-purple-900/40 to-blue-900/40 rounded-xl shadow-xl p-4 border border-purple-500/30">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Target className="text-purple-400" size={20} />
              </div>
              <div>
                <h4 className="text-lg font-bold text-blue-400">AI Price Analysis</h4>
                <p className="text-xs text-gray-400">
                  {aiAnalysis.fromCache ? '📦 Cached: ' : '🆕 Generated: '}
                  {new Date(aiAnalysis.analyzedAt).toLocaleString()}
                </p>
              </div>
            </div>
            <button
              onClick={() => handleAiAnalysis(true)}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs transition"
              title="Force reload analysis"
            >
              Refresh
            </button>
          </div>

          {/* Trend Analysis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
              <h5 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                {aiAnalysis.trendAnalysis?.direction === 'uptrend' ? <TrendingUp className="text-green-400" size={16} /> :
                 aiAnalysis.trendAnalysis?.direction === 'downtrend' ? <TrendingDown className="text-red-400" size={16} /> :
                 <Target className="text-gray-400" size={16} />}
                Trend: {aiAnalysis.trendAnalysis?.direction?.toUpperCase() || 'N/A'}
              </h5>
              <p className="text-xs text-gray-300">
                Strength: <span className="font-semibold">{aiAnalysis.trendAnalysis?.strength}</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">{aiAnalysis.trendAnalysis?.description}</p>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
              <h5 className="text-sm font-semibold text-white mb-2">Recommendation</h5>
              <p className="text-lg font-bold" style={{
                color: aiAnalysis.recommendation?.action?.includes('buy') ? '#10b981' :
                       aiAnalysis.recommendation?.action?.includes('sell') ? '#ef4444' : '#fbbf24'
              }}>
                {aiAnalysis.recommendation?.action?.toUpperCase() || 'N/A'}
              </p>
              <p className="text-xs text-gray-400">
                Confidence: <span className="font-semibold">{aiAnalysis.recommendation?.confidence}</span> |
                Timeframe: <span className="font-semibold">{aiAnalysis.recommendation?.timeframe}</span>
              </p>
              <p className="text-xs text-gray-300 mt-1">{aiAnalysis.recommendation?.reasoning}</p>
            </div>
          </div>

          {/* Buy Signals */}
          {aiAnalysis.buySignals && aiAnalysis.buySignals.length > 0 && (
            <div className="bg-green-900/20 rounded-lg p-3 border border-green-500/30 mb-3">
              <h5 className="text-sm font-semibold text-green-400 mb-2 flex items-center gap-2">
                <TrendingUp size={16} />
                Buy Signals
              </h5>
              <div className="space-y-2">
                {aiAnalysis.buySignals.map((signal, idx) => (
                  <div key={idx} className="text-xs">
                    <p className="text-white font-medium">
                      💚 ${signal.price.toFixed(2)} ({signal.type}) - {signal.confidence} confidence
                    </p>
                    <p className="text-gray-300 ml-4">→ {signal.reasoning}</p>
                    {signal.stopLoss && signal.targetPrice && (
                      <p className="text-gray-400 ml-4 text-xs">
                        Stop Loss: ${signal.stopLoss.toFixed(2)} | Target: ${signal.targetPrice.toFixed(2)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sell Signals */}
          {aiAnalysis.sellSignals && aiAnalysis.sellSignals.length > 0 && (
            <div className="bg-red-900/20 rounded-lg p-3 border border-red-500/30 mb-3">
              <h5 className="text-sm font-semibold text-red-400 mb-2 flex items-center gap-2">
                <TrendingDown size={16} />
                Sell Signals
              </h5>
              <div className="space-y-2">
                {aiAnalysis.sellSignals.map((signal, idx) => (
                  <div key={idx} className="text-xs">
                    <p className="text-white font-medium">
                      ❤️ ${signal.price.toFixed(2)} ({signal.type}) - {signal.confidence} confidence
                    </p>
                    <p className="text-gray-300 ml-4">→ {signal.reasoning}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Support & Resistance Levels */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            {aiAnalysis.supportLevels && aiAnalysis.supportLevels.length > 0 && (
              <div className="bg-green-900/20 rounded-lg p-3 border border-green-500/30">
                <h5 className="text-sm font-semibold text-green-400 mb-2">Support Levels</h5>
                <div className="space-y-1">
                  {aiAnalysis.supportLevels.map((level, idx) => (
                    <div key={idx} className="text-xs">
                      <p className="text-white font-medium">
                        ${level.price.toFixed(2)} ({level.strength})
                      </p>
                      <p className="text-gray-400 ml-2">{level.reasoning}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {aiAnalysis.resistanceLevels && aiAnalysis.resistanceLevels.length > 0 && (
              <div className="bg-red-900/20 rounded-lg p-3 border border-red-500/30">
                <h5 className="text-sm font-semibold text-red-400 mb-2">Resistance Levels</h5>
                <div className="space-y-1">
                  {aiAnalysis.resistanceLevels.map((level, idx) => (
                    <div key={idx} className="text-xs">
                      <p className="text-white font-medium">
                        ${level.price.toFixed(2)} ({level.strength})
                      </p>
                      <p className="text-gray-400 ml-2">{level.reasoning}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Key Levels and Risks */}
          {(aiAnalysis.keyLevelsToWatch || aiAnalysis.riskFactors) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {aiAnalysis.keyLevelsToWatch && aiAnalysis.keyLevelsToWatch.length > 0 && (
                <div className="bg-blue-900/20 rounded-lg p-3 border border-blue-500/30">
                  <h5 className="text-sm font-semibold text-blue-400 mb-2">Key Levels to Watch</h5>
                  <ul className="text-xs text-gray-300 space-y-1">
                    {aiAnalysis.keyLevelsToWatch.map((level, idx) => (
                      <li key={idx}>• {level}</li>
                    ))}
                  </ul>
                </div>
              )}

              {aiAnalysis.riskFactors && aiAnalysis.riskFactors.length > 0 && (
                <div className="bg-orange-900/20 rounded-lg p-3 border border-orange-500/30">
                  <h5 className="text-sm font-semibold text-orange-400 mb-2">Risk Factors</h5>
                  <ul className="text-xs text-gray-300 space-y-1">
                    {aiAnalysis.riskFactors.map((risk, idx) => (
                      <li key={idx}>• {risk}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Disclaimer */}
          <div className="mt-3 p-2 bg-gray-900/50 rounded border border-gray-700">
            <p className="text-xs text-gray-400 text-center">
              ⚠️ This AI analysis is for informational purposes only. Not financial advice. Always do your own research.
            </p>
          </div>
        </div>
      )}

      {/* AI Error Display */}
      {aiError && (
        <div className="mt-4 p-4 bg-red-900/30 rounded-lg border border-red-500/50">
          <div className="flex items-start gap-3">
            <div className="text-red-400 flex-shrink-0 mt-0.5">⚠️</div>
            <div className="flex-1">
              <p className="text-red-400 font-semibold mb-1">AI Analysis Failed</p>
              <p className="text-gray-300 text-sm">{aiError}</p>
              {aiError.includes('OPENAI_API_KEY') && (
                <p className="text-xs text-gray-400 mt-2">
                  Please configure your OpenAI API key in the .env.local file
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
