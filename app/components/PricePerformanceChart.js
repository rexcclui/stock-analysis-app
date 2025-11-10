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
  const [colorMode, setColorMode] = useState('default'); // 'default', 'rvi', 'vspy', or 'sma'
  const [spyData, setSpyData] = useState([]); // SPY historical data for VSPY calculation
  const [spyLoading, setSpyLoading] = useState(false); // Loading state for SPY data
  const [smaPeriod, setSmaPeriod] = useState(20); // SMA period for peak/bottom mode
  const [maxSmaGain, setMaxSmaGain] = useState({ gain: 0, period: 20, percentage: 0 }); // Track maximum gain

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

  // Reset max SMA gain when stock, period, or data range changes
  useEffect(() => {
    setMaxSmaGain({ gain: 0, period: 20, percentage: 0 });
  }, [selectedStock?.code, chartPeriod, dataOffset]);

  // Helper to get period size in days
  const getPeriodDays = (period) => {
    const periodMap = { '1D': 1, '7D': 7, '1M': 30, '3M': 90, '6M': 180, '1Y': 252, '3Y': 756, '5Y': 1260 };
    return periodMap[period] || 30;
  };

  // Helper to get N value for RVI calculation based on period
  const getRviN = (period) => {
    const nMap = { '1D': 1, '7D': 2, '1M': 3, '3M': 5, '6M': 6, '1Y': 7, '3Y': 10, '5Y': 20 };
    return nMap[period] || 5;
  };

  // Fetch SPY data when switching to VSPY mode
  useEffect(() => {
    const fetchSpyData = async () => {
      if (colorMode === 'vspy' && spyData.length === 0) {
        setSpyLoading(true);
        try {
          const response = await fetch('/api/stock?symbol=SPY');
          if (response.ok) {
            const stockData = await response.json();
            const spyHistorical = stockData?.chartData?.fullHistorical || [];
            setSpyData(spyHistorical);
          } else {
            console.error('Failed to fetch SPY data');
          }
        } catch (error) {
          console.error('Error fetching SPY data:', error);
        } finally {
          setSpyLoading(false);
        }
      }
    };

    fetchSpyData();
  }, [colorMode, spyData.length]);

  // Calculate RVI (Relative Volume Index) for each data point
  const calculateRVI = (data, period) => {
    if (!data || data.length === 0) return data;

    const N = getRviN(period);
    const longWindow = N * 5;

    return data.map((point, idx) => {
      // Need enough data for the long window
      if (idx < longWindow - 1) {
        return { ...point, rvi: 1 }; // Default RVI = 1
      }

      // Calculate average volume for N days (short window)
      const shortWindowData = data.slice(Math.max(0, idx - N + 1), idx + 1);
      const shortAvg = shortWindowData.reduce((sum, d) => sum + (d.volume || 0), 0) / shortWindowData.length;

      // Calculate average volume for N * 5 days (long window)
      const longWindowData = data.slice(Math.max(0, idx - longWindow + 1), idx + 1);
      const longAvg = longWindowData.reduce((sum, d) => sum + (d.volume || 0), 0) / longWindowData.length;

      // RVI = short average / long average
      const rvi = longAvg > 0 ? shortAvg / longAvg : 1;

      return { ...point, rvi };
    });
  };

  // Calculate 3-day moving average
  const calculate3DayMA = (data) => {
    if (!data || data.length === 0) return [];

    return data.map((point, idx) => {
      if (idx < 2) {
        // Not enough data for 3-day MA, use actual price
        return { ...point, ma3: point.price };
      }

      const sum = data.slice(idx - 2, idx + 1).reduce((acc, d) => acc + (d.price || 0), 0);
      const ma3 = sum / 3;

      return { ...point, ma3 };
    });
  };

  // Calculate VSPY (Relative Performance vs SPY on 3-day MA) for each data point
  const calculateVSPY = (data, period, spyHistoricalData) => {
    if (!data || data.length === 0 || !spyHistoricalData || spyHistoricalData.length === 0) {
      console.log('VSPY: No data or SPY data', { dataLen: data?.length, spyLen: spyHistoricalData?.length });
      return data.map(point => ({ ...point, vspy: 1 }));
    }

    const N = getRviN(period);

    // Calculate 3-day MA for both current stock and SPY
    const stockWithMA = calculate3DayMA(data);
    const spyWithMA = calculate3DayMA(spyHistoricalData);

    // Create a map of SPY data by date for quick lookup
    const spyMap = new Map();
    spyWithMA.forEach(point => {
      const dateKey = new Date(point.date).toISOString().split('T')[0];
      spyMap.set(dateKey, point);
    });

    console.log('VSPY: SPY map size:', spyMap.size, 'Stock data length:', stockWithMA.length, 'N:', N);
    console.log('VSPY: Sample stock dates:', stockWithMA.slice(0, 3).map(p => p.date));
    console.log('VSPY: Sample SPY dates:', Array.from(spyMap.keys()).slice(0, 3));

    let matchedCount = 0;
    let unmatchedCount = 0;
    const vspyValues = [];

    const result = stockWithMA.map((point, idx) => {
      // Need enough data for N-day performance calculation
      if (idx < N) {
        return { ...point, vspy: 1 }; // Default VSPY = 1
      }

      const currentDate = new Date(point.date).toISOString().split('T')[0];
      const nDaysAgoDate = new Date(data[idx - N].date).toISOString().split('T')[0];

      // Get current and N-days-ago MA for the stock
      const currentStockMA = point.ma3;
      const nDaysAgoStockMA = stockWithMA[idx - N].ma3;

      // Calculate N-day performance for stock on 3-day MA
      const stockPerformance = nDaysAgoStockMA > 0
        ? ((currentStockMA - nDaysAgoStockMA) / nDaysAgoStockMA)
        : 0;

      // Get corresponding SPY data
      const currentSpyPoint = spyMap.get(currentDate);
      const nDaysAgoSpyPoint = spyMap.get(nDaysAgoDate);

      if (!currentSpyPoint || !nDaysAgoSpyPoint) {
        unmatchedCount++;
        return { ...point, vspy: 1 }; // Default if SPY data not available
      }

      matchedCount++;

      // Calculate N-day performance for SPY on 3-day MA
      const spyPerformance = nDaysAgoSpyPoint.ma3 > 0
        ? ((currentSpyPoint.ma3 - nDaysAgoSpyPoint.ma3) / nDaysAgoSpyPoint.ma3)
        : 0;

      // VSPY = stock performance / SPY performance
      // Handle edge cases where SPY performance is 0 or very small
      let vspy = 1;
      if (Math.abs(spyPerformance) > 0.0001) {
        vspy = stockPerformance / spyPerformance;
        // Normalize VSPY to be around 1.0, similar to RVI
        // If both are positive, vspy > 1 means stock outperforming
        // If both are negative, vspy > 1 means stock declining less
        // Keep vspy in reasonable range
        vspy = Math.max(-5, Math.min(10, vspy));
      } else if (stockPerformance > 0.01) {
        // SPY flat but stock up significantly
        vspy = 3;
      } else if (stockPerformance < -0.01) {
        // SPY flat but stock down significantly
        vspy = 0.3;
      }

      vspyValues.push(vspy);
      return { ...point, vspy };
    });

    console.log('VSPY: Matched:', matchedCount, 'Unmatched:', unmatchedCount);
    console.log('VSPY: Values range:', Math.min(...vspyValues), 'to', Math.max(...vspyValues));
    console.log('VSPY: Sample values:', vspyValues.slice(0, 10));

    return result;
  };

  // Helper to format date based on period
  const formatChartDate = (dateStr, period) => {
    const d = new Date(dateStr);
    // Use consistent YY-MM-DD format for all periods (enables vertical cycle lines on all periods)
    const yy = String(d.getFullYear()).slice(-2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  };

  // Map RVI value to color (higher RVI = deeper/more saturated blue to purple to red)
  const getRviColor = (rvi) => {
    // RVI ranges from very low to extremely high volume
    // Blue scale for normal ranges, purple for extreme, purple-red for very extreme
    if (rvi < 0.5) {
      return '#DBEAFE'; // Very light blue (very low volume)
    } else if (rvi < 0.7) {
      return '#BFDBFE'; // Extra light blue (low volume)
    } else if (rvi < 0.85) {
      return '#93C5FD'; // Light blue
    } else if (rvi < 1.0) {
      return '#60A5FA'; // Medium-light blue
    } else if (rvi < 1.15) {
      return '#3B82F6'; // Standard blue (normal volume)
    } else if (rvi < 1.3) {
      return '#2563EB'; // Medium blue
    } else if (rvi < 1.5) {
      return '#1D4ED8'; // Medium-deep blue
    } else if (rvi < 1.8) {
      return '#1E40AF'; // Deep blue (high volume)
    } else if (rvi < 2.2) {
      return '#1E3A8A'; // Very deep blue
    } else if (rvi < 2.8) {
      return '#172554'; // Darkest blue
    } else if (rvi < 3.0) {
      return '#312E81'; // Blue-purple transition
    } else if (rvi < 4.0) {
      return '#6B21A8'; // Purple (extreme volume)
    } else {
      return '#BE185D'; // Purple-red (very extreme volume)
    }
  };

  // Map VSPY value to color with 21 levels for more granular visualization
  const getVspyColor = (vspy) => {
    // VSPY < 1 = underperforming SPY (reds/yellows - bad)
    // VSPY = 1 = matching SPY (light/standard blue - neutral)
    // VSPY > 1 = outperforming SPY (deep blues/purples/greens - good)
    if (vspy < 0.3) {
      return '#DC2626'; // Dark red (severe underperformance)
    } else if (vspy < 0.4) {
      return '#EF4444'; // Red (strong underperformance)
    } else if (vspy < 0.5) {
      return '#F87171'; // Light red (underperformance)
    } else if (vspy < 0.6) {
      return '#FB923C'; // Orange (moderate underperformance)
    } else if (vspy < 0.7) {
      return '#FBBF24'; // Amber (slight underperformance)
    } else if (vspy < 0.8) {
      return '#FCD34D'; // Yellow (approaching neutral)
    } else if (vspy < 0.85) {
      return '#DBEAFE'; // Very light blue
    } else if (vspy < 0.9) {
      return '#BFDBFE'; // Extra light blue
    } else if (vspy < 0.95) {
      return '#93C5FD'; // Light blue
    } else if (vspy < 1.0) {
      return '#60A5FA'; // Medium-light blue
    } else if (vspy < 1.05) {
      return '#3B82F6'; // Standard blue (matching SPY)
    } else if (vspy < 1.1) {
      return '#2563EB'; // Medium blue
    } else if (vspy < 1.2) {
      return '#1D4ED8'; // Medium-deep blue
    } else if (vspy < 1.3) {
      return '#1E40AF'; // Deep blue
    } else if (vspy < 1.5) {
      return '#1E3A8A'; // Very deep blue
    } else if (vspy < 1.8) {
      return '#312E81'; // Blue-purple transition
    } else if (vspy < 2.0) {
      return '#4C1D95'; // Purple (strong outperformance)
    } else if (vspy < 2.5) {
      return '#7C3AED'; // Bright purple
    } else if (vspy < 3.0) {
      return '#A855F7'; // Magenta-purple
    } else if (vspy < 4.0) {
      return '#C026D3'; // Bright magenta (very strong outperformance)
    } else {
      return '#10B981'; // Bright green (extreme outperformance)
    }
  };

  // Get the color index value based on the current color mode
  const getColorIndexValue = (point, mode) => {
    if (mode === 'rvi') {
      return point.rvi || 1;
    } else if (mode === 'vspy') {
      return point.vspy || 1;
    }
    return 1;
  };

  // Add RVI/VSPY-based dataKeys to chart data for colored segments
  const addRviDataKeys = (data, mode = 'rvi') => {
    if (!data || data.length === 0) return data;

    // Use appropriate color function based on mode
    const getColor = mode === 'vspy' ? getVspyColor : getRviColor;

    // Identify color changes and assign segment IDs
    let segmentId = 0;
    let currentColor = getColor(getColorIndexValue(data[0], mode));
    const colorMap = {}; // Maps segment ID to color
    colorMap[0] = currentColor;

    const dataWithSegments = data.map((point, idx) => {
      const pointColor = getColor(getColorIndexValue(point, mode));
      const newPoint = { ...point };

      if (pointColor !== currentColor && idx > 0) {
        // Color changed - this point belongs to new segment
        // But also add it to previous segment for continuity
        newPoint[`price_seg_${segmentId}`] = point.price; // End of previous segment
        segmentId++;
        currentColor = pointColor;
        colorMap[segmentId] = currentColor;
        newPoint[`price_seg_${segmentId}`] = point.price; // Start of new segment
      } else {
        // Normal point within segment
        newPoint[`price_seg_${segmentId}`] = point.price;
      }

      return newPoint;
    });

    // Add null values for all other segments
    const maxSegmentId = segmentId;
    const enhancedData = dataWithSegments.map(point => {
      const newPoint = { ...point };
      for (let i = 0; i <= maxSegmentId; i++) {
        if (newPoint[`price_seg_${i}`] === undefined) {
          newPoint[`price_seg_${i}`] = null;
        }
      }
      return newPoint;
    });

    return { data: enhancedData, colorMap, maxSegmentId };
  };

  // Calculate SMA (Simple Moving Average) for price data
  const calculateSMA = (data, period) => {
    if (!data || data.length === 0) return data;

    return data.map((point, idx) => {
      if (idx < period - 1) {
        return { ...point, sma: null, smaSlope: null };
      }

      // Calculate SMA for the current window
      const windowData = data.slice(idx - period + 1, idx + 1);
      const sma = windowData.reduce((sum, d) => sum + (d.price || 0), 0) / period;

      // Calculate slope (derivative) of SMA
      let smaSlope = null;
      if (idx >= period) {
        const prevWindowData = data.slice(idx - period, idx);
        const prevSma = prevWindowData.reduce((sum, d) => sum + (d.price || 0), 0) / period;
        smaSlope = sma - prevSma;
      }

      return { ...point, sma, smaSlope };
    });
  };

  // Detect turning points (peaks and bottoms) in SMA and calculate price differences
  const detectTurningPoints = (data) => {
    if (!data || data.length === 0) return { data, turningPoints: [], totalGain: 0 };

    const turningPoints = [];
    let lastBottom = null;
    let totalGain = 0;

    // Detect turning points where slope changes sign
    for (let i = 1; i < data.length; i++) {
      const curr = data[i];
      const prev = data[i - 1];

      if (!curr.smaSlope || !prev.smaSlope) continue;

      // Bottom: slope changes from negative to positive
      if (prev.smaSlope < 0 && curr.smaSlope >= 0) {
        const turningPoint = {
          index: i,
          date: curr.date,
          price: curr.price,
          type: 'bottom'
        };
        turningPoints.push(turningPoint);
        lastBottom = turningPoint;
      }

      // Peak: slope changes from positive to negative
      if (prev.smaSlope > 0 && curr.smaSlope <= 0) {
        const turningPoint = {
          index: i,
          date: curr.date,
          price: curr.price,
          type: 'peak'
        };
        turningPoints.push(turningPoint);

        // Calculate gain from last bottom to this peak
        if (lastBottom) {
          const gain = turningPoint.price - lastBottom.price;
          totalGain += gain;
          turningPoint.gain = gain;
          lastBottom = null;
        }
      }
    }

    return { data, turningPoints, totalGain };
  };

  // Add SMA-based colored segments (uptrends in light blue, downtrends in gray)
  const addSmaDataKeys = (data, turningPoints) => {
    if (!data || data.length === 0) return data;

    // Identify segments between turning points
    let segmentId = 0;
    const colorMap = {}; // Maps segment ID to color
    let currentType = 'neutral'; // Start as neutral until first turning point
    colorMap[0] = '#9CA3AF'; // Gray for initial neutral/downtrend

    const dataWithSegments = data.map((point, idx) => {
      const newPoint = { ...point };

      // Check if this point is a turning point
      const turningPoint = turningPoints.find(tp => tp.date === point.date);

      if (turningPoint) {
        // End current segment
        newPoint[`price_seg_${segmentId}`] = point.price;

        // Start new segment
        segmentId++;
        currentType = turningPoint.type === 'bottom' ? 'uptrend' : 'downtrend';
        colorMap[segmentId] = currentType === 'uptrend' ? '#60A5FA' : '#9CA3AF'; // Light blue for uptrend, gray for downtrend
        newPoint[`price_seg_${segmentId}`] = point.price;
      } else {
        // Normal point within segment
        newPoint[`price_seg_${segmentId}`] = point.price;
      }

      return newPoint;
    });

    // Add null values for all other segments
    const maxSegmentId = segmentId;
    const enhancedData = dataWithSegments.map(point => {
      const newPoint = { ...point };
      for (let i = 0; i <= maxSegmentId; i++) {
        if (newPoint[`price_seg_${i}`] === undefined) {
          newPoint[`price_seg_${i}`] = null;
        }
      }
      return newPoint;
    });

    return { data: enhancedData, colorMap, maxSegmentId };
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
      price: d.price,
      volume: d.volume || 0
    }));

    // Apply RVI calculation if in RVI color mode
    if (colorMode === 'rvi') {
      return calculateRVI(slicedData, chartPeriod);
    }

    // Apply VSPY calculation if in VSPY color mode
    if (colorMode === 'vspy') {
      // Get the corresponding SPY data slice
      if (spyData.length > 0) {
        const spyTotalDays = spyData.length;
        const spyEndIndex = spyTotalDays - dataOffset;
        const spyStartIndex = Math.max(0, spyEndIndex - periodDays);
        // Keep original date format for calculation
        const spySlicedData = spyData.slice(spyStartIndex, spyEndIndex).map(d => ({
          date: d.date, // Keep original YYYY-MM-DD format
          price: d.price,
          volume: d.volume || 0
        }));

        // Calculate VSPY with original dates, then format
        const unformattedSlicedData = fullHistoricalData.slice(startIndex, endIndex).map(d => ({
          date: d.date,
          price: d.price,
          volume: d.volume || 0
        }));
        const dataWithVSPY = calculateVSPY(unformattedSlicedData, chartPeriod, spySlicedData);

        // Now format the dates
        return dataWithVSPY.map(d => ({
          ...d,
          date: formatChartDate(d.date, chartPeriod)
        }));
      }
    }

    // Apply SMA calculation if in SMA mode
    if (colorMode === 'sma') {
      return calculateSMA(slicedData, smaPeriod);
    }

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
    return <LoadingState message="Loading price performance chart..." className="mb-0" style={{ marginTop: 0, marginBottom: 0 }} />;
  }

  return (
  <div className="mb-0" style={{ marginTop: 0, marginBottom: 0 }}>
  <div className="flex items-center justify-between mb-0">
        <div className="flex items-center gap-3 w-full">
          

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

          {/* Color Mode Toggle */}
          {chartCompareStocks.length === 0 && selectedStock && (
            <button
              onClick={() => {
                if (colorMode === 'default') {
                  setColorMode('rvi');
                } else if (colorMode === 'rvi') {
                  setColorMode('vspy');
                } else if (colorMode === 'vspy') {
                  setColorMode('sma');
                } else {
                  setColorMode('default');
                }
              }}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition ${
                colorMode === 'rvi'
                  ? 'bg-purple-700 hover:bg-purple-600 text-white'
                  : colorMode === 'vspy'
                  ? 'bg-orange-700 hover:bg-orange-600 text-white'
                  : colorMode === 'sma'
                  ? 'bg-emerald-700 hover:bg-emerald-600 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
              title={colorMode === 'rvi' ? 'Switch to VSPY coloring' : colorMode === 'vspy' ? 'Switch to SMA Peak/Bottom mode' : colorMode === 'sma' ? 'Disable coloring' : 'Enable RVI coloring'}
            >
              {colorMode === 'rvi' ? 'RVI: ON' : colorMode === 'vspy' ? 'VSPY: ON' : colorMode === 'sma' ? 'SMA P/B: ON' : 'Color: OFF'}
            </button>
          )}

          {/* SMA Peak/Bottom Mode Toggle */}
          {chartCompareStocks.length === 0 && selectedStock && (
            <button
              onClick={() => setColorMode(colorMode === 'default' ? 'sma' : 'default')}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition ${
                colorMode === 'sma'
                  ? 'bg-emerald-700 hover:bg-emerald-600 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
              title={colorMode === 'sma' ? 'Disable SMA Peak/Bottom mode' : 'Enable SMA Peak/Bottom mode'}
            >
              {colorMode === 'sma' ? 'SMA P/B: ON' : 'SMA P/B: OFF'}
            </button>
          )}

          {/* SMA Period Slider */}
          {colorMode === 'sma' && chartCompareStocks.length === 0 && selectedStock && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-300 font-medium">SMA: {smaPeriod}</label>
              <input
                type="range"
                min="5"
                max="100"
                value={smaPeriod}
                onChange={(e) => setSmaPeriod(parseInt(e.target.value))}
                className="w-24 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                title={`SMA Period: ${smaPeriod} days`}
              />
            </div>
          )}

          {/* SMA Period Slider */}
          {colorMode === 'sma' && chartCompareStocks.length === 0 && selectedStock && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-300 font-medium">SMA: {smaPeriod}</label>
              <input
                type="range"
                min="5"
                max="100"
                value={smaPeriod}
                onChange={(e) => setSmaPeriod(parseInt(e.target.value))}
                className="w-24 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                title={`SMA Period: ${smaPeriod} days`}
              />
            </div>
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

        {/* RVI Color Legend */}
        {colorMode === 'rvi' && chartCompareStocks.length === 0 && selectedStock && (
          <div className="mb-3 px-4">
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs font-semibold text-purple-400">
                📊 RVI Color Legend (Relative Volume Index)
              </div>
              <div className="text-xs text-gray-400">
                Blue → Purple → Pink (volume intensity)
              </div>
            </div>
            <div className="flex items-center gap-0.5 h-8 rounded-lg overflow-hidden border-2 border-purple-600/30 shadow-lg">
              <div className="flex-1 h-full flex items-center justify-center text-[8px] font-semibold leading-tight" style={{ backgroundColor: '#DBEAFE', color: '#1E3A8A' }}>
                &lt;0.5
              </div>
              <div className="flex-1 h-full flex items-center justify-center text-[8px] font-semibold leading-tight" style={{ backgroundColor: '#BFDBFE', color: '#1E3A8A' }}>
                0.5-0.7
              </div>
              <div className="flex-1 h-full flex items-center justify-center text-[8px] font-semibold leading-tight" style={{ backgroundColor: '#93C5FD', color: '#1E3A8A' }}>
                0.7-0.85
              </div>
              <div className="flex-1 h-full flex items-center justify-center text-[8px] font-semibold leading-tight" style={{ backgroundColor: '#60A5FA', color: '#1E3A8A' }}>
                0.85-1.0
              </div>
              <div className="flex-1 h-full flex items-center justify-center text-[8px] font-semibold leading-tight" style={{ backgroundColor: '#3B82F6', color: '#FFFFFF' }}>
                1.0-1.15
              </div>
              <div className="flex-1 h-full flex items-center justify-center text-[8px] font-semibold leading-tight" style={{ backgroundColor: '#2563EB', color: '#FFFFFF' }}>
                1.15-1.3
              </div>
              <div className="flex-1 h-full flex items-center justify-center text-[8px] font-semibold leading-tight" style={{ backgroundColor: '#1D4ED8', color: '#FFFFFF' }}>
                1.3-1.5
              </div>
              <div className="flex-1 h-full flex items-center justify-center text-[8px] font-semibold leading-tight" style={{ backgroundColor: '#1E40AF', color: '#FFFFFF' }}>
                1.5-1.8
              </div>
              <div className="flex-1 h-full flex items-center justify-center text-[8px] font-semibold leading-tight" style={{ backgroundColor: '#1E3A8A', color: '#FFFFFF' }}>
                1.8-2.2
              </div>
              <div className="flex-1 h-full flex items-center justify-center text-[8px] font-semibold leading-tight" style={{ backgroundColor: '#172554', color: '#FFFFFF' }}>
                2.2-2.8
              </div>
              <div className="flex-1 h-full flex items-center justify-center text-[8px] font-semibold leading-tight" style={{ backgroundColor: '#312E81', color: '#FFFFFF' }}>
                2.8-3.0
              </div>
              <div className="flex-1 h-full flex items-center justify-center text-[8px] font-semibold leading-tight" style={{ backgroundColor: '#6B21A8', color: '#FFFFFF' }}>
                3.0-4.0
              </div>
              <div className="flex-1 h-full flex items-center justify-center text-[8px] font-semibold leading-tight" style={{ backgroundColor: '#BE185D', color: '#FFFFFF' }}>
                &gt;4.0
              </div>
            </div>
            <div className="text-[10px] text-gray-500 mt-1 text-center italic">
              RVI = Avg volume ({getRviN(chartPeriod)} days) / Avg volume ({getRviN(chartPeriod) * 5} days)
            </div>
          </div>
        )}

        {/* SMA Peak/Bottom Info Display */}
        {colorMode === 'sma' && chartCompareStocks.length === 0 && selectedStock && (() => {
          const currentData = getCurrentDataSlice();
          const smaAnalysis = detectTurningPoints(currentData);
          const startPrice = currentData.length > 0 ? currentData[0].price : 1;
          const endPrice = currentData.length > 0 ? currentData[currentData.length - 1].price : 1;
          const gainPercentage = startPrice > 0 ? (smaAnalysis.totalGain / startPrice) * 100 : 0;
          const marketChange = startPrice > 0 ? ((endPrice - startPrice) / startPrice) * 100 : 0;
          const marketChangeAmount = endPrice - startPrice;

          // Update max gain if current is higher
          if (gainPercentage > maxSmaGain.percentage) {
            setMaxSmaGain({ gain: smaAnalysis.totalGain, period: smaPeriod, percentage: gainPercentage });
          }

          return (
            <div className="mb-3 px-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold text-emerald-400">
                  📈 SMA Peak/Bottom Analysis (SMA Period: {smaPeriod})
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div
                    className="text-xs font-bold"
                    style={{ color: gainPercentage > marketChange ? '#22c55e' : '#ef4444' }}
                  >
                    Current Gain: {gainPercentage.toFixed(2)}% (${smaAnalysis.totalGain.toFixed(2)})
                  </div>
                  <div className={`text-xs font-semibold ${marketChange >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                    Market Change: {marketChange >= 0 ? '+' : ''}{marketChange.toFixed(2)}% (${marketChangeAmount >= 0 ? '+' : ''}${marketChangeAmount.toFixed(2)})
                  </div>
                  <div
                    className="text-xs font-semibold text-yellow-400 cursor-pointer hover:text-yellow-300 transition"
                    onClick={() => setSmaPeriod(maxSmaGain.period)}
                    title="Click to set SMA slider to this period"
                  >
                    Max Gain: {maxSmaGain.percentage.toFixed(2)}% (${maxSmaGain.gain.toFixed(2)}) @ SMA {maxSmaGain.period}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-[10px] text-gray-400">
                <div className="flex items-center gap-1">
                  <div className="w-4 h-2 bg-blue-400 rounded"></div>
                  <span>Uptrend (Bottom to Peak)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-2 bg-gray-400 rounded"></div>
                  <span>Downtrend (Peak to Bottom)</span>
                </div>
                <div className="text-gray-500 italic">
                  {smaAnalysis.turningPoints.length} turning points detected
                </div>
              </div>
            </div>
          );
        })()}

        {/* VSPY Color Legend */}
        {colorMode === 'vspy' && chartCompareStocks.length === 0 && selectedStock && (
          <div className="mb-3 px-4">
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs font-semibold text-orange-400">
                📊 VSPY Color Legend (Relative Performance vs SPY) - 21 Levels
              </div>
              <div className="text-xs text-gray-400">
                🔴 Red (underperform) → 🟡 Yellow → 🔵 Blue (match) → 🟣 Purple → 🟢 Green (outperform)
              </div>
            </div>
            <div className="flex items-center gap-0.5 h-8 rounded-lg overflow-hidden border-2 border-orange-600/30 shadow-lg">
              <div className="flex-1 h-full flex items-center justify-center text-[7px] font-semibold leading-tight" style={{ backgroundColor: '#DC2626', color: '#FFFFFF' }} title="Severe underperformance">
                &lt;0.3
              </div>
              <div className="flex-1 h-full flex items-center justify-center text-[7px] font-semibold leading-tight" style={{ backgroundColor: '#EF4444', color: '#FFFFFF' }} title="Strong underperformance">
                0.3
              </div>
              <div className="flex-1 h-full flex items-center justify-center text-[7px] font-semibold leading-tight" style={{ backgroundColor: '#F87171', color: '#FFFFFF' }} title="Underperformance">
                0.4
              </div>
              <div className="flex-1 h-full flex items-center justify-center text-[7px] font-semibold leading-tight" style={{ backgroundColor: '#FB923C', color: '#FFFFFF' }} title="Moderate underperformance">
                0.5
              </div>
              <div className="flex-1 h-full flex items-center justify-center text-[7px] font-semibold leading-tight" style={{ backgroundColor: '#FBBF24', color: '#78350F' }} title="Slight underperformance">
                0.6
              </div>
              <div className="flex-1 h-full flex items-center justify-center text-[7px] font-semibold leading-tight" style={{ backgroundColor: '#FCD34D', color: '#78350F' }} title="Approaching neutral">
                0.7
              </div>
              <div className="flex-1 h-full flex items-center justify-center text-[7px] font-semibold leading-tight" style={{ backgroundColor: '#DBEAFE', color: '#1E3A8A' }}>
                0.8
              </div>
              <div className="flex-1 h-full flex items-center justify-center text-[7px] font-semibold leading-tight" style={{ backgroundColor: '#BFDBFE', color: '#1E3A8A' }}>
                0.85
              </div>
              <div className="flex-1 h-full flex items-center justify-center text-[7px] font-semibold leading-tight" style={{ backgroundColor: '#93C5FD', color: '#1E3A8A' }}>
                0.9
              </div>
              <div className="flex-1 h-full flex items-center justify-center text-[7px] font-semibold leading-tight" style={{ backgroundColor: '#60A5FA', color: '#1E3A8A' }}>
                0.95
              </div>
              <div className="flex-1 h-full flex items-center justify-center text-[7px] font-semibold leading-tight" style={{ backgroundColor: '#3B82F6', color: '#FFFFFF' }} title="Matching SPY">
                1.0
              </div>
              <div className="flex-1 h-full flex items-center justify-center text-[7px] font-semibold leading-tight" style={{ backgroundColor: '#2563EB', color: '#FFFFFF' }}>
                1.05
              </div>
              <div className="flex-1 h-full flex items-center justify-center text-[7px] font-semibold leading-tight" style={{ backgroundColor: '#1D4ED8', color: '#FFFFFF' }}>
                1.1
              </div>
              <div className="flex-1 h-full flex items-center justify-center text-[7px] font-semibold leading-tight" style={{ backgroundColor: '#1E40AF', color: '#FFFFFF' }}>
                1.2
              </div>
              <div className="flex-1 h-full flex items-center justify-center text-[7px] font-semibold leading-tight" style={{ backgroundColor: '#1E3A8A', color: '#FFFFFF' }}>
                1.3
              </div>
              <div className="flex-1 h-full flex items-center justify-center text-[7px] font-semibold leading-tight" style={{ backgroundColor: '#312E81', color: '#FFFFFF' }}>
                1.5
              </div>
              <div className="flex-1 h-full flex items-center justify-center text-[7px] font-semibold leading-tight" style={{ backgroundColor: '#4C1D95', color: '#FFFFFF' }} title="Strong outperformance">
                1.8
              </div>
              <div className="flex-1 h-full flex items-center justify-center text-[7px] font-semibold leading-tight" style={{ backgroundColor: '#7C3AED', color: '#FFFFFF' }}>
                2.0
              </div>
              <div className="flex-1 h-full flex items-center justify-center text-[7px] font-semibold leading-tight" style={{ backgroundColor: '#A855F7', color: '#FFFFFF' }}>
                2.5
              </div>
              <div className="flex-1 h-full flex items-center justify-center text-[7px] font-semibold leading-tight" style={{ backgroundColor: '#C026D3', color: '#FFFFFF' }} title="Very strong outperformance">
                3.0
              </div>
              <div className="flex-1 h-full flex items-center justify-center text-[7px] font-semibold leading-tight" style={{ backgroundColor: '#10B981', color: '#FFFFFF' }} title="Extreme outperformance">
                &gt;4.0
              </div>
            </div>
            <div className="text-[10px] text-gray-500 mt-1 text-center italic">
              VSPY = {getRviN(chartPeriod)}-day performance on 3-day MA (Stock) / {getRviN(chartPeriod)}-day performance on 3-day MA (SPY)
            </div>
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
            <div className="mb-3 px-4">
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs font-semibold text-green-400">
                  📊 AI Cycle Timeline ({visibleCycles.length} of {cycleAnalysis.cycles.length} visible)
                </div>
                <div className="text-xs text-gray-400">
                  Cycles shown proportionally by duration
                </div>
              </div>
              <div className="relative h-10 bg-gray-900 rounded-lg flex items-center overflow-hidden shadow-lg border-2 border-green-600/30">
                {visibleCycles.map((cycle, idx) => {
                  const cycleColor = cycle.type === 'bull' ? 'bg-green-500' :
                                    cycle.type === 'bear' ? 'bg-red-500' :
                                    'bg-yellow-500';
                  const textColor = cycle.type === 'bull' ? 'text-green-50' :
                                   cycle.type === 'bear' ? 'text-red-50' :
                                   'text-yellow-50';

                  return (
                    <div
                      key={`timeline-${idx}`}
                      className={`h-8 ${cycleColor} border-l-2 border-white flex flex-col items-center justify-center ${textColor} font-bold overflow-hidden hover:brightness-110 transition-all cursor-pointer`}
                      style={{
                        flex: cycle.duration,
                        fontSize: '10px',
                        padding: '0 3px',
                        boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.2)'
                      }}
                      title={`${cycle.type.toUpperCase()} Cycle #${idx + 1}\n${cycle.startDate} → ${cycle.endDate}\nDuration: ${cycle.duration} days\nPrice: $${cycle.priceRange.low.toFixed(2)} - $${cycle.priceRange.high.toFixed(2)}\nChange: ${cycle.priceRange.percentChange >= 0 ? '+' : ''}${cycle.priceRange.percentChange.toFixed(1)}%`}
                    >
                      <span className="whitespace-nowrap overflow-hidden text-ellipsis leading-tight">
                        {cycle.type.charAt(0).toUpperCase()}{idx + 1}
                      </span>
                      <span className="text-[8px] opacity-90 whitespace-nowrap overflow-hidden text-ellipsis">
                        {cycle.duration}d
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="text-[10px] text-gray-500 mt-1 text-center italic">
                Vertical cycle boundary markers are also shown on the chart below
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
            msUserSelect: 'none',
            position: 'relative'
          }}
          onMouseLeave={handleMouseUp}
        >
          {/* SPY Data Loading Overlay */}
          {colorMode === 'vspy' && (spyLoading || spyData.length === 0) && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(17, 24, 39, 0.9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
              borderRadius: '0.5rem'
            }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  border: '4px solid #FB923C',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                <div style={{ color: '#FB923C', fontSize: '14px', fontWeight: 500 }}>
                  Loading SPY data for VSPY calculation...
                </div>
              </div>
              <style>{`
                @keyframes spin {
                  to { transform: rotate(360deg); }
                }
              `}</style>
            </div>
          )}
          <ResponsiveContainer width="100%" height={400} style={{ margin: 0, padding: 0 }}>
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
              let multiData = fullData.slice(startIndex, endIndex);

              // For RVI or VSPY mode, add segment dataKeys
              let rviSegments = null;
              if ((colorMode === 'rvi' || colorMode === 'vspy') && chartCompareStocks.length === 0) {
                rviSegments = addRviDataKeys(multiData, colorMode);
                multiData = rviSegments.data;
              }

              // For SMA mode, add segment dataKeys based on turning points
              let smaSegments = null;
              if (colorMode === 'sma' && chartCompareStocks.length === 0) {
                const smaAnalysis = detectTurningPoints(multiData);
                smaSegments = addSmaDataKeys(multiData, smaAnalysis.turningPoints);
                multiData = smaSegments.data;
              }

              console.log('Rendering chart with offset:', dataOffset, 'dataLength:', fullData.length, 'showing:', startIndex, 'to', endIndex, 'Color mode:', colorMode);

              // Debug cycle analysis state
              if (showCycleAnalysis) {
                console.log('=== CYCLE ANALYSIS STATE ===');
                console.log('showCycleAnalysis:', showCycleAnalysis);
                console.log('cycleAnalysis exists:', !!cycleAnalysis);
                console.log('cycleAnalysis.cycles exists:', !!cycleAnalysis?.cycles);
                console.log('cycleAnalysis.cycles length:', cycleAnalysis?.cycles?.length);
                console.log('multiData.length:', multiData.length);
                console.log('chartCompareStocks.length:', chartCompareStocks.length);
                console.log('chartPeriod:', chartPeriod);
              }

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

                {/* AI Cycle Analysis - Vertical boundary markers and horizontal price ranges */}
                {showCycleAnalysis && cycleAnalysis && chartCompareStocks.length === 0 && cycleAnalysis.cycles && multiData.length > 0 && (
                  <>
                    {/* Vertical lines marking cycle boundaries - all periods use YY-MM-DD format */}
                    {cycleAnalysis.cycles.flatMap((cycle, idx) => {
                      // Check if cycle is within visible chart range
                      const cycleStart = new Date(cycle.startDate).getTime();
                      const cycleEnd = new Date(cycle.endDate).getTime();

                      // Get visible chart range - all periods now use YY-MM-DD format
                      const firstDate = multiData[0].date;
                      const lastDate = multiData[multiData.length - 1].date;

                      // Convert YY-MM-DD to 20YY-MM-DD for comparison
                      const chartStart = new Date(firstDate.replace(/^(\d{2})-/, '20$1-')).getTime();
                      const chartEnd = new Date(lastDate.replace(/^(\d{2})-/, '20$1-')).getTime();

                      // Skip cycles completely outside visible range
                      if (cycleEnd < chartStart || cycleStart > chartEnd) {
                        return [];
                      }

                      // Find matching dates in chart data
                      const findClosestDate = (originalDate) => {
                        const targetTime = new Date(originalDate).getTime();
                        let closest = multiData[0];
                        let closestDiff = Infinity;

                        multiData.forEach(d => {
                          if (!d.date) return;
                          // Convert YY-MM-DD to 20YY-MM-DD
                          const parts = d.date.split('-');
                          const dateStr = parts[0].length === 2 ? `20${parts[0]}-${parts[1]}-${parts[2]}` : d.date;

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
                  (colorMode === 'rvi' || colorMode === 'vspy') && rviSegments ? (
                    // RVI/VSPY Mode: Render colored segments that form a single continuous line
                    (() => {
                      const lines = [];
                      for (let i = 0; i <= rviSegments.maxSegmentId; i++) {
                        lines.push(
                          <Line
                            key={`${colorMode}-seg-${i}`}
                            type="monotone"
                            dataKey={`price_seg_${i}`}
                            stroke={rviSegments.colorMap[i]}
                            strokeWidth={2}
                            dot={false}
                            connectNulls={false}
                            isAnimationActive={false}
                            name={i === 0 ? `${selectedStock?.code || ''} Price` : undefined}
                            legendType={i === 0 ? 'line' : 'none'}
                          />
                        );
                      }
                      return lines;
                    })()
                  ) : colorMode === 'sma' && smaSegments ? (
                    // SMA Mode: Render colored segments (light blue for uptrends, gray for downtrends)
                    (() => {
                      const lines = [];
                      for (let i = 0; i <= smaSegments.maxSegmentId; i++) {
                        lines.push(
                          <Line
                            key={`sma-seg-${i}`}
                            type="monotone"
                            dataKey={`price_seg_${i}`}
                            stroke={smaSegments.colorMap[i]}
                            strokeWidth={2}
                            dot={false}
                            connectNulls={false}
                            isAnimationActive={false}
                            name={i === 0 ? `${selectedStock?.code || ''} Price` : undefined}
                            legendType={i === 0 ? 'line' : 'none'}
                          />
                        );
                      }
                      return lines;
                    })()
                  ) : (
                    // Default Mode: Single blue line
                    <Line type="monotone" dataKey="price" name={`${selectedStock?.code || ''} Price`} stroke="#3B82F6" strokeWidth={2} dot={false} />
                  )
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
