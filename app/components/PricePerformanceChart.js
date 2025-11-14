import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ReferenceDot, Scatter, ReferenceArea } from 'recharts';
import { LoadingState } from './LoadingState';
import { useAIPriceAnalysis } from '../hooks/useAIPriceAnalysis';
import { useAICycleAnalysis } from '../hooks/useAICycleAnalysis';
import { AIPriceAnalysisButton } from './ai/AIPriceAnalysisButton';
import { AIPriceAnalysisPanel } from './ai/AIPriceAnalysisPanel';
import { AICycleAnalysisButton } from './ai/AICycleAnalysisButton';
import { AICycleAnalysisPanel } from './ai/AICycleAnalysisPanel';

// Import calculation utilities
import {
  getPeriodDays,
  getRviN,
  getSmaPeriodForTouchDetection,
  calculate3DayMA,
  calculateRVI,
  calculateVSPY,
  calculateSMA,
  calculateLinearRegression,
  buildConfigurableTrendChannel,
  calculateStdDevChannel,
  formatChartDate,
  getRviColor,
  getVspyColor,
  getColorIndexValue,
  addRviDataKeys,
  getVolumeBarColor,
  getChannelBandColor,
  calculateVolumeProfile,
  analyzeChannelConfluence,
  calculateZoneVolumeDistribution,
  calculateVolumeBarData,
  computeTrendChannelTouchAlignment,
  findMultipleChannels
} from '../utils/chartCalculations';

// Import chart constants
import { CHANNEL_BANDS, COLOR_MODES, DEFAULT_CONFIG } from '../utils/chartConstants';

// Import performance monitoring
import {
  useRenderPerformance,
  useLifecyclePerformance,
  useMeasuredMemo,
  useMeasuredEffect,
  usePerformanceContext,
  useDataProcessing
} from '../hooks/usePerformance';

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
  // Performance monitoring
  useLifecyclePerformance('PricePerformanceChart');
  useRenderPerformance('PricePerformanceChart');
  const perfContext = usePerformanceContext('PricePerformanceChart');

  // Memoized chart data with performance tracking
  const chartData = useMeasuredMemo(
    'chartData',
    () => selectedStock?.chartData?.[chartPeriod] || [],
    [selectedStock, chartPeriod]
  );

  const fullHistoricalData = useMeasuredMemo(
    'fullHistoricalData',
    () => selectedStock?.chartData?.fullHistorical || [],
    [selectedStock]
  );
  const [dataOffset, setDataOffset] = useState(0); // Offset in days from most recent
  const [colorMode, setColorMode] = useState('default'); // 'default', 'rvi', 'vspy', 'sma', 'volumeBar', 'channel', 'trend', or 'multi-channel'
  const [spyData, setSpyData] = useState([]); // SPY historical data for VSPY calculation
  const [spyLoading, setSpyLoading] = useState(false); // Loading state for SPY data
  const [smaPeriod, setSmaPeriod] = useState(20); // SMA period for peak/bottom mode
  const [maxSmaGain, setMaxSmaGain] = useState({ gain: 0, period: 20, percentage: 0 }); // Track maximum gain
  const [isSimulating, setIsSimulating] = useState(false); // Simulation running state
  const [simulationResults, setSimulationResults] = useState([]); // Track all simulation results

  // Standard Deviation Channel configuration
  const [channelLookback, setChannelLookback] = useState(100); // Lookback period for channel
  const [channelStdDevMultiplier, setChannelStdDevMultiplier] = useState(2.0); // Std dev multiplier
  const [channelSource, setChannelSource] = useState('close'); // Price source: 'close', 'hl2', 'ohlc4'
  const [channelVolumeBins, setChannelVolumeBins] = useState(70); // Volume profile bins
  const [channelProximityThreshold, setChannelProximityThreshold] = useState(0.02); // 2% proximity threshold

  // Channel simulation state
  const [isChannelSimulating, setIsChannelSimulating] = useState(false);
  const [channelSimulationResult, setChannelSimulationResult] = useState(null);

  // Trend Channel (Linear Regression) configuration
  const [trendLookback, setTrendLookback] = useState(100); // Lookback period for trend calculation
  // Channel (trend mode) configuration - user configurable lookback & std dev (delta)
  const [trendChannelLookback, setTrendChannelLookback] = useState(120); // default lookback for whole-range regression
  const [trendChannelStdMultiplier, setTrendChannelStdMultiplier] = useState(2); // sigma multiplier
  const [trendChannelInterceptShift, setTrendChannelInterceptShift] = useState(0); // vertical adjustment for optimal touch alignment
  const [trendChannelEndAt, setTrendChannelEndAt] = useState(0); // end point offset from last data point (0 = use all data)

  // Multi-Channel configuration
  const [multiChannelMinRatio, setMultiChannelMinRatio] = useState(0.05); // 1/20 of data points
  const [multiChannelMaxRatio, setMultiChannelMaxRatio] = useState(0.5); // 1/2 of data points
  const [multiChannelStdMultiplier, setMultiChannelStdMultiplier] = useState(2); // std dev multiplier for multi-channels
  const [isMultiChannelSimulating, setIsMultiChannelSimulating] = useState(false);
  const [multiChannelResults, setMultiChannelResults] = useState(null);

  // Manual Channel configuration - user draws selection rectangles to create channels
  const [isManualChannelMode, setIsManualChannelMode] = useState(false);
  const [manualChannels, setManualChannels] = useState([]); // Array of manually created channels
  const [manualChannelSelection, setManualChannelSelection] = useState(null); // Current selection rectangle
  const [isComputingManualChannel, setIsComputingManualChannel] = useState(false);

  // Debug: Log manual channel selection changes
  useEffect(() => {
    if (manualChannelSelection) {
      console.log('Manual channel selection updated:', manualChannelSelection);
    }
  }, [manualChannelSelection]);

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
  // Crosshair state
  const [crosshair, setCrosshair] = useState({ x: null, y: null, dataX: null, dataY: null });
  // Recharts crosshair positioning using internal event payload
  const handleChartHover = useCallback((state) => {
    if (!state || state.isTooltipActive === false || !state.activePayload || state.activePayload.length === 0) {
      setCrosshair({ x: null, y: null, dataX: null, dataY: null });
      return;
    }
    const { chartX, chartY, activeLabel, activePayload } = state;
    // Determine y value (price in single mode, percentage in compare mode)
    let value = null;
    if (chartCompareStocks.length === 0) {
      value = activePayload[0]?.payload?.price ?? null;
    } else {
      value = activePayload[0]?.value ?? null; // percentage series value
    }
    setCrosshair({ x: chartX, y: chartY, dataX: activeLabel || null, dataY: value });

    // Update manual channel selection if we're dragging
    if (isManualChannelMode && manualChannelSelection?.isDragging && activeLabel) {
      if (activeLabel !== manualChannelSelection.endDate) {
        console.log('Updating selection endDate to:', activeLabel);
        setManualChannelSelection(prev => ({
          ...prev,
          endDate: activeLabel
        }));
      }
    }

    // Debug logging for manual channel mode
    if (isManualChannelMode) {
      console.log('handleChartHover - activeLabel:', activeLabel);
    }
  }, [chartCompareStocks.length, isManualChannelMode, manualChannelSelection]);
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

  // Calculate Linear Regression for trend line (centerline)
  const calculateLinearRegression = (data, period, priceSource = 'close') => {
    if (!data || data.length < period) return null;

    const lookbackData = data.slice(-period);
    const n = lookbackData.length;

    // Get price values based on source
    const getPriceValue = (point) => {
      switch (priceSource) {
        case 'close':
          return point.price || 0;
        case 'hl2':
          return ((point.high || point.price) + (point.low || point.price)) / 2;
        case 'ohlc4':
          return ((point.open || point.price) + (point.high || point.price) +
                  (point.low || point.price) + (point.price || 0)) / 4;
        default:
          return point.price || 0;
      }
    };

    // Calculate linear regression: y = mx + b
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    lookbackData.forEach((point, idx) => {
      const x = idx;
      const y = getPriceValue(point);
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept, n };
  };

  // Calculate Trend Channel with Upper & Lower Parallel Bounds using Linear Regression
  const calculateTrendChannel = (data) => {
    if (!data || data.length < 2) return data;

    // Legacy global trend channel removed; return data unchanged
    return data;
  };

  // Build configurable Trend Channel (regression over last lookback points only when in 'trend')
  const buildConfigurableTrendChannel = (data, lookback, stdMult, options = {}) => {
    if (!data || data.length < 2) return data;
    const { interceptShift = 0, endAt = 0 } = options;

    // Calculate the data window considering endAt parameter
    // If endAt > 0, we work with data up to (data.length - endAt)
    const effectiveEndIndex = data.length - endAt;
    // Always count lookback from the last data point, not from endAt
    const slice = lookback && lookback < data.length ? data.slice(-lookback) : data;
    const n = slice.length;
    if (n < 2) return data;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    slice.forEach((pt, i) => {
      const x = i;
      const y = pt.price || 0;
      sumX += x; sumY += y; sumXY += x * y; sumX2 += x * x;
    });
    const denom = (n * sumX2 - sumX * sumX);
    if (denom === 0) return data;
    const slope = (n * sumXY - sumX * sumY) / denom;
    const baseIntercept = (sumY - slope * sumX) / n;
    const intercept = baseIntercept + interceptShift;
    let resSum = 0;
    slice.forEach((pt, i) => {
      const model = slope * i + intercept;
      const diff = (pt.price || 0) - model;
      resSum += diff * diff;
    });
    const stdDev = Math.sqrt(resSum / Math.max(1, n - 1));
    // Map across entire data; only enrich slice window
    // Slice always starts from (data.length - n) since lookback counts from last point
    const startIndex = data.length - n;
    return data.map((pt, idx) => {
      if (idx < startIndex || idx >= effectiveEndIndex) {
        // Null out values outside the channel window (before start or after endAt point)
        return { ...pt, trendLine: null, trendUpper: null, trendLower: null };
      }
      const localX = idx - startIndex;
      const center = slope * localX + intercept;
      return {
        ...pt,
        trendLine: center,
        trendUpper: center + stdMult * stdDev,
        trendLower: center - stdMult * stdDev,
        ...(() => { // Add partition band levels for trend channel
          const extras = {};
          const upper = center + stdMult * stdDev;
          const lower = center - stdMult * stdDev;
          for (let b = 1; b < CHANNEL_BANDS; b++) {
            const frac = b / CHANNEL_BANDS;
            extras[`trendBand_${b}`] = lower + (upper - lower) * frac;
          }
          return extras;
        })()
      };
    });
  };

  // Get SMA period based on chart period for touch detection
  const getSmaPeriodForTouchDetection = (period) => {
    const smaMap = { '7D': 1, '1M': 3, '3M': 5, '6M': 10, '1Y': 14, '3Y': 20, '5Y': 30 };
    return smaMap[period] || 3; // Default to 3 if period not found
  };

  // Compute intercept shift and delta ensuring both channel bounds touch price extremes
  const computeTrendChannelTouchAlignment = (data, lookback, endAt = 0, chartPeriod = '3M') => {
    if (!data || data.length < 2) return null;

    // Get dynamic SMA period based on chart timeframe
    const smaPeriod = getSmaPeriodForTouchDetection(chartPeriod);

    // Calculate the data window considering endAt parameter
    const effectiveEndIndex = data.length - endAt;
    // Always count lookback from the last data point, not from endAt
    const slice = lookback && lookback < data.length ? data.slice(-lookback) : data;
    const n = slice.length;
    if (n < 2) return null;

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    slice.forEach((pt, i) => {
      const x = i;
      const y = pt.price || 0;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    });

    const denom = (n * sumX2 - sumX * sumX);
    if (denom === 0) return null;

    const slope = (n * sumXY - sumX * sumY) / denom;
    const baseIntercept = (sumY - slope * sumX) / n;

    const residuals = slice.map((pt, i) => {
      const model = slope * i + baseIntercept;
      return (pt.price || 0) - model;
    });

    const maxResidual = Math.max(...residuals);
    const minResidual = Math.min(...residuals);
    if (!Number.isFinite(maxResidual) || !Number.isFinite(minResidual)) return null;

    const interceptShift = (maxResidual + minResidual) / 2;
    const adjustedResiduals = residuals.map(diff => diff - interceptShift);

    const resSum = adjustedResiduals.reduce((sum, diff) => sum + diff * diff, 0);
    const stdDev = Math.sqrt(resSum / Math.max(1, n - 1));
    const extremeMagnitude = adjustedResiduals.reduce((acc, diff) => Math.max(acc, Math.abs(diff)), 0);

    let optimalDelta = stdDev > 0 ? extremeMagnitude / stdDev : 0;
    if (!Number.isFinite(optimalDelta)) {
      optimalDelta = 0;
    }

    const tolerance = stdDev > 0 ? stdDev * 1e-6 : 1e-6;
    const boundaryWindow = Math.max(1, Math.floor(n * 0.08));

    // Apply dynamic SMA to prices for smoothing (based on chart period)
    const smaPrices = slice.map((pt, i) => {
      if (smaPeriod === 1) return pt.price || 0; // No smoothing for 7D
      if (i < smaPeriod - 1) return pt.price || 0; // Not enough data for full SMA yet

      // Calculate SMA using dynamic period
      let sum = 0;
      for (let j = 0; j < smaPeriod; j++) {
        sum += (slice[i - j].price || 0);
      }
      return sum / smaPeriod;
    });

    // Calculate residuals using smoothed prices
    const smaResiduals = smaPrices.map((price, i) => {
      const model = slope * i + baseIntercept;
      return price - model;
    });

    // Calculate adjusted residuals for smoothed prices
    const smaMaxResidual = Math.max(...smaResiduals);
    const smaMinResidual = Math.min(...smaResiduals);
    const smaInterceptShift = (smaMaxResidual + smaMinResidual) / 2;
    const smaAdjustedResiduals = smaResiduals.map(diff => diff - smaInterceptShift);

    // Detect turning points: where residual changes sign (crosses from negative to positive or vice versa)
    const turningPoints = [];
    for (let i = 1; i < n; i++) {
      const prev = smaAdjustedResiduals[i - 1];
      const curr = smaAdjustedResiduals[i];

      // Check for sign change
      if ((prev < 0 && curr >= 0) || (prev > 0 && curr <= 0) || (prev === 0 && curr !== 0)) {
        turningPoints.push({
          index: i,
          residual: adjustedResiduals[i], // Use original residual for extreme checking
          direction: curr >= 0 ? 'up' : 'down' // Direction after the turn
        });
      }
    }

    let touchesUpper = false;
    let touchesLower = false;
    let touchesUpperBoundary = false;
    let touchesLowerBoundary = false;

    if (extremeMagnitude === 0) {
      touchesUpper = true;
      touchesLower = true;
      touchesUpperBoundary = true;
      touchesLowerBoundary = true;
    } else {
      // Check turning points for touches at extremes within boundary regions
      turningPoints.forEach(tp => {
        const isBoundaryIndex = tp.index < boundaryWindow || tp.index >= n - boundaryWindow;

        // Check if this turning point is at the upper extreme
        if (Math.abs(tp.residual - extremeMagnitude) <= tolerance) {
          touchesUpper = true;
          if (isBoundaryIndex) {
            touchesUpperBoundary = true;
          }
        }

        // Check if this turning point is at the lower extreme
        if (Math.abs(tp.residual + extremeMagnitude) <= tolerance) {
          touchesLower = true;
          if (isBoundaryIndex) {
            touchesLowerBoundary = true;
          }
        }
      });

      touchesUpper = touchesUpper && touchesUpperBoundary;
      touchesLower = touchesLower && touchesLowerBoundary;
    }

    const interceptWithShift = baseIntercept + interceptShift;
    const coverageCount = slice.reduce((count, pt, idx) => {
      const center = slope * idx + interceptWithShift;
      const upper = center + optimalDelta * stdDev;
      const lower = center - optimalDelta * stdDev;
      const price = pt.price || 0;
      return (price <= upper + tolerance && price >= lower - tolerance) ? count + 1 : count;
    }, 0);

    return {
      interceptShift,
      optimalDelta,
      touchesUpper,
      touchesLower,
      coverageCount,
      totalPoints: slice.length,
      stdDev,
      slope,
      baseIntercept,
      extremeMagnitude
    };
  };

  // Calculate Standard Deviation Channel
  const calculateStdDevChannel = (data, period, stdDevMultiplier, priceSource = 'close') => {
    if (!data || data.length < period) return data;

    return data.map((point, idx) => {
      if (idx < period - 1) {
        return {
          ...point,
          centerLine: null,
          upperBound: null,
          lowerBound: null,
          stdDev: null
        };
      }

      // Get lookback window
      const windowData = data.slice(idx - period + 1, idx + 1);

      // Calculate linear regression for centerline
      const regression = calculateLinearRegression(windowData, period, priceSource);
      if (!regression) {
        return {
          ...point,
          centerLine: null,
          upperBound: null,
          lowerBound: null,
          stdDev: null
        };
      }

      // The centerline value at the current point (last point of window)
      const centerLine = regression.slope * (period - 1) + regression.intercept;

      // Calculate standard deviation of price deviations from centerline
      let sumSquaredDiff = 0;
      windowData.forEach((p, i) => {
        const regressionValue = regression.slope * i + regression.intercept;
        const price = p.price || 0;
        const diff = price - regressionValue;
        sumSquaredDiff += diff * diff;
      });

      const stdDev = Math.sqrt(sumSquaredDiff / period);

      // Calculate upper and lower bounds
      const upperBound = centerLine + (stdDev * stdDevMultiplier);
      const lowerBound = centerLine - (stdDev * stdDevMultiplier);

      return {
        ...point,
        centerLine,
        upperBound,
        lowerBound,
        stdDev,
        ...(() => { // Add partition band levels for std dev channel
          const extras = {};
          for (let b = 1; b < CHANNEL_BANDS; b++) {
            const frac = b / CHANNEL_BANDS;
            extras[`channelBand_${b}`] = lowerBound + (upperBound - lowerBound) * frac;
          }
          return extras;
        })()
      };
    });
  };

  // Simulate trend channel lookback to find optimal value (for Channel mode)
  const simulateTrendChannelLookback = async () => {
    if (!selectedStock || isChannelSimulating) return;

    setIsChannelSimulating(true);
    setChannelSimulationResult(null);

    // Get current data slice
    const currentData = getCurrentDataSlice();
    if (!currentData || currentData.length < 20) {
      setIsChannelSimulating(false);
      alert('Not enough data for simulation');
      return;
    }

    console.log('🚀 Starting Channel Find Optimal - 2D Optimization');
    console.log(`📊 Data length: ${currentData.length} points`);

    const fixedStdMult = 0.5; // Fixed delta value for lookback simulation
    const minLookback = 20;

    const runLookbackSimulation = async (data, label = 'Full') => {
      // 2D optimization: simulate both lookback and endAt parameters
      // Limit to 50x50 grid for performance (max 2500 simulations)
      const maxEndAt = Math.floor(data.length / 5);
      const maxLookback = data.length;
      let optimalLookback = minLookback;
      let optimalEndAt = 0;
      let maxCrosses = 0;
      const lookbackResults = [];

      // Calculate increments to achieve ~50 samples for each dimension
      const targetSamples = 50;
      const lookbackIncrement = Math.max(1, Math.floor((maxLookback - minLookback) / (targetSamples - 1)));
      const endAtIncrement = Math.max(1, Math.floor(maxEndAt / (targetSamples - 1)));

      const lookbackSamples = Math.ceil((maxLookback - minLookback) / lookbackIncrement) + 1;
      const endAtSamples = Math.ceil(maxEndAt / endAtIncrement) + 1;
      const totalIterations = lookbackSamples * endAtSamples;

      console.log(`\n🔍 [${label}] Lookback Simulation Starting`);
      console.log(`   Range: lookback [${minLookback}-${maxLookback}] (increment: ${lookbackIncrement}), endAt [0-${maxEndAt}] (increment: ${endAtIncrement})`);
      console.log(`   Grid: ${lookbackSamples}x${endAtSamples} = ${totalIterations} simulations (optimized from full grid)`);

      // Allow UI to update before heavy work begins
      await new Promise(resolve => setTimeout(resolve, 50));

      const startTime = Date.now();
      let lastLogTime = startTime;

      // Loop through endAt from 0 to max with calculated increment
      for (let endAt = 0; endAt <= maxEndAt; endAt += endAtIncrement) {
        // Loop through lookback with calculated increment
        for (let lookback = minLookback; lookback <= maxLookback - endAt; lookback += lookbackIncrement) {
          const dataWithChannel = buildConfigurableTrendChannel(
            data,
            lookback,
            fixedStdMult,
            { endAt }
          );

          let crossCount = 0;
          const tolerance = 0.01;

          dataWithChannel.forEach(point => {
            if (point.trendLine !== null && point.price) {
              const priceDiff = Math.abs(point.price - point.trendLine);
              const pricePercent = priceDiff / point.trendLine;

              if (pricePercent <= tolerance) {
                crossCount++;
              }
            }
          });

          lookbackResults.push({ lookback, endAt, crossCount });

          if (crossCount > maxCrosses) {
            maxCrosses = crossCount;
            optimalLookback = lookback;
            optimalEndAt = endAt;
          }

          // Log progress every 20 iterations and every 500ms
          const currentTime = Date.now();
          if (lookbackResults.length % 20 === 0) {
            if (currentTime - lastLogTime >= 500) {
              const progress = ((lookbackResults.length / totalIterations) * 100).toFixed(1);
              const elapsed = ((currentTime - startTime) / 1000).toFixed(1);
              console.log(`   Progress: ${progress}% (${lookbackResults.length}/${totalIterations}) | Best: lookback=${optimalLookback}, endAt=${optimalEndAt}, crosses=${maxCrosses} | ${elapsed}s`);
              lastLogTime = currentTime;
            }
            await new Promise(resolve => setTimeout(resolve, 0));
          }
        }
      }

      // Ensure we test the exact maximum values if not already tested
      const testMaximumValues = async () => {
        const valuesToTest = [];

        // Test maxLookback with endAt=0 if not already tested
        if ((maxLookback - minLookback) % lookbackIncrement !== 0) {
          valuesToTest.push({ lookback: maxLookback, endAt: 0 });
        }

        // Test endAt=maxEndAt with reasonable lookback if not already tested
        if (maxEndAt % endAtIncrement !== 0) {
          valuesToTest.push({ lookback: minLookback, endAt: maxEndAt });
        }

        for (const { lookback, endAt } of valuesToTest) {
          if (lookback > maxLookback - endAt) continue;

          const dataWithChannel = buildConfigurableTrendChannel(data, lookback, fixedStdMult, { endAt });
          let crossCount = 0;
          const tolerance = 0.01;

          dataWithChannel.forEach(point => {
            if (point.trendLine !== null && point.price) {
              const priceDiff = Math.abs(point.price - point.trendLine);
              const pricePercent = priceDiff / point.trendLine;
              if (pricePercent <= tolerance) crossCount++;
            }
          });

          lookbackResults.push({ lookback, endAt, crossCount });
          if (crossCount > maxCrosses) {
            maxCrosses = crossCount;
            optimalLookback = lookback;
            optimalEndAt = endAt;
          }
        }
      };

      await testMaximumValues();

      const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`✅ [${label}] Lookback Simulation Complete in ${totalTime}s`);
      console.log(`   Result: lookback=${optimalLookback}, endAt=${optimalEndAt}, maxCrosses=${maxCrosses}`);
      console.log(`   Tested ${lookbackResults.length} parameter combinations`);

      return { optimalLookback, optimalEndAt, maxCrosses, lookbackResults };
    };

    // Find the std dev multiplier (delta) that keeps the most points inside the channel
    // while ensuring both the upper and lower bounds are touched at least once when possible.
    const runDeltaSimulation = async (data, lookback, endAt = 0, label = 'Full') => {
      console.log(`\n🎯 [${label}] Delta Simulation Starting`);
      console.log(`   Using: lookback=${lookback}, endAt=${endAt}`);

      const startTime = Date.now();
      const alignment = computeTrendChannelTouchAlignment(data, lookback, endAt, chartPeriod);

      if (!alignment) {
        console.log(`⚠️  [${label}] Delta Simulation: No alignment found`);
        return {
          optimalDelta: 0,
          maxCoverageCount: 0,
          touchesBothBounds: false,
          interceptShift: 0,
          touchesUpper: false,
          touchesLower: false,
          totalPoints: data.length,
          deltaResults: []
        };
      }

      const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
      const smaPeriod = getSmaPeriodForTouchDetection(chartPeriod);
      console.log(`✅ [${label}] Delta Simulation Complete in ${totalTime}s`);
      console.log(`   Result: delta=${alignment.optimalDelta.toFixed(3)}, coverage=${alignment.coverageCount}/${alignment.totalPoints}, touchesBoth=${alignment.touchesUpper && alignment.touchesLower}`);
      console.log(`   Touch validation: Upper=${alignment.touchesUpper}, Lower=${alignment.touchesLower} (using SMA${smaPeriod} + turning point detection)`);

      return {
        optimalDelta: alignment.optimalDelta,
        maxCoverageCount: alignment.coverageCount,
        touchesBothBounds: alignment.touchesUpper && alignment.touchesLower,
        interceptShift: alignment.interceptShift,
        touchesUpper: alignment.touchesUpper,
        touchesLower: alignment.touchesLower,
        totalPoints: alignment.totalPoints,
        deltaResults: []
      };
    };

    const fullLookbackResult = await runLookbackSimulation(currentData, 'Full');
    const fullDeltaResult = await runDeltaSimulation(currentData, fullLookbackResult.optimalLookback, fullLookbackResult.optimalEndAt, 'Full');

    const recentDataLength = Math.max(minLookback, Math.floor(currentData.length * 0.25));
    const recentData = currentData.slice(-recentDataLength);

    console.log(`\n📈 Starting Recent (25%) Simulation with ${recentData.length} points`);
    const recentLookbackResult = await runLookbackSimulation(recentData, 'Recent');
    const recentDeltaResult = await runDeltaSimulation(recentData, recentLookbackResult.optimalLookback, recentLookbackResult.optimalEndAt, 'Recent');

    setChannelSimulationResult({
      optimalLookback: fullLookbackResult.optimalLookback,
      optimalEndAt: fullLookbackResult.optimalEndAt,
      optimalDelta: fullDeltaResult.optimalDelta,
      maxCrosses: fullLookbackResult.maxCrosses,
      maxCoverageCount: fullDeltaResult.maxCoverageCount,
      touchesBothBounds: fullDeltaResult.touchesBothBounds,
      touchesUpper: fullDeltaResult.touchesUpper,
      touchesLower: fullDeltaResult.touchesLower,
      totalPoints: currentData.length,
      crossPercentage: ((fullLookbackResult.maxCrosses / currentData.length) * 100).toFixed(2),
      coveragePercentage: ((fullDeltaResult.maxCoverageCount / currentData.length) * 100).toFixed(2),
      lookbackResults: fullLookbackResult.lookbackResults,
      deltaResults: fullDeltaResult.deltaResults,
      optimalInterceptShift: fullDeltaResult.interceptShift,
      recent: {
        optimalLookback: recentLookbackResult.optimalLookback,
        optimalEndAt: recentLookbackResult.optimalEndAt,
        optimalDelta: recentDeltaResult.optimalDelta,
        maxCrosses: recentLookbackResult.maxCrosses,
        maxCoverageCount: recentDeltaResult.maxCoverageCount,
        touchesBothBounds: recentDeltaResult.touchesBothBounds,
        touchesUpper: recentDeltaResult.touchesUpper,
        touchesLower: recentDeltaResult.touchesLower,
        totalPoints: recentData.length,
        crossPercentage: ((recentLookbackResult.maxCrosses / recentData.length) * 100).toFixed(2),
        coveragePercentage: ((recentDeltaResult.maxCoverageCount / recentData.length) * 100).toFixed(2),
        lookbackResults: recentLookbackResult.lookbackResults,
        deltaResults: recentDeltaResult.deltaResults,
        optimalInterceptShift: recentDeltaResult.interceptShift
      }
    });

    // Apply optimal lookback, endAt, and delta (full data set)
    console.log('\n🎉 Channel Optimization Complete!');
    console.log('📊 Applying Full Dataset Results:');
    console.log(`   Lookback: ${fullLookbackResult.optimalLookback}`);
    console.log(`   EndAt: ${fullLookbackResult.optimalEndAt}`);
    console.log(`   Delta: ${fullDeltaResult.optimalDelta.toFixed(3)}`);
    console.log(`   Intercept Shift: ${(fullDeltaResult.interceptShift || 0).toFixed(3)}`);
    console.log(`   Coverage: ${((fullDeltaResult.maxCoverageCount / currentData.length) * 100).toFixed(2)}%`);

    setTrendChannelLookback(fullLookbackResult.optimalLookback);
    setTrendChannelEndAt(fullLookbackResult.optimalEndAt);
    setTrendChannelStdMultiplier(fullDeltaResult.optimalDelta);
    setTrendChannelInterceptShift(fullDeltaResult.interceptShift || 0);
    setIsChannelSimulating(false);
  };

  // Calculate Volume Profile (Volume at Price)
  const calculateVolumeProfile = (data, numBins = 70) => {
    if (!data || data.length === 0) return null;

    // Find price range
    const prices = data.map(d => d.price || 0);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;

    if (priceRange === 0) return null;

    const binSize = priceRange / numBins;

    // Initialize bins
    const bins = Array(numBins).fill(0).map((_, i) => ({
      priceLevel: minPrice + (i + 0.5) * binSize,
      priceMin: minPrice + i * binSize,
      priceMax: minPrice + (i + 1) * binSize,
      volume: 0
    }));

    // Aggregate volume into bins
    data.forEach(point => {
      const price = point.price || 0;
      const volume = point.volume || 0;

      // Find which bin this price falls into
      const binIndex = Math.min(
        Math.floor((price - minPrice) / binSize),
        numBins - 1
      );

      if (binIndex >= 0 && binIndex < numBins) {
        bins[binIndex].volume += volume;
      }
    });

    // Calculate statistics
    const volumes = bins.map(b => b.volume);
    const totalVolume = volumes.reduce((sum, v) => sum + v, 0);
    const avgVolume = totalVolume / numBins;
    const stdDevVolume = Math.sqrt(
      volumes.reduce((sum, v) => sum + Math.pow(v - avgVolume, 2), 0) / numBins
    );

    // Identify POC (Point of Control) - highest volume
    const pocBin = bins.reduce((max, bin) =>
      bin.volume > max.volume ? bin : max, bins[0]
    );

    // Identify HVN (High Volume Nodes) - volume > avg + 1 std dev
    const hvnThreshold = avgVolume + stdDevVolume;
    const hvns = bins.filter(bin => bin.volume > hvnThreshold);

    // Identify LVN (Low Volume Nodes) - volume < avg - 1 std dev
    const lvnThreshold = avgVolume - stdDevVolume;
    const lvns = bins.filter(bin => bin.volume < lvnThreshold && bin.volume > 0);

    return {
      bins,
      poc: pocBin,
      hvns,
      lvns,
      avgVolume,
      stdDevVolume,
      minPrice,
      maxPrice
    };
  };

  // Analyze confluence between channel bounds and volume profile
  const analyzeChannelConfluence = (channelData, volumeProfile, proximityThreshold = 0.02) => {
    if (!channelData || !volumeProfile) return channelData;

    return channelData.map(point => {
      if (!point.upperBound || !point.lowerBound) {
        return {
          ...point,
          upperBoundState: 'neutral',
          lowerBoundState: 'neutral'
        };
      }

      // Check confluence for upper bound
      let upperBoundState = 'neutral';
      const upperPrice = point.upperBound;
      const upperThreshold = upperPrice * proximityThreshold;

      // Check if upper bound is near POC
      if (Math.abs(upperPrice - volumeProfile.poc.priceLevel) < upperThreshold) {
        upperBoundState = 'strong';
      } else {
        // Check if near any HVN
        for (const hvn of volumeProfile.hvns) {
          if (Math.abs(upperPrice - hvn.priceLevel) < upperThreshold) {
            upperBoundState = 'strong';
            break;
          }
        }

        // Check if near any LVN
        if (upperBoundState === 'neutral') {
          for (const lvn of volumeProfile.lvns) {
            if (Math.abs(upperPrice - lvn.priceLevel) < upperThreshold) {
              upperBoundState = 'weak';
              break;
            }
          }
        }
      }

      // Check confluence for lower bound
      let lowerBoundState = 'neutral';
      const lowerPrice = point.lowerBound;
      const lowerThreshold = lowerPrice * proximityThreshold;

      // Check if lower bound is near POC
      if (Math.abs(lowerPrice - volumeProfile.poc.priceLevel) < lowerThreshold) {
        lowerBoundState = 'strong';
      } else {
        // Check if near any HVN
        for (const hvn of volumeProfile.hvns) {
          if (Math.abs(lowerPrice - hvn.priceLevel) < lowerThreshold) {
            lowerBoundState = 'strong';
            break;
          }
        }

        // Check if near any LVN
        if (lowerBoundState === 'neutral') {
          for (const lvn of volumeProfile.lvns) {
            if (Math.abs(lowerPrice - lvn.priceLevel) < lowerThreshold) {
              lowerBoundState = 'weak';
              break;
            }
          }
        }
      }

      return {
        ...point,
        upperBoundState,
        lowerBoundState
      };
    });
  };

  // Get color for volume bar based on intensity (0 to 1)
  // Color gradient: light yellow → deep yellow → green → blue
  const getVolumeBarColor = (intensity) => {
    if (intensity < 0.2) {
      // 0-20%: Light yellow to yellow (#FEFCE8 to #FEF08A)
      const t = intensity / 0.2;
      const r = 254;
      const g = Math.floor(252 - t * 12);
      const b = Math.floor(232 - t * 94);
      return `rgba(${r}, ${g}, ${b}, 0.7)`;
    } else if (intensity < 0.4) {
      // 20-40%: Yellow to deep yellow (#FEF08A to #FBBF24)
      const t = (intensity - 0.2) / 0.2;
      const r = Math.floor(254 - t * 3);
      const g = Math.floor(240 - t * 49);
      const b = Math.floor(138 - t * 102);
      return `rgba(${r}, ${g}, ${b}, 0.75)`;
    } else if (intensity < 0.6) {
      // 40-60%: Deep yellow to lime green (#FBBF24 to #84CC16)
      const t = (intensity - 0.4) / 0.2;
      const r = Math.floor(251 - t * 119);
      const g = Math.floor(191 + t * 13);
      const b = Math.floor(36 - t * 14);
      return `rgba(${r}, ${g}, ${b}, 0.8)`;
    } else if (intensity < 0.8) {
      // 60-80%: Lime green to emerald (#84CC16 to #10B981)
      const t = (intensity - 0.6) / 0.2;
      const r = Math.floor(132 - t * 116);
      const g = Math.floor(204 - t * 19);
      const b = Math.floor(22 + t * 107);
      return `rgba(${r}, ${g}, ${b}, 0.85)`;
    } else {
      // 80-100%: Emerald to deep blue (#10B981 to #1E40AF)
      const t = (intensity - 0.8) / 0.2;
      const r = Math.floor(16 + t * 14);
      const g = Math.floor(185 - t * 121);
      const b = Math.floor(129 + t * 46);
      return `rgba(${r}, ${g}, ${b}, 0.9)`;
    }
  };

  // Calculate volume distribution across channel zones
  // Returns an object mapping zone index to volume percentage
  const calculateZoneVolumeDistribution = (data, channelType = 'channel') => {
    if (!data || data.length === 0) return {};

    const zoneVolumes = {}; // { zoneIndex: totalVolume }
    let totalVolume = 0;

    // For each data point, determine which zone(s) the price falls into and accumulate volume
    data.forEach(pt => {
      const price = pt.price || pt.close;
      const volume = pt.volume || 0;

      if (!price || !volume) return;

      // Determine zone boundaries based on channel type
      const lowerBound = channelType === 'trend' ? pt.trendLower : pt.lowerBound;
      const upperBound = channelType === 'trend' ? pt.trendUpper : pt.upperBound;

      if (lowerBound == null || upperBound == null) return;

      // Calculate which zone this price falls into
      const channelRange = upperBound - lowerBound;
      if (channelRange <= 0) return;

      const pricePosition = (price - lowerBound) / channelRange;

      // Determine zone index (0 to CHANNEL_BANDS-1)
      let zoneIndex = Math.floor(pricePosition * CHANNEL_BANDS);
      zoneIndex = Math.max(0, Math.min(CHANNEL_BANDS - 1, zoneIndex));

      // Accumulate volume for this zone
      if (!zoneVolumes[zoneIndex]) {
        zoneVolumes[zoneIndex] = 0;
      }
      zoneVolumes[zoneIndex] += volume;
      totalVolume += volume;
    });

    // Convert to percentages
    const zoneVolumePercentages = {};
    Object.keys(zoneVolumes).forEach(zoneIndex => {
      zoneVolumePercentages[zoneIndex] = totalVolume > 0
        ? (zoneVolumes[zoneIndex] / totalVolume) * 100
        : 0;
    });

    return zoneVolumePercentages;
  };

  // Color ramp helper for channel & trend partition bands.
  // ratio: 0 (bottom/support) → 1 (top/resistance)
  // Gradient path: emerald (#10B981) → teal (#14B8A6) → blue (#3B82F6) → purple (#8B5CF6) → pink (#EC4899) → red (#EF4444)
  // We interpolate across 5 segments between 6 anchor colors.
  // volumePercentage: percentage of total volume in this zone (0-100)
  const getChannelBandColor = (ratio, volumePercentage = 0) => {
    if (isNaN(ratio)) return 'rgba(255,255,255,0.05)';
    const r = Math.max(0, Math.min(1, ratio));
    const anchors = [
      { r: 16,  g:185, b:129 }, // emerald
      { r: 20,  g:184, b:166 }, // teal
      { r: 59,  g:130, b:246 }, // blue
      { r:139,  g:92,  b:246 }, // purple
      { r:236,  g:72,  b:153 }, // pink
      { r:239,  g:68,  b:68  }  // red
    ];
    const segCount = anchors.length - 1; // 5
    const scaled = r * segCount;
    const i = Math.min(segCount - 1, Math.floor(scaled));
    const t = scaled - i;
    const a = anchors[i];
    const b = anchors[i + 1];
    const rr = Math.round(a.r + (b.r - a.r) * t);
    const gg = Math.round(a.g + (b.g - a.g) * t);
    const bb = Math.round(a.b + (b.b - a.b) * t);

    // Base transparency
    let alpha = 0.15;

    // Volume-based color enhancement
    // Higher volume percentage = deeper/more opaque color
    if (volumePercentage > 0) {
      // Scale alpha based on volume percentage
      // Typical zone might have 100/6 ≈ 16.67% if evenly distributed
      // We'll map 0-30% volume to 0.05-0.65 alpha range
      const normalizedVolume = Math.min(volumePercentage / 30, 1); // Normalize to 0-1
      alpha = 0.05 + (normalizedVolume * 0.60); // Range: 0.05 to 0.65
    }

    return `rgba(${rr}, ${gg}, ${bb}, ${alpha.toFixed(3)})`;
  };

  // Calculate Volume Bar data for horizontal background zones
  const calculateVolumeBarData = (data) => {
    if (!data || data.length === 0) return [];

    // Find min and max price across all data
    const prices = data.map(d => d.price).filter(p => p != null);
    if (prices.length === 0) return [];

    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;

    // Avoid division by zero
    if (priceRange === 0) return [];

    // Create 20 slots
    const numSlots = 20;
    const slotSize = priceRange / numSlots;

    // Initialize slots
    const slots = Array.from({ length: numSlots }, (_, i) => ({
      slotIndex: i,
      priceMin: minPrice + (i * slotSize),
      priceMax: minPrice + ((i + 1) * slotSize),
      volume: 0
    }));

    // Aggregate volume for each slot
    data.forEach(point => {
      if (point.price == null || point.volume == null) return;

      // Find which slot this price belongs to
      const slotIndex = Math.min(
        Math.floor((point.price - minPrice) / slotSize),
        numSlots - 1
      );

      if (slotIndex >= 0 && slotIndex < numSlots) {
        slots[slotIndex].volume += point.volume;
      }
    });

    // Find max volume for normalization
    const maxVolume = Math.max(...slots.map(s => s.volume));
    if (maxVolume === 0) return slots;

    // Calculate intensity and color for each slot
    slots.forEach(slot => {
      const intensity = slot.volume / maxVolume; // 0 to 1
      slot.intensity = intensity;
      slot.color = getVolumeBarColor(intensity);
    });

    return slots;
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
      const end = perfContext.startMeasurement('calculateRVI');
      const result = calculateRVI(slicedData, chartPeriod);
      end();
      return result;
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
        const end = perfContext.startMeasurement('calculateVSPY');
        const dataWithVSPY = calculateVSPY(unformattedSlicedData, chartPeriod, spySlicedData);
        end();

        // Now format the dates
        return dataWithVSPY.map(d => ({
          ...d,
          date: formatChartDate(d.date, chartPeriod)
        }));
      }
    }

    // Apply SMA calculation if in SMA mode
    if (colorMode === 'sma') {
      const end = perfContext.startMeasurement('calculateSMA');
      const result = calculateSMA(slicedData, smaPeriod);
      end();
      return result;
    }

    // Apply Standard Deviation Channel calculation if in channel mode
    if (colorMode === 'channel') {
      const endChannel = perfContext.startMeasurement('calculateStdDevChannel');
      const dataWithChannel = calculateStdDevChannel(
        slicedData,
        channelLookback,
        channelStdDevMultiplier,
        channelSource
      );
      endChannel();

      // Calculate volume profile
      const endVolume = perfContext.startMeasurement('calculateVolumeProfile');
      const volumeProfile = calculateVolumeProfile(slicedData, channelVolumeBins);
      endVolume();

      // Apply confluence analysis
      const endConfluence = perfContext.startMeasurement('analyzeChannelConfluence');
      const dataWithConfluence = volumeProfile
        ? analyzeChannelConfluence(dataWithChannel, volumeProfile, channelProximityThreshold)
        : dataWithChannel;
      endConfluence();

      // Attach volume profile metadata to the data for use in rendering
      if (dataWithConfluence.length > 0) {
        dataWithConfluence._volumeProfile = volumeProfile;
      }

      return dataWithConfluence;
    }

    // Apply Trend Channel calculation if in trend mode
    if (colorMode === 'trend') {
      return calculateTrendChannel(slicedData);
    }

    return slicedData;
  };

  // Run simulation to find optimal SMA period
  const runSimulation = async () => {
    if (isSimulating) return; // Prevent multiple simultaneous simulations

    const simEnd = perfContext.startMeasurement('runSimulation');
    setIsSimulating(true);
    setSimulationResults([]);
    setMaxSmaGain({ gain: 0, period: 20, percentage: 0 }); // Reset max gain

    const results = [];
    let bestResult = { gain: 0, period: 20, percentage: 0 };

    // Iterate through SMA periods from 5 to 100
    for (let period = 5; period <= 100; period++) {
      // Update the SMA period
      setSmaPeriod(period);

      // Small delay to allow UI to update and show progress
      await new Promise(resolve => setTimeout(resolve, 50));

      // Calculate gain for this period
      // We need to get the data with this SMA period
      const periodDays = getPeriodDays(chartPeriod);
      const totalDays = fullHistoricalData.length;
      const endIndex = totalDays - dataOffset;
      const startIndex = Math.max(0, endIndex - periodDays);
      const slicedData = fullHistoricalData.slice(startIndex, endIndex).map(d => ({
        date: formatChartDate(d.date, chartPeriod),
        price: d.price,
        volume: d.volume || 0
      }));

      const dataWithSMA = calculateSMA(slicedData, period);
      const smaAnalysis = detectTurningPoints(dataWithSMA);
      const startPrice = dataWithSMA.length > 0 ? dataWithSMA[0].price : 1;
      const gainPercentage = startPrice > 0 ? (smaAnalysis.totalGain / startPrice) * 100 : 0;

      const result = {
        period,
        gain: smaAnalysis.totalGain,
        percentage: gainPercentage
      };

      results.push(result);

      // Track best result
      if (gainPercentage > bestResult.percentage) {
        bestResult = result;
        setMaxSmaGain(result);
      }
    }

    setSimulationResults(results);
    setIsSimulating(false);
    simEnd();

    // Set the slider to the best result
    if (bestResult.period) {
      setSmaPeriod(bestResult.period);
    }
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

  // Compute optimal channel for the selected date range
  const computeManualChannel = useCallback(async (startDate, endDate) => {
    const currentData = getCurrentDataSlice();
    if (!currentData || currentData.length < 20) {
      alert('Not enough data for channel calculation');
      return;
    }

    setIsComputingManualChannel(true);

    try {
      // Find the indices of the selected date range
      const startIdx = currentData.findIndex(pt => pt.date === startDate);
      const endIdx = currentData.findIndex(pt => pt.date === endDate);

      if (startIdx === -1 || endIdx === -1) {
        alert('Could not find selected date range in data');
        setIsComputingManualChannel(false);
        return;
      }

      // Ensure start is before end
      const [actualStartIdx, actualEndIdx] = startIdx <= endIdx
        ? [startIdx, endIdx]
        : [endIdx, startIdx];

      // Extract the selected slice of data
      const selectedSlice = currentData.slice(actualStartIdx, actualEndIdx + 1);

      if (selectedSlice.length < 20) {
        alert('Selected range too small (minimum 20 data points)');
        setIsComputingManualChannel(false);
        return;
      }

      console.log(`Computing manual channel for ${selectedSlice.length} data points`);

      // Use computeTrendChannelTouchAlignment to find optimal parameters
      const alignment = computeTrendChannelTouchAlignment(selectedSlice, selectedSlice.length, 0, chartPeriod);

      if (!alignment) {
        alert('Could not compute channel for selected range');
        setIsComputingManualChannel(false);
        return;
      }

      console.log('Optimal channel parameters:', alignment);

      // Build the channel data using the optimal parameters
      const channelData = buildConfigurableTrendChannel(
        selectedSlice,
        selectedSlice.length,
        alignment.optimalDelta,
        { interceptShift: alignment.optimalInterceptShift, endAt: 0 },
        CHANNEL_BANDS // Use 10 bands to match rendering expectation
      );

      console.log('Channel data built, length:', channelData.length);

      // Create manual channel object
      const manualChannel = {
        id: Date.now(), // Unique ID for this channel
        startIdx: actualStartIdx,
        endIdx: actualEndIdx,
        startDate: currentData[actualStartIdx].date,
        endDate: currentData[actualEndIdx].date,
        lookback: selectedSlice.length,
        stdMultiplier: alignment.optimalDelta,
        interceptShift: alignment.optimalInterceptShift,
        touchesUpper: alignment.touchesUpper,
        touchesLower: alignment.touchesLower,
        visible: true, // Channel visibility toggle
        // channelData is already the selected slice, don't slice it again
        data: channelData.map(pt => {
          const channelPoint = {
            date: pt.date,
            trendLine: pt.trendLine,
            trendUpper: pt.trendUpper,
            trendLower: pt.trendLower
          };
          // Include all intermediate bands (1 through CHANNEL_BANDS-1)
          for (let b = 1; b < CHANNEL_BANDS; b++) {
            if (pt[`trendBand_${b}`] != null) {
              channelPoint[`trendBand_${b}`] = pt[`trendBand_${b}`];
            }
          }
          return channelPoint;
        })
      };

      // Add the channel to our manual channels array
      setManualChannels(prev => [...prev, manualChannel]);
      console.log('Manual channel added:', manualChannel);
      console.log('Total manual channels:', manualChannels.length + 1);

    } catch (error) {
      console.error('Error computing manual channel:', error);
      alert('Error computing channel: ' + error.message);
    } finally {
      setIsComputingManualChannel(false);
      setManualChannelSelection(null); // Clear the selection
    }
  }, [chartPeriod, getCurrentDataSlice]);

  const handleMouseDown = useCallback((e) => {
    // Only start drag on left mouse button
    if (e.button !== 0) return;

    // If in manual channel mode, start rectangle selection instead of panning
    if (isManualChannelMode) {
      console.log('Manual channel mode - Mouse down at:', crosshair.dataX);

      // Get the active data point from crosshair
      if (crosshair.dataX) {
        console.log('Starting selection at date:', crosshair.dataX);
        setManualChannelSelection({
          startDate: crosshair.dataX,
          endDate: crosshair.dataX,
          isDragging: true
        });
      } else {
        console.log('No crosshair.dataX available!');
      }
      return;
    }

    e.preventDefault();
    dragStartRef.current = {
      x: e.clientX,
      startOffset: dataOffset,
      isDragging: true
    };
    setIsDragging(true);
      // ...existing code...
  }, [dataOffset, isManualChannelMode, crosshair]);

  const handleMouseMove = useCallback((e) => {
    // If in manual channel mode and we have an active selection, update the rectangle
    if (isManualChannelMode && manualChannelSelection?.isDragging) {
      if (crosshair.dataX && crosshair.dataX !== manualChannelSelection.endDate) {
        console.log('Updating selection endDate to:', crosshair.dataX);
        setManualChannelSelection(prev => ({
          ...prev,
          endDate: crosshair.dataX
        }));
      }
      return;
    }

    if (!dragStartRef.current?.isDragging) {
      return; // hover handled by handleChartHover
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
  }, [chartPeriod, fullHistoricalData, isManualChannelMode, manualChannelSelection, crosshair]);

  const handleMouseUp = useCallback(() => {
    // If in manual channel mode and we have a selection, compute the channel
    if (isManualChannelMode && manualChannelSelection?.isDragging) {
      const { startDate, endDate } = manualChannelSelection;
      if (startDate && endDate && startDate !== endDate) {
        // Update selection to mark dragging as finished
        setManualChannelSelection(prev => ({ ...prev, isDragging: false }));
        // Compute the channel
        computeManualChannel(startDate, endDate);
      } else {
        // If selection is too small, just clear it
        setManualChannelSelection(null);
      }
      return;
    }

    // ...existing code...
    if (dragStartRef.current) {
      dragStartRef.current.isDragging = false;
    }
    setIsDragging(false);
    // Keep crosshair after drag end (do not clear)
  }, [isManualChannelMode, manualChannelSelection, computeManualChannel]);

  const handleMouseLeave = useCallback(() => {
    setCrosshair({ x: null, y: null, dataX: null, dataY: null });
    handleMouseUp();
  }, [handleMouseUp]);

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
                if (colorMode === 'default' || colorMode === 'sma') {
                  setColorMode('rvi');
                } else if (colorMode === 'rvi') {
                  setColorMode('vspy');
                } else {
                  setColorMode('default');
                }
              }}
              className="px-3 py-2 rounded-lg text-xs font-medium transition"
              style={{
                backgroundColor: (colorMode === 'rvi' || colorMode === 'vspy') ? '#FBBF24' : '#374151',
                color: (colorMode === 'rvi' || colorMode === 'vspy') ? '#000000' : '#D1D5DB',
                fontWeight: 'bold'
              }}
              title={colorMode === 'rvi' ? 'Switch to VSPY coloring' : colorMode === 'vspy' ? 'Switch to Color OFF' : 'Enable RVI coloring'}
            >
              {colorMode === 'rvi' ? 'RVI' : colorMode === 'vspy' ? 'VSPY' : 'Color'}
            </button>
          )}

          {/* SMA Peak/Bottom Mode Toggle */}
          {chartCompareStocks.length === 0 && selectedStock && (
            <button
              onClick={() => setColorMode(colorMode === 'sma' ? 'default' : 'sma')}
              className="px-3 py-2 rounded-lg text-xs font-medium transition"
              style={{
                backgroundColor: colorMode === 'sma' ? '#FBBF24' : '#374151',
                color: colorMode === 'sma' ? '#000000' : '#D1D5DB',
                fontWeight: 'bold'
              }}
              title={colorMode === 'sma' ? 'Disable SMA Peak/Bottom mode' : 'Enable SMA Peak/Bottom mode'}
            >
              SMA P/B
            </button>
          )}

          {/* Volume Bar Mode Toggle */}
          {chartCompareStocks.length === 0 && selectedStock && (
            <button
              onClick={() => setColorMode(colorMode === 'volumeBar' ? 'default' : 'volumeBar')}
              className="px-3 py-2 rounded-lg text-xs font-medium transition"
              style={{
                backgroundColor: colorMode === 'volumeBar' ? '#FBBF24' : '#374151',
                color: colorMode === 'volumeBar' ? '#000000' : '#D1D5DB',
                fontWeight: 'bold'
              }}
              title={colorMode === 'volumeBar' ? 'Disable Volume Bar mode' : 'Enable Volume Bar mode'}
            >
              Vol Bar
            </button>
          )}

          {/* Standard Deviation Channel Mode Toggle */}
          {chartCompareStocks.length === 0 && selectedStock && (
            <button
              onClick={() => setColorMode(colorMode === 'channel' ? 'default' : 'channel')}
              className="px-3 py-2 rounded-lg text-xs font-medium transition"
              style={{
                backgroundColor: colorMode === 'channel' ? '#FBBF24' : '#374151',
                color: colorMode === 'channel' ? '#000000' : '#D1D5DB',
                fontWeight: 'bold'
              }}
              title={colorMode === 'channel' ? 'Disable Trend Channel mode' : 'Enable Trend Channel mode'}
            >
              Trend Line
            </button>
          )}

          {/* Trend Channel (Linear Regression) Mode Toggle */}
          {chartCompareStocks.length === 0 && selectedStock && (
            <button
              onClick={() => setColorMode(colorMode === 'trend' ? 'default' : 'trend')}
              className="px-3 py-2 rounded-lg text-xs font-medium transition"
              style={{
                backgroundColor: colorMode === 'trend' ? '#FBBF24' : '#374151',
                color: colorMode === 'trend' ? '#000000' : '#D1D5DB',
                fontWeight: 'bold'
              }}
              title={colorMode === 'trend' ? 'Disable Channel mode' : 'Enable Channel mode (Linear Regression)'}
            >
              Channel
            </button>
          )}

          {/* Multi-Channel Mode Toggle */}
          {chartCompareStocks.length === 0 && selectedStock && (
            <button
              onClick={() => setColorMode(colorMode === 'multi-channel' ? 'default' : 'multi-channel')}
              className="px-3 py-2 rounded-lg text-xs font-medium transition"
              style={{
                backgroundColor: colorMode === 'multi-channel' ? '#FBBF24' : '#374151',
                color: colorMode === 'multi-channel' ? '#000000' : '#D1D5DB',
                fontWeight: 'bold'
              }}
              title={colorMode === 'multi-channel' ? 'Disable Multi-Channel mode' : 'Enable Multi-Channel mode (Multiple Regression Channels)'}
            >
              Multi-Channel
            </button>
          )}

          {/* Manual Channel Mode Toggle */}
          {chartCompareStocks.length === 0 && selectedStock && (
            <button
              onClick={() => {
                setIsManualChannelMode(!isManualChannelMode);
                if (!isManualChannelMode) {
                  // When entering manual channel mode, clear selection
                  setManualChannelSelection(null);
                }
              }}
              className="px-3 py-2 rounded-lg text-xs font-medium transition"
              style={{
                backgroundColor: isManualChannelMode ? '#10B981' : '#374151',
                color: isManualChannelMode ? '#000000' : '#D1D5DB',
                fontWeight: 'bold'
              }}
              title={isManualChannelMode ? 'Disable Manual Channel mode' : 'Enable Manual Channel mode (Draw rectangles to create channels)'}
            >
              Manual Channel
            </button>
          )}

          {/* Individual Manual Channel Controls */}
          {isManualChannelMode && chartCompareStocks.length === 0 && selectedStock && manualChannels.length > 0 && (
            <div className="flex flex-col gap-1 ml-1">
              {manualChannels.map((channel, idx) => {
                const channelColors = ['#A855F7', '#10B981', '#F59E0B', '#EF4444', '#3B82F6'];
                const color = channelColors[idx % channelColors.length];

                return (
                  <div key={channel.id} className="flex items-center gap-2 px-2 py-1 rounded" style={{ backgroundColor: '#1F2937', border: `1px solid ${color}` }}>
                    {/* Checkbox for visibility toggle */}
                    <input
                      type="checkbox"
                      checked={channel.visible}
                      onChange={() => {
                        setManualChannels(prev => prev.map((ch, i) =>
                          i === idx ? { ...ch, visible: !ch.visible } : ch
                        ));
                      }}
                      className="w-4 h-4 cursor-pointer"
                      style={{ accentColor: color }}
                      title={channel.visible ? 'Hide channel' : 'Show channel'}
                    />
                    {/* Channel info label */}
                    <div className="flex items-center gap-1 flex-1">
                      <span className="text-xs font-bold" style={{ color: color }}>
                        Ch{idx + 1}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {channel.startDate} - {channel.endDate}
                      </span>
                      <span className="text-[10px] font-semibold" style={{ color: color }}>
                        ±{channel.stdMultiplier.toFixed(2)}σ
                      </span>
                    </div>
                    {/* Delete button */}
                    <button
                      onClick={() => {
                        setManualChannels(prev => prev.filter((_, i) => i !== idx));
                      }}
                      className="px-1.5 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold transition"
                      title={`Delete channel ${idx + 1} permanently`}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Manual Channel Status Message */}
          {isManualChannelMode && chartCompareStocks.length === 0 && selectedStock && (
            <div className="px-3 py-2 rounded-lg text-xs font-medium bg-green-900/30 text-green-300 border border-green-700">
              {isComputingManualChannel ? '⏳ Computing optimal channel...' : '🖱️ Drag to select a range on the chart'}
            </div>
          )}

          {/* Trend Channel Configuration (when in trend mode) */}
          {colorMode === 'trend' && chartCompareStocks.length === 0 && selectedStock && (
            <div className="flex items-center gap-2 ml-1">
              <div className="flex items-center gap-1" title="Regression lookback bars">
                <label className="text-[11px] text-gray-300 font-medium">Lookback: {trendChannelLookback}</label>
                <button
                  onClick={() => {
                    const step = Math.max(1, Math.round(getCurrentDataSlice().length / 100));
                    setTrendChannelLookback(Math.max(20, trendChannelLookback - step));
                    setTrendChannelInterceptShift(0);
                  }}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-base font-bold transition"
                  title="Decrement lookback"
                >
                  -
                </button>
                <input
                  type="range"
                  min="20"
                  // Max becomes dynamic: visible data length
                  max={getCurrentDataSlice().length}
                  step={Math.max(1, Math.round(getCurrentDataSlice().length / 100))}
                  value={Math.min(trendChannelLookback, getCurrentDataSlice().length)}
                  onChange={(e)=> {
                    const v = parseInt(e.target.value);
                    setTrendChannelLookback(v);
                    setTrendChannelInterceptShift(0);
                  }}
                  className="w-32 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                />
                <button
                  onClick={() => {
                    const step = Math.max(1, Math.round(getCurrentDataSlice().length / 100));
                    setTrendChannelLookback(Math.min(getCurrentDataSlice().length, trendChannelLookback + step));
                    setTrendChannelInterceptShift(0);
                  }}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-base font-bold transition"
                  title="Increment lookback"
                >
                  +
                </button>
                {trendChannelLookback > getCurrentDataSlice().length && (
                  <span className="text-[10px] text-red-400 font-semibold ml-1">(clamped to {getCurrentDataSlice().length})</span>
                )}
              </div>
              <div className="flex items-center gap-1" title="End offset from last data point">
                <label className="text-[11px] text-gray-300 font-medium">EndAt: {trendChannelEndAt}</label>
                <button
                  onClick={() => {
                    const step = Math.max(1, Math.round(getCurrentDataSlice().length / 1000));
                    setTrendChannelEndAt(Math.max(0, trendChannelEndAt - step));
                    setTrendChannelInterceptShift(0);
                  }}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-base font-bold transition"
                  title="Decrement end offset"
                >
                  -
                </button>
                <input
                  type="range"
                  min="0"
                  max={Math.floor(getCurrentDataSlice().length / 5)}
                  step={Math.max(1, Math.round(getCurrentDataSlice().length / 1000))}
                  value={trendChannelEndAt}
                  onChange={(e)=> {
                    const v = parseInt(e.target.value);
                    setTrendChannelEndAt(v);
                    setTrendChannelInterceptShift(0);
                  }}
                  className="w-32 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <button
                  onClick={() => {
                    const step = Math.max(1, Math.round(getCurrentDataSlice().length / 1000));
                    setTrendChannelEndAt(Math.min(Math.floor(getCurrentDataSlice().length / 5), trendChannelEndAt + step));
                    setTrendChannelInterceptShift(0);
                  }}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-base font-bold transition"
                  title="Increment end offset"
                >
                  +
                </button>
              </div>
              <div className="flex items-center gap-1" title="Std Dev Multiplier (Delta)">
                <label className="text-xs text-gray-300 font-medium">Δσ: {trendChannelStdMultiplier.toFixed(1)}</label>
                <button
                  onClick={() => {
                    setTrendChannelStdMultiplier(Math.max(0.5, trendChannelStdMultiplier - 0.5));
                    setTrendChannelInterceptShift(0);
                  }}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-base font-bold transition"
                  title="Decrement std dev multiplier"
                >
                  -
                </button>
                <input
                  type="range"
                  min="0.5"
                  max="4"
                  step="0.5"
                  value={trendChannelStdMultiplier}
                  onChange={(e)=> {
                    setTrendChannelStdMultiplier(parseFloat(e.target.value));
                    setTrendChannelInterceptShift(0);
                  }}
                  className="w-24 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
                <button
                  onClick={() => {
                    setTrendChannelStdMultiplier(Math.min(4, trendChannelStdMultiplier + 0.5));
                    setTrendChannelInterceptShift(0);
                  }}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-base font-bold transition"
                  title="Increment std dev multiplier"
                >
                  +
                </button>
              </div>

              {/* Simulation Button */}
              <button
                onClick={simulateTrendChannelLookback}
                disabled={isChannelSimulating}
                className="px-3 py-1 rounded text-xs font-medium transition"
                style={{
                  backgroundColor: isChannelSimulating ? '#6B7280' : '#10B981',
                  color: '#FFFFFF',
                  cursor: isChannelSimulating ? 'not-allowed' : 'pointer',
                  opacity: isChannelSimulating ? 0.6 : 1
                }}
                title="Find optimal lookback and endAt parameters (2D optimization, fixed delta: 0.5)"
              >
                {isChannelSimulating ? 'Simulating...' : 'Find Optimal'}
              </button>

              {/* Simulation Result Display */}
              {channelSimulationResult && (
                <div className="flex flex-col gap-1">
                  <div
                    className="text-[10px] text-green-400 font-medium cursor-pointer hover:text-green-300 transition"
                    onClick={() => {
                      setTrendChannelLookback(channelSimulationResult.optimalLookback);
                      setTrendChannelEndAt(channelSimulationResult.optimalEndAt);
                      setTrendChannelStdMultiplier(channelSimulationResult.optimalDelta);
                      setTrendChannelInterceptShift(channelSimulationResult.optimalInterceptShift || 0);
                    }}
                    title="Click to restore optimal settings (full range)"
                  >
                    Optimal (Full): {channelSimulationResult.optimalLookback} / End:{channelSimulationResult.optimalEndAt} / Δ{channelSimulationResult.optimalDelta.toFixed(1)}
                  </div>
                  {channelSimulationResult.recent && (
                    <div
                      className="text-[10px] text-emerald-300 font-medium cursor-pointer hover:text-emerald-200 transition"
                      onClick={() => {
                        setTrendChannelLookback(channelSimulationResult.recent.optimalLookback);
                        setTrendChannelEndAt(channelSimulationResult.recent.optimalEndAt);
                        setTrendChannelStdMultiplier(channelSimulationResult.recent.optimalDelta);
                        setTrendChannelInterceptShift(channelSimulationResult.recent.optimalInterceptShift || 0);
                      }}
                      title="Click to apply recent optimal settings"
                    >
                      Optimal (Recent 25%): {channelSimulationResult.recent.optimalLookback} / End:{channelSimulationResult.recent.optimalEndAt} / Δ{channelSimulationResult.recent.optimalDelta.toFixed(1)}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Multi-Channel Configuration (when in multi-channel mode) */}
          {colorMode === 'multi-channel' && chartCompareStocks.length === 0 && selectedStock && (
            <div className="flex items-center gap-2 ml-1">
              <div className="flex items-center gap-1" title="Minimum ratio of data points per channel">
                <label className="text-[11px] text-gray-300 font-medium">Min Ratio: {(multiChannelMinRatio * 100).toFixed(0)}%</label>
                <button
                  onClick={() => setMultiChannelMinRatio(Math.max(0.05, multiChannelMinRatio - 0.01))}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-base font-bold transition"
                  title="Decrement min ratio"
                >
                  -
                </button>
                <input
                  type="range"
                  min="0.05"
                  max="0.25"
                  step="0.01"
                  value={multiChannelMinRatio}
                  onChange={(e) => setMultiChannelMinRatio(parseFloat(e.target.value))}
                  className="w-16 h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                  style={{ width: '60px' }}
                />
                <button
                  onClick={() => setMultiChannelMinRatio(Math.min(0.25, multiChannelMinRatio + 0.01))}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-base font-bold transition"
                  title="Increment min ratio"
                >
                  +
                </button>
              </div>

              <div className="flex items-center gap-1" title="Maximum ratio of data points per channel">
                <label className="text-[11px] text-gray-300 font-medium">Max Ratio: {(multiChannelMaxRatio * 100).toFixed(0)}%</label>
                <button
                  onClick={() => setMultiChannelMaxRatio(Math.max(0.25, multiChannelMaxRatio - 0.05))}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-base font-bold transition"
                  title="Decrement max ratio"
                >
                  -
                </button>
                <input
                  type="range"
                  min="0.25"
                  max="0.75"
                  step="0.05"
                  value={multiChannelMaxRatio}
                  onChange={(e) => setMultiChannelMaxRatio(parseFloat(e.target.value))}
                  className="w-16 h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                  style={{ width: '60px' }}
                />
                <button
                  onClick={() => setMultiChannelMaxRatio(Math.min(0.75, multiChannelMaxRatio + 0.05))}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-base font-bold transition"
                  title="Increment max ratio"
                >
                  +
                </button>
              </div>

              <div className="flex items-center gap-1" title="Standard deviation multiplier">
                <label className="text-[11px] text-gray-300 font-medium">StdDev: {multiChannelStdMultiplier.toFixed(1)}</label>
                <button
                  onClick={() => setMultiChannelStdMultiplier(Math.max(0.5, multiChannelStdMultiplier - 0.1))}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-base font-bold transition"
                  title="Decrement std dev multiplier"
                >
                  -
                </button>
                <input
                  type="range"
                  min="0.5"
                  max="4"
                  step="0.1"
                  value={multiChannelStdMultiplier}
                  onChange={(e) => setMultiChannelStdMultiplier(parseFloat(e.target.value))}
                  className="w-16 h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                  style={{ width: '60px' }}
                />
                <button
                  onClick={() => setMultiChannelStdMultiplier(Math.min(4, multiChannelStdMultiplier + 0.1))}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-base font-bold transition"
                  title="Increment std dev multiplier"
                >
                  +
                </button>
              </div>

              <button
                onClick={() => {
                  const currentData = getCurrentDataSlice();
                  if (!currentData || currentData.length === 0) return;

                  setIsMultiChannelSimulating(true);
                  setTimeout(() => {
                    const channels = findMultipleChannels(
                      currentData,
                      multiChannelMinRatio,
                      multiChannelMaxRatio,
                      multiChannelStdMultiplier,
                      chartPeriod
                    );
                    setMultiChannelResults(channels);
                    setIsMultiChannelSimulating(false);
                  }, 50);
                }}
                disabled={isMultiChannelSimulating}
                className={`px-2 py-1 rounded text-[11px] font-medium transition ${
                  isMultiChannelSimulating
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                }`}
                title="Find optimal multi-channel configuration"
              >
                {isMultiChannelSimulating ? 'Finding...' : 'Find Channels'}
              </button>

              {multiChannelResults && multiChannelResults.length > 0 && (
                <div className="flex flex-col gap-0.5">
                  <div className="text-[10px] text-emerald-300 font-medium">
                    Found {multiChannelResults.length} channel{multiChannelResults.length > 1 ? 's' : ''}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SMA Period Slider */}
          {colorMode === 'sma' && chartCompareStocks.length === 0 && selectedStock && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-300 font-medium">SMA: {smaPeriod}</label>
              <button
                onClick={() => setSmaPeriod(Math.max(5, smaPeriod - 1))}
                className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs font-bold transition"
                title="Decrement SMA period"
              >
                -
              </button>
              <input
                type="range"
                min="5"
                max="100"
                value={smaPeriod}
                onChange={(e) => setSmaPeriod(parseInt(e.target.value))}
                className="w-24 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                title={`SMA Period: ${smaPeriod} days`}
              />
              <button
                onClick={() => setSmaPeriod(Math.min(100, smaPeriod + 1))}
                className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs font-bold transition"
                title="Increment SMA period"
              >
                +
              </button>
              <button
                onClick={runSimulation}
                disabled={isSimulating}
                className={`px-3 py-1 rounded text-xs font-bold transition ${
                  isSimulating
                    ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
                title={isSimulating ? 'Simulation in progress...' : 'Run simulation to find optimal SMA period'}
              >
                {isSimulating ? 'Simulating...' : 'Simulate'}
              </button>
            </div>
          )}

          {/* Standard Deviation Channel Parameters */}
          {colorMode === 'channel' && chartCompareStocks.length === 0 && selectedStock && (
            <div className="flex items-center gap-3">
              {/* Lookback Period */}
              <div className="flex items-center gap-1">
                <label className="text-xs text-gray-300 font-medium">Period: {channelLookback}</label>
                <button
                  onClick={() => setChannelLookback(Math.max(20, channelLookback - 1))}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-base font-bold transition"
                  title="Decrement lookback period"
                >
                  -
                </button>
                <input
                  type="range"
                  min="20"
                  max="200"
                  value={channelLookback}
                  onChange={(e) => setChannelLookback(parseInt(e.target.value))}
                  className="w-20 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  title={`Lookback Period: ${channelLookback} days`}
                />
                <button
                  onClick={() => setChannelLookback(Math.min(200, channelLookback + 1))}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-base font-bold transition"
                  title="Increment lookback period"
                >
                  +
                </button>
              </div>

              {/* Std Dev Multiplier */}
              <div className="flex items-center gap-1">
                <label className="text-xs text-gray-300 font-medium">StdDev: {channelStdDevMultiplier.toFixed(1)}</label>
                <button
                  onClick={() => setChannelStdDevMultiplier(Math.max(1, parseFloat((channelStdDevMultiplier - 0.1).toFixed(1))))}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-base font-bold transition"
                  title="Decrement std dev multiplier"
                >
                  -
                </button>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.1"
                  value={channelStdDevMultiplier}
                  onChange={(e) => setChannelStdDevMultiplier(parseFloat(e.target.value))}
                  className="w-20 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-red-600"
                  title={`Standard Deviation Multiplier: ${channelStdDevMultiplier.toFixed(1)}`}
                />
                <button
                  onClick={() => setChannelStdDevMultiplier(Math.min(3, parseFloat((channelStdDevMultiplier + 0.1).toFixed(1))))}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-base font-bold transition"
                  title="Increment std dev multiplier"
                >
                  +
                </button>
              </div>

              {/* Volume Bins */}
              <div className="flex items-center gap-1">
                <label className="text-xs text-gray-300 font-medium">Bins: {channelVolumeBins}</label>
                <button
                  onClick={() => setChannelVolumeBins(Math.max(20, channelVolumeBins - 1))}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-base font-bold transition"
                  title="Decrement volume bins"
                >
                  -
                </button>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={channelVolumeBins}
                  onChange={(e) => setChannelVolumeBins(parseInt(e.target.value))}
                  className="w-20 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-purple-600"
                  title={`Volume Profile Bins: ${channelVolumeBins}`}
                />
                <button
                  onClick={() => setChannelVolumeBins(Math.min(100, channelVolumeBins + 1))}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-base font-bold transition"
                  title="Increment volume bins"
                >
                  +
                </button>
              </div>

              {/* Price Source Selector */}
              <select
                value={channelSource}
                onChange={(e) => setChannelSource(e.target.value)}
                className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs text-white"
                title="Price source for centerline calculation"
              >
                <option value="close">Close</option>
                <option value="hl2">HL/2</option>
                <option value="ohlc4">OHLC/4</option>
              </select>
            </div>
          )}

          {/* No recent trend overlay anymore */}

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
          onMouseLeave={handleMouseLeave}
        >
          {/* SPY Data Loading Overlay */}
          {colorMode === 'vspy' && spyLoading && (
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
          {/* Increased chart height by 25%: 400 -> 500 */}
          <ResponsiveContainer
            width="100%"
            height={500}
            style={{
              margin: 0,
              padding: 0,
              cursor: isManualChannelMode ? 'crosshair' : 'default'
            }}
          >
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
              // Apply configurable trend channel (overwrites default trend calc) when in trend mode
              if (colorMode === 'trend') {
                multiData = buildConfigurableTrendChannel(
                  multiData,
                  trendChannelLookback,
                  trendChannelStdMultiplier,
                  { interceptShift: trendChannelInterceptShift, endAt: trendChannelEndAt }
                );
              }
              // Apply multi-channel data when in multi-channel mode
              if (colorMode === 'multi-channel' && multiChannelResults && multiChannelResults.length > 0) {
                // Add channel data to each point in multiData
                // Note: startIndex is the zoom offset, so we need to adjust channel indices
                multiData = multiData.map((pt, idx) => {
                  const channelData = {};
                  // The actual index in the full data is startIndex + idx
                  const fullDataIdx = startIndex + idx;

                  // For each channel, add its upper/center/lower values and bands if this point is in range
                  multiChannelResults.forEach((channel, channelIdx) => {
                    if (fullDataIdx >= channel.startIdx && fullDataIdx <= channel.endIdx) {
                      const localIdx = fullDataIdx - channel.startIdx;
                      const localData = channel.data[localIdx];
                      if (localData) {
                        channelData[`channel_${channelIdx}_upper`] = localData.channelUpper;
                        channelData[`channel_${channelIdx}_center`] = localData.channelCenter;
                        channelData[`channel_${channelIdx}_lower`] = localData.channelLower;

                        // Add intermediate bands for color zones
                        for (let b = 1; b < CHANNEL_BANDS; b++) {
                          if (localData[`channelBand_${b}`] != null) {
                            channelData[`channel_${channelIdx}_band_${b}`] = localData[`channelBand_${b}`];
                          }
                        }
                      }
                    }
                  });

                  return { ...pt, ...channelData };
                });
              }
              // Apply manual channel data when manual channels exist
              if (isManualChannelMode && manualChannels.length > 0) {
                console.log('Applying manual channel data. Channels:', manualChannels.length, 'Data points:', multiData.length);

                // Add manual channel data to each point in multiData
                multiData = multiData.map((pt, idx) => {
                  const channelData = {};
                  const fullDataIdx = startIndex + idx;

                  // For each manual channel, add its upper/center/lower values and bands if this point is in range
                  manualChannels.forEach((channel, channelIdx) => {
                    // Only apply data if channel is visible
                    if (!channel.visible) return;

                    // Match by date instead of index for more reliability
                    const channelDataPoint = channel.data.find(d => d.date === pt.date);

                    if (channelDataPoint) {
                      channelData[`manual_${channelIdx}_upper`] = channelDataPoint.trendUpper;
                      channelData[`manual_${channelIdx}_center`] = channelDataPoint.trendLine;
                      channelData[`manual_${channelIdx}_lower`] = channelDataPoint.trendLower;

                      // Add intermediate bands for color zones (1 through CHANNEL_BANDS-1)
                      for (let b = 1; b < CHANNEL_BANDS; b++) {
                        if (channelDataPoint[`trendBand_${b}`] != null) {
                          channelData[`manual_${channelIdx}_band_${b}`] = channelDataPoint[`trendBand_${b}`];
                        }
                      }
                    }
                  });

                  return { ...pt, ...channelData };
                });

                console.log('Manual channel data applied. Sample point:', multiData[0]);
              }
              if (colorMode === 'sma' && chartCompareStocks.length === 0) {
                const smaAnalysis = detectTurningPoints(multiData);
                smaSegments = addSmaDataKeys(multiData, smaAnalysis.turningPoints);
                multiData = smaSegments.data;
              }

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
                <LineChart
                  data={multiData}
                  margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleChartHover}
                  onMouseUp={handleMouseUp}
                >
                  <CartesianGrid stroke="#1F2937" strokeDasharray="3 3" />
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
                    if (!hasData) {
                      return (
                        <YAxis
                          stroke="#9CA3AF"
                          allowDecimals={false}
                          tickFormatter={(v)=> Math.round(v)}
                          domain={[0, 10]}
                        />
                      );
                    }

                    // Calculate y-axis range with balanced padding
                    // 1. Find lowest and highest values
                    const lowestValue = Math.min(...chartData.map(d => d.price));
                    const highestValue = Math.max(...chartData.map(d => d.price));

                    // 2. Calculate range
                    const range = highestValue - lowestValue;

                    // 3. Add 15% of range as padding on both sides
                    const padding = range * 0.15;
                    const rawMin = lowestValue - padding;
                    const rawMax = highestValue + padding;

                    const intMin = Math.floor(rawMin);
                    const intMax = Math.ceil(rawMax);

                    return (
                      <YAxis
                        stroke="#9CA3AF"
                        allowDecimals={false}
                        tickFormatter={(v)=> Math.round(v)}
                        domain={[intMin, intMax]}
                      />
                    );
                  })()
                ) : (
                  <YAxis
                    stroke="#9CA3AF"
                    tickFormatter={(v)=> `${Math.round(v)}%`}
                    domain={['auto','auto']}
                  />
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

                {/* Volume Bar Mode - Horizontal background zones */}
                {colorMode === 'volumeBar' && chartCompareStocks.length === 0 && multiData.length > 0 && (() => {
                  const volumeBarData = calculateVolumeBarData(multiData);
                  const totalVolume = volumeBarData.reduce((sum, slot) => sum + slot.volume, 0);

                  return (
                    <>
                      {volumeBarData.map((slot, idx) => {
                        const percentage = totalVolume > 0 ? (slot.volume / totalVolume) * 100 : 0;
                        const showLabel = percentage >= 2.0; // Only show label if >= 2% to avoid clutter

                        return (
                          <ReferenceArea
                            key={`volume-bar-${idx}`}
                            y1={slot.priceMin}
                            y2={slot.priceMax}
                            fill={slot.color}
                            strokeOpacity={0}
                            label={showLabel ? {
                              value: `${percentage.toFixed(1)}%`,
                              position: 'center',
                              fill: slot.intensity < 0.3 ? '#78350F' : '#D1D5DB',
                              fontSize: 11,
                              fontWeight: 'bold'
                            } : null}
                          />
                        );
                      })}
                    </>
                  );
                })()}

                {/* Standard Deviation Channel - Volume profile reference lines */}
                {colorMode === 'channel' && chartCompareStocks.length === 0 && multiData.length > 0 && (() => {
                  const volumeProfile = multiData._volumeProfile;

                  return (
                    <>
                      {/* Point of Control (POC) from Volume Profile */}
                      {volumeProfile && volumeProfile.poc && (
                        <ReferenceLine
                          y={volumeProfile.poc.priceLevel}
                          stroke="#fbbf24"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          strokeOpacity={0.9}
                          label={{
                            value: `POC: $${volumeProfile.poc.priceLevel.toFixed(2)}`,
                            position: 'insideTopLeft',
                            fill: '#fbbf24',
                            fontSize: 10,
                            fontWeight: 'bold'
                          }}
                        />
                      )}

                      {/* High Volume Nodes (HVNs) - subtle background lines */}
                      {volumeProfile && volumeProfile.hvns && volumeProfile.hvns.slice(0, 5).map((hvn, idx) => (
                        <ReferenceLine
                          key={`hvn-${idx}`}
                          y={hvn.priceLevel}
                          stroke="#a855f7"
                          strokeWidth={1}
                          strokeDasharray="2 2"
                          strokeOpacity={0.4}
                        />
                      ))}
                    </>
                  );
                })()}

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
                  ) : colorMode === 'channel' ? (
                    // Channel Mode: Render price line + channel lines
                    <>
                      {/* Channel Partition Bands */}
                      {multiData.length > 1 && (() => {
                        // Calculate volume distribution across all zones
                        const zoneVolumeDistribution = calculateZoneVolumeDistribution(multiData, 'channel');

                        return multiData.map((pt, i) => {
                          const next = multiData[i + 1];
                          if (!next) return null;
                          if (pt.lowerBound == null || pt.upperBound == null || next.lowerBound == null || next.upperBound == null) return null;
                          // Render each band zone between consecutive band boundaries
                          const zones = [];
                          for (let b = 0; b < CHANNEL_BANDS; b++) {
                            const lowerKey = b === 0 ? 'lowerBound' : `channelBand_${b}`;
                            const upperKey = b === CHANNEL_BANDS - 1 ? 'upperBound' : `channelBand_${b + 1}`;
                            const ptLower = pt[lowerKey];
                            const ptUpper = pt[upperKey];
                            const nextLower = next[lowerKey];
                            const nextUpper = next[upperKey];
                            if (ptLower == null || ptUpper == null || nextLower == null || nextUpper == null) continue;
                            const zoneLower = Math.min(ptLower, nextLower);
                            const zoneUpper = Math.max(ptUpper, nextUpper);
                            const ratioMid = (b + 0.5) / CHANNEL_BANDS; // mid-point for color
                            const volumePercent = zoneVolumeDistribution[b] || 0;

                            // Show label on the last segment (rightmost) for each zone
                            const isLastSegment = i === multiData.length - 2;
                            const showLabel = isLastSegment && volumePercent >= 0.1; // Show if >= 0.1% volume

                            zones.push(
                              <ReferenceArea
                                key={`channel-band-${i}-${b}`}
                                x1={pt.date}
                                x2={next.date}
                                y1={zoneLower}
                                y2={zoneUpper}
                                fill={getChannelBandColor(ratioMid, volumePercent)}
                                strokeOpacity={0}
                                ifOverflow="discard"
                                label={showLabel ? {
                                  value: `${volumePercent.toFixed(1)}%`,
                                  position: 'right',
                                  fill: '#ffffff',
                                  fontSize: 10,
                                  fontWeight: 'bold',
                                  stroke: '#000000',
                                  strokeWidth: 0.5
                                } : null}
                              />
                            );
                          }
                          return zones;
                        });
                      })()}
                      <Line
                        type="monotone"
                        dataKey="price"
                        name={`${selectedStock?.code || ''} Price`}
                        stroke="#3B82F6"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="upperBound"
                        name="Upper Bound"
                        stroke="#ef4444"
                        strokeWidth={2}
                        strokeOpacity={0.8}
                        strokeDasharray="5 5"
                        dot={false}
                        connectNulls={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="centerLine"
                        name="Center Line"
                        stroke="#8b5cf6"
                        strokeWidth={2}
                        strokeOpacity={0.6}
                        strokeDasharray="5 5"
                        dot={false}
                        connectNulls={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="lowerBound"
                        name="Lower Bound"
                        stroke="#10b981"
                        strokeWidth={2}
                        strokeOpacity={0.8}
                        strokeDasharray="5 5"
                        dot={false}
                        connectNulls={false}
                      />
                      {/* Recent Trend overlay removed */}
                    </>
                  ) : colorMode === 'trend' ? (
                    // Trend Mode: Render price line + linear regression trend channel
                    <>
                      {/* Trend Channel Partition Bands */}
                      {multiData.length > 1 && (() => {
                        // Calculate volume distribution across all zones
                        const zoneVolumeDistribution = calculateZoneVolumeDistribution(multiData, 'trend');

                        return multiData.map((pt, i) => {
                          const next = multiData[i + 1];
                          if (!next) return null;
                          if (pt.trendLower == null || pt.trendUpper == null || next.trendLower == null || next.trendUpper == null) return null;
                          const zones = [];
                          for (let b = 0; b < CHANNEL_BANDS; b++) {
                            const lowerKey = b === 0 ? 'trendLower' : `trendBand_${b}`;
                            const upperKey = b === CHANNEL_BANDS - 1 ? 'trendUpper' : `trendBand_${b + 1}`;
                            const ptLower = pt[lowerKey];
                            const ptUpper = pt[upperKey];
                            const nextLower = next[lowerKey];
                            const nextUpper = next[upperKey];
                            if (ptLower == null || ptUpper == null || nextLower == null || nextUpper == null) continue;
                            const zoneLower = Math.min(ptLower, nextLower);
                            const zoneUpper = Math.max(ptUpper, nextUpper);
                            const ratioMid = (b + 0.5) / CHANNEL_BANDS;
                            const volumePercent = zoneVolumeDistribution[b] || 0;

                            // Show label on the last segment (rightmost) for each zone
                            const isLastSegment = i === multiData.length - 2;
                            const showLabel = isLastSegment && volumePercent >= 0.1; // Show if >= 0.1% volume

                            zones.push(
                              <ReferenceArea
                                key={`trend-band-${i}-${b}`}
                                x1={pt.date}
                                x2={next.date}
                                y1={zoneLower}
                                y2={zoneUpper}
                                fill={getChannelBandColor(ratioMid, volumePercent)}
                                strokeOpacity={0}
                                ifOverflow="discard"
                                label={showLabel ? {
                                  value: `${volumePercent.toFixed(1)}%`,
                                  position: 'right',
                                  fill: '#ffffff',
                                  fontSize: 10,
                                  fontWeight: 'bold',
                                  stroke: '#000000',
                                  strokeWidth: 0.5
                                } : null}
                              />
                            );
                          }
                          return zones;
                        });
                      })()}
                      <Line
                        type="monotone"
                        dataKey="price"
                        name={`${selectedStock?.code || ''} Price`}
                        stroke="#3B82F6"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="trendUpper"
                        name={`Upper Bound (+${trendChannelStdMultiplier.toFixed(1)}σ)`}
                        stroke="#A855F7"
                        strokeWidth={1.5}
                        strokeOpacity={0.8}
                        strokeDasharray="5 5"
                        dot={false}
                        connectNulls={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="trendLine"
                        name="Trend Line"
                        stroke="#9333EA"
                        strokeWidth={2}
                        strokeOpacity={0.9}
                        strokeDasharray="5 5"
                        dot={false}
                        connectNulls={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="trendLower"
                        name={`Lower Bound (-${trendChannelStdMultiplier.toFixed(1)}σ)`}
                        stroke="#A855F7"
                        strokeWidth={1.5}
                        strokeOpacity={0.8}
                        strokeDasharray="5 5"
                        dot={false}
                        connectNulls={false}
                      />
                    </>
                  ) : colorMode === 'multi-channel' ? (
                    // Multi-Channel Mode: Render multiple channels with volume-based color zones
                    <>
                      {/* Render color zones for each channel */}
                      {multiChannelResults && multiChannelResults.length > 0 && multiData.length > 1 && multiChannelResults.map((channel, channelIdx) => {
                        // Calculate volume distribution for this specific channel
                        const channelData = multiData.filter((pt, idx) => {
                          const fullDataIdx = startIndex + idx;
                          return fullDataIdx >= channel.startIdx && fullDataIdx <= channel.endIdx &&
                                 pt[`channel_${channelIdx}_lower`] != null;
                        });

                        // Calculate zone volume distribution
                        const zoneVolumes = {};
                        let totalVolume = 0;

                        channelData.forEach(pt => {
                          const price = pt.price || pt.close;
                          const volume = pt.volume || 0;

                          if (!price || !volume) return;

                          const lowerBound = pt[`channel_${channelIdx}_lower`];
                          const upperBound = pt[`channel_${channelIdx}_upper`];

                          if (lowerBound == null || upperBound == null) return;

                          // Build band boundary array
                          const boundaries = [lowerBound];
                          for (let b = 1; b < CHANNEL_BANDS; b++) {
                            const bandValue = pt[`channel_${channelIdx}_band_${b}`];
                            if (bandValue != null) boundaries.push(bandValue);
                          }
                          boundaries.push(upperBound);

                          if (boundaries.length !== CHANNEL_BANDS + 1) {
                            // Fallback to uniform division
                            const channelRange = upperBound - lowerBound;
                            if (channelRange <= 0) return;
                            const pricePosition = (price - lowerBound) / channelRange;
                            let zoneIndex = Math.floor(pricePosition * CHANNEL_BANDS);
                            zoneIndex = Math.max(0, Math.min(CHANNEL_BANDS - 1, zoneIndex));
                            if (!zoneVolumes[zoneIndex]) zoneVolumes[zoneIndex] = 0;
                            zoneVolumes[zoneIndex] += volume;
                            totalVolume += volume;
                            return;
                          }

                          // Determine zone by boundary search
                          let zoneIndex = -1;
                          for (let z = 0; z < CHANNEL_BANDS; z++) {
                            const low = boundaries[z];
                            const high = boundaries[z + 1];
                            if (price >= low && price <= high) {
                              zoneIndex = z;
                              break;
                            }
                          }

                          if (zoneIndex === -1) return; // price outside channel
                          if (!zoneVolumes[zoneIndex]) zoneVolumes[zoneIndex] = 0;
                          zoneVolumes[zoneIndex] += volume;
                          totalVolume += volume;
                        });

                        // Calculate volume percentages
                        const zoneVolumePercentages = {};
                        Object.keys(zoneVolumes).forEach(zoneIndex => {
                          zoneVolumePercentages[zoneIndex] = totalVolume > 0
                            ? (zoneVolumes[zoneIndex] / totalVolume) * 100
                            : 0;
                        });

                        return multiData.map((pt, i) => {
                          const next = multiData[i + 1];
                          if (!next) return null;

                          // Check if this is the last segment of this channel
                          const fullDataIdx = startIndex + i;
                          const nextFullDataIdx = startIndex + i + 1;
                          const isLastSegmentOfChannel =
                            pt[`channel_${channelIdx}_lower`] != null &&
                            (next[`channel_${channelIdx}_lower`] == null || nextFullDataIdx > channel.endIdx);

                          const zones = [];
                          // Render each band zone between consecutive band boundaries
                          for (let b = 0; b < CHANNEL_BANDS; b++) {
                            const lowerKey = b === 0 ? `channel_${channelIdx}_lower` : `channel_${channelIdx}_band_${b}`;
                            const upperKey = b === CHANNEL_BANDS - 1 ? `channel_${channelIdx}_upper` : `channel_${channelIdx}_band_${b + 1}`;
                            const ptLower = pt[lowerKey];
                            const ptUpper = pt[upperKey];
                            const nextLower = next[lowerKey];
                            const nextUpper = next[upperKey];

                            if (ptLower == null || ptUpper == null || nextLower == null || nextUpper == null) continue;

                            const zoneLower = Math.min(ptLower, nextLower);
                            const zoneUpper = Math.max(ptUpper, nextUpper);
                            const ratioMid = (b + 0.5) / CHANNEL_BANDS; // mid-point for color

                            // Use actual volume percentage for this zone
                            const volumePercent = zoneVolumePercentages[b] || 0;

                            // Show label on the last segment (rightmost) for each zone
                            const showLabel = isLastSegmentOfChannel && volumePercent >= 0.1; // Show if >= 0.1% volume

                            zones.push(
                              <ReferenceArea
                                key={`multi-channel-${channelIdx}-band-${i}-${b}`}
                                x1={pt.date}
                                x2={next.date}
                                y1={zoneLower}
                                y2={zoneUpper}
                                fill={getChannelBandColor(ratioMid, volumePercent)}
                                strokeOpacity={0}
                                ifOverflow="discard"
                                label={showLabel ? {
                                  value: `${volumePercent.toFixed(1)}%`,
                                  position: 'right',
                                  fill: '#ffffff',
                                  fontSize: 9,
                                  fontWeight: 'bold',
                                  stroke: '#000000',
                                  strokeWidth: 0.5
                                } : null}
                              />
                            );
                          }
                          return zones;
                        });
                      })}

                      {/* Render channel lines */}
                      {multiChannelResults && multiChannelResults.length > 0 && multiChannelResults.map((channel, channelIdx) => {
                        // Generate unique colors for each channel
                        const colors = [
                          { upper: '#ef4444', center: '#8b5cf6', lower: '#10b981' }, // red, purple, green
                          { upper: '#f59e0b', center: '#3b82f6', lower: '#06b6d4' }, // amber, blue, cyan
                          { upper: '#ec4899', center: '#8b5cf6', lower: '#14b8a6' }, // pink, purple, teal
                          { upper: '#dc2626', center: '#7c3aed', lower: '#059669' }, // red-600, violet-600, emerald-600
                          { upper: '#ea580c', center: '#2563eb', lower: '#0891b2' }, // orange-600, blue-600, cyan-600
                        ];
                        const channelColor = colors[channelIdx % colors.length];

                        // Find the last data point for this channel to place the delta label
                        const channelEndData = multiData.find((pt, idx) => {
                          const fullDataIdx = startIndex + idx;
                          const nextIdx = startIndex + idx + 1;
                          return fullDataIdx >= channel.startIdx &&
                                 fullDataIdx <= channel.endIdx &&
                                 pt[`channel_${channelIdx}_center`] != null &&
                                 (nextIdx > channel.endIdx || !multiData[idx + 1] || multiData[idx + 1][`channel_${channelIdx}_center`] == null);
                        });

                        // Display only the stdDev multiplier (sigma value)
                        const sigmaLabel = `±${channel.stdMultiplier || 2}σ`;

                        return (
                          <React.Fragment key={`channel-${channelIdx}`}>
                            {/* Upper bound */}
                            <Line
                              type="monotone"
                              dataKey={`channel_${channelIdx}_upper`}
                              name={`Ch${channelIdx + 1} Upper`}
                              stroke={channelColor.upper}
                              strokeWidth={1.5}
                              strokeOpacity={0.7}
                              strokeDasharray="3 3"
                              dot={false}
                              connectNulls={false}
                            />
                            {/* Center line */}
                            <Line
                              type="monotone"
                              dataKey={`channel_${channelIdx}_center`}
                              name={`Ch${channelIdx + 1} Center`}
                              stroke={channelColor.center}
                              strokeWidth={1.5}
                              strokeOpacity={0.6}
                              strokeDasharray="5 5"
                              dot={false}
                              connectNulls={false}
                            />
                            {/* Lower bound */}
                            <Line
                              type="monotone"
                              dataKey={`channel_${channelIdx}_lower`}
                              name={`Ch${channelIdx + 1} Lower`}
                              stroke={channelColor.lower}
                              strokeWidth={1.5}
                              strokeOpacity={0.7}
                              strokeDasharray="3 3"
                              dot={false}
                              connectNulls={false}
                            />
                            {/* StdDev label at channel end */}
                            {channelEndData && (
                              <ReferenceLine
                                segment={[
                                  { x: channelEndData.date, y: channelEndData[`channel_${channelIdx}_upper`] },
                                  { x: channelEndData.date, y: channelEndData[`channel_${channelIdx}_lower`] }
                                ]}
                                stroke={channelColor.center}
                                strokeWidth={2}
                                strokeOpacity={0.5}
                                label={{
                                  value: sigmaLabel,
                                  position: 'right',
                                  fill: channelColor.center,
                                  fontSize: 11,
                                  fontWeight: 'bold',
                                  offset: 5
                                }}
                              />
                            )}
                          </React.Fragment>
                        );
                      })}
                      {/* Price line on top */}
                      <Line
                        type="monotone"
                        dataKey="price"
                        name={`${selectedStock?.code || ''} Price`}
                        stroke="#3B82F6"
                        strokeWidth={2}
                        dot={false}
                      />
                    </>
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

                {/* Manual Channels - Render on top of everything when in manual channel mode */}
                {isManualChannelMode && manualChannels.length > 0 && manualChannels.map((channel, channelIdx) => {
                  // Skip if channel is not visible
                  if (!channel.visible) return null;

                  // Calculate volume distribution for this manual channel
                  const channelData = multiData.filter((pt, idx) => {
                    const fullDataIdx = startIndex + idx;
                    return fullDataIdx >= channel.startIdx && fullDataIdx <= channel.endIdx &&
                           pt[`manual_${channelIdx}_lower`] != null;
                  });

                  // Calculate zone volume distribution
                  const zoneVolumes = {};
                  let totalVolume = 0;

                  channelData.forEach(pt => {
                    const price = pt.price || pt.close;
                    const volume = pt.volume || 0;

                    if (!price || !volume) return;

                    const lowerBound = pt[`manual_${channelIdx}_lower`];
                    const upperBound = pt[`manual_${channelIdx}_upper`];

                    if (lowerBound == null || upperBound == null) return;

                    // Build band boundary array (using 6 bands like trend mode)
                    const boundaries = [lowerBound];
                    for (let b = 1; b <= 6; b++) {
                      const bandValue = pt[`manual_${channelIdx}_band_${b}`];
                      if (bandValue != null) boundaries.push(bandValue);
                    }
                    boundaries.push(upperBound);

                    // Determine zone by boundary search
                    let zoneIndex = -1;
                    for (let z = 0; z < boundaries.length - 1; z++) {
                      const low = boundaries[z];
                      const high = boundaries[z + 1];
                      if (price >= low && price <= high) {
                        zoneIndex = z;
                        break;
                      }
                    }

                    if (zoneIndex === -1 || zoneIndex >= CHANNEL_BANDS) return;
                    if (!zoneVolumes[zoneIndex]) zoneVolumes[zoneIndex] = 0;
                    zoneVolumes[zoneIndex] += volume;
                    totalVolume += volume;
                  });

                  // Calculate volume percentages
                  const zoneVolumePercentages = {};
                  Object.keys(zoneVolumes).forEach(zoneIndex => {
                    zoneVolumePercentages[zoneIndex] = totalVolume > 0
                      ? (zoneVolumes[zoneIndex] / totalVolume) * 100
                      : 0;
                  });

                  // Render color zones for this manual channel
                  const colorZones = multiData.map((pt, i) => {
                    const next = multiData[i + 1];
                    if (!next) return null;

                    const zones = [];
                    // Render zones between bands (6 bands for trend mode, so CHANNEL_BANDS zones)
                    for (let b = 0; b < CHANNEL_BANDS; b++) {
                      const lowerKey = b === 0 ? `manual_${channelIdx}_lower` : `manual_${channelIdx}_band_${b}`;
                      const upperKey = b === CHANNEL_BANDS - 1 ? `manual_${channelIdx}_upper` : `manual_${channelIdx}_band_${b + 1}`;
                      const ptLower = pt[lowerKey];
                      const ptUpper = pt[upperKey];
                      const nextLower = next[lowerKey];
                      const nextUpper = next[upperKey];

                      if (ptLower == null || ptUpper == null || nextLower == null || nextUpper == null) continue;

                      const zoneLower = Math.min(ptLower, nextLower);
                      const zoneUpper = Math.max(ptUpper, nextUpper);
                      const ratioMid = (b + 0.5) / CHANNEL_BANDS;
                      const volumePercent = zoneVolumePercentages[b] || 0;

                      // Show label on the last segment (rightmost) for each zone
                      const fullDataIdx = startIndex + i;
                      const isLastSegment = fullDataIdx === channel.endIdx - 1;
                      const showLabel = isLastSegment && volumePercent >= 0.1; // Show if >= 0.1% volume

                      zones.push(
                        <ReferenceArea
                          key={`manual-${channelIdx}-band-${i}-${b}`}
                          x1={pt.date}
                          x2={next.date}
                          y1={zoneLower}
                          y2={zoneUpper}
                          fill={getChannelBandColor(ratioMid, volumePercent)}
                          strokeOpacity={0}
                          ifOverflow="discard"
                          label={showLabel ? {
                            value: `${volumePercent.toFixed(1)}%`,
                            position: 'right',
                            fill: '#ffffff',
                            fontSize: 10,
                            fontWeight: 'bold',
                            stroke: '#000000',
                            strokeWidth: 0.5
                          } : null}
                        />
                      );
                    }
                    return zones;
                  });

                  // Channel color (different colors for different manual channels)
                  const channelColors = [
                    { upper: '#A855F7', center: '#9333EA', lower: '#A855F7' }, // Purple
                    { upper: '#10B981', center: '#059669', lower: '#10B981' }, // Green
                    { upper: '#F59E0B', center: '#D97706', lower: '#F59E0B' }, // Orange
                    { upper: '#EF4444', center: '#DC2626', lower: '#EF4444' }, // Red
                    { upper: '#3B82F6', center: '#2563EB', lower: '#3B82F6' }, // Blue
                  ];
                  const channelColor = channelColors[channelIdx % channelColors.length];

                  // Find the midpoint of the channel for the stdev label
                  const channelStartIdx = multiData.findIndex(pt => pt.date === channel.startDate);
                  const channelEndIdx = multiData.findIndex(pt => pt.date === channel.endDate);
                  const channelMidIdx = Math.floor((channelStartIdx + channelEndIdx) / 2);
                  const channelMidData = channelMidIdx >= 0 ? multiData[channelMidIdx] : null;
                  const sigmaLabel = `±${channel.stdMultiplier.toFixed(2)}σ`;

                  return (
                    <React.Fragment key={`manual-channel-${channelIdx}`}>
                      {/* Render color zones */}
                      {colorZones}
                      {/* Upper bound */}
                      <Line
                        type="monotone"
                        dataKey={`manual_${channelIdx}_upper`}
                        name={`Manual Ch${channelIdx + 1} Upper`}
                        stroke={channelColor.upper}
                        strokeWidth={2}
                        strokeOpacity={0.9}
                        strokeDasharray="5 5"
                        dot={false}
                        connectNulls={false}
                      />
                      {/* Center line */}
                      <Line
                        type="monotone"
                        dataKey={`manual_${channelIdx}_center`}
                        name={`Manual Ch${channelIdx + 1} Center`}
                        stroke={channelColor.center}
                        strokeWidth={2}
                        strokeOpacity={0.95}
                        strokeDasharray="5 5"
                        dot={false}
                        connectNulls={false}
                      />
                      {/* Lower bound */}
                      <Line
                        type="monotone"
                        dataKey={`manual_${channelIdx}_lower`}
                        name={`Manual Ch${channelIdx + 1} Lower`}
                        stroke={channelColor.lower}
                        strokeWidth={2}
                        strokeOpacity={0.9}
                        strokeDasharray="5 5"
                        dot={false}
                        connectNulls={false}
                      />
                      {/* StdDev label at channel midpoint below lower bound */}
                      {channelMidData && channelMidData[`manual_${channelIdx}_lower`] && (
                        <ReferenceDot
                          x={channelMidData.date}
                          y={channelMidData[`manual_${channelIdx}_lower`]}
                          r={0}
                          fill="transparent"
                          stroke="transparent"
                          label={{
                            value: sigmaLabel,
                            position: 'bottom',
                            fill: channelColor.center,
                            fontSize: 12,
                            fontWeight: 'bold',
                            offset: 10,
                            stroke: '#000000',
                            strokeWidth: 0.3
                          }}
                        />
                      )}
                    </React.Fragment>
                  );
                })}

                {/* Selection rectangle for manual channel mode */}
                {isManualChannelMode && manualChannelSelection && (
                  <ReferenceArea
                    x1={manualChannelSelection.startDate}
                    x2={manualChannelSelection.endDate}
                    fill="#10B981"
                    fillOpacity={0.2}
                    stroke="#10B981"
                    strokeWidth={2}
                    strokeOpacity={0.8}
                    strokeDasharray="5 5"
                  />
                )}
              </LineChart>
            );
          })()}
        </ResponsiveContainer>
        {/* Crosshair overlay */}
        {crosshair.x !== null && crosshair.y !== null && (
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            {/* Vertical line */}
            <div style={{
              position: 'absolute',
              left: crosshair.x,
              top: 0,
              bottom: 0,
              width: '1px',
              background: 'rgba(255,255,255,0.35)',
              transform: 'translateX(-0.5px)'
            }} />
            {/* Horizontal line */}
            <div style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: crosshair.y,
              height: '1px',
              background: 'rgba(255,255,255,0.35)',
              transform: 'translateY(-0.5px)'
            }} />
            {/* Tooltip */}
            <div style={{
              position: 'absolute',
              left: Math.min(Math.max(0, crosshair.x + 12), (chartContainerRef.current?.offsetWidth || 0) - 160),
              top: Math.min(Math.max(0, crosshair.y + 12), (chartContainerRef.current?.offsetHeight || 0) - 60),
              background: 'rgba(17,24,39,0.85)',
              color: '#F3F4F6',
              padding: '6px 8px',
              fontSize: '11px',
              borderRadius: '6px',
              border: '1px solid #374151',
              boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
              pointerEvents: 'none',
              minWidth: '140px'
            }}>
              <div style={{ fontWeight: 600, color: '#93C5FD' }}>{crosshair.dataX || '—'}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                <span style={{ color: '#9CA3AF' }}>{chartCompareStocks.length === 0 ? 'Price:' : 'Value:'}</span>
                <span style={{ fontWeight: 600 }}>
                  {crosshair.dataY !== null ? (chartCompareStocks.length === 0 ? `$${Number(crosshair.dataY).toFixed(2)}` : `${Number(crosshair.dataY).toFixed(2)}%`) : '—'}
                </span>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Chart Controls - Below Chart */}
      <div className="flex items-center justify-between mt-4 mb-2 px-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center">
            <input
              type="text"
              placeholder="Input stock"
              value={chartCompareInput}
              onChange={(e)=> setChartCompareInput(e.target.value)}
              onKeyDown={(e)=> e.key==='Enter' && addChartCompareStock()}
              className="w-24 px-2 py-1 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 placeholder-gray-400"
              style={{ minWidth: '80px', maxWidth: '120px' }}
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

      {/* Volume Bar Legend - Below Chart */}
      {colorMode === 'volumeBar' && chartCompareStocks.length === 0 && selectedStock && (() => {
        const currentData = getCurrentDataSlice();
        const volumeBarData = calculateVolumeBarData(currentData);
        const maxVolumeSlot = volumeBarData.reduce((max, slot) => slot.volume > max.volume ? slot : max, { volume: 0 });

        // Calculate total volume
        const totalVolume = volumeBarData.reduce((sum, slot) => sum + slot.volume, 0);

        // Create legend data directly from the 20 price slots (evenly distributed)
        const legendData = volumeBarData.map(slot => {
          const percentage = totalVolume > 0 ? (slot.volume / totalVolume) * 100 : 0;
          const priceLabel = `$${slot.priceMin.toFixed(2)}-$${slot.priceMax.toFixed(2)}`;

          return {
            priceLabel,
            priceMin: slot.priceMin,
            priceMax: slot.priceMax,
            percentage,
            volume: slot.volume,
            color: slot.color,
            intensity: slot.intensity
          };
        });

        return (
          <div className="mt-4 mb-3 px-4">
            <div className="bg-gray-800 rounded-xl shadow-xl border border-gray-700 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold text-yellow-400">
                  📊 Volume Bar Legend - 20 Price Zones (Evenly Distributed)
                </div>
                <div className="text-xs text-gray-400">
                  🟡 Yellow (low volume) → 🟢 Green (medium) → 🔵 Blue (high volume)
                </div>
              </div>
              <div className="flex items-center gap-0.5 h-12 rounded-lg overflow-hidden border-2 border-yellow-600/30 shadow-lg">
                {legendData.map((slot, idx) => (
                  <div
                    key={idx}
                    className="flex-1 h-full flex flex-col items-center justify-center text-[7px] font-semibold leading-tight px-0.5"
                    style={{
                      background: slot.color,
                      color: slot.intensity < 0.3 ? '#422006' : '#FFFFFF',
                      opacity: slot.percentage === 0 ? 0.3 : 1
                    }}
                    title={`Price: ${slot.priceLabel}\nVolume: ${slot.volume.toLocaleString()}\n${slot.percentage.toFixed(1)}% of total trading volume\nIntensity: ${(slot.intensity * 100).toFixed(0)}% of max volume`}
                  >
                    <span className="text-[7px] whitespace-nowrap overflow-hidden text-ellipsis w-full text-center">{slot.priceLabel}</span>
                    <span className="text-[8px] font-bold">{slot.percentage.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between mt-3 text-[11px]">
                <div className="text-gray-300">
                  <span className="font-semibold">Total Price Range:</span> ${volumeBarData.length > 0 ? volumeBarData[0].priceMin.toFixed(2) : '0'} to ${volumeBarData.length > 0 ? volumeBarData[volumeBarData.length - 1].priceMax.toFixed(2) : '0'}
                </div>
                {maxVolumeSlot.volume > 0 && (
                  <div className="text-emerald-300 font-semibold">
                    🔥 Highest Volume: ${maxVolumeSlot.priceMin.toFixed(2)} - ${maxVolumeSlot.priceMax.toFixed(2)} ({((maxVolumeSlot.volume / totalVolume) * 100).toFixed(1)}%)
                  </div>
                )}
              </div>
              <div className="text-[10px] text-gray-400 mt-2 text-center">
                <span className="font-semibold">Legend:</span> Each bar represents one of the 20 equal price zones.
                The <span className="text-yellow-300">top label</span> shows the <span className="text-blue-300">price range</span>, and the
                <span className="text-emerald-300"> bottom percentage</span> shows what portion of <span className="text-white font-semibold">total trading volume</span> occurred in that zone.
                <span className="text-gray-500 italic"> Color intensity reflects volume level (yellow=low, green=medium, blue=high).</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Standard Deviation Channel Legend */}
      {colorMode === 'channel' && chartCompareStocks.length === 0 && selectedStock && (() => {
        const currentData = getCurrentDataSlice();
        const volumeProfile = currentData._volumeProfile;

        if (!volumeProfile) return null;

        return (
          <div className="mb-4 px-4">
            <div className="bg-gradient-to-r from-gray-800 via-gray-750 to-gray-800 rounded-lg p-4 shadow-lg border-2 border-blue-600/30">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold text-blue-400">
                  📈 Standard Deviation Channel with Volume Profile
                </div>
                <div className="text-xs text-gray-400">
                  Trend lines validated by volume density
                </div>
              </div>

              {/* Channel Parameters */}
              <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
                <div className="bg-gray-900/50 rounded p-2">
                  <div className="text-gray-400 mb-1">Configuration</div>
                  <div className="text-white">
                    <div>Lookback: <span className="text-blue-400 font-bold">{channelLookback}</span> periods</div>
                    <div>Std Dev: <span className="text-red-400 font-bold">{channelStdDevMultiplier.toFixed(1)}σ</span></div>
                    <div>Source: <span className="text-green-400 font-bold">{channelSource.toUpperCase()}</span></div>
                  </div>
                </div>

                <div className="bg-gray-900/50 rounded p-2">
                  <div className="text-gray-400 mb-1">Volume Profile</div>
                  <div className="text-white">
                    <div>Bins: <span className="text-purple-400 font-bold">{channelVolumeBins}</span></div>
                    <div>POC: <span className="text-yellow-400 font-bold">${volumeProfile.poc.priceLevel.toFixed(2)}</span></div>
                    <div>HVNs: <span className="text-purple-400 font-bold">{volumeProfile.hvns.length}</span> zones</div>
                  </div>
                </div>
              </div>

            {/* Legend Explanation */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-16 h-0.5" style={{borderTop: '2px dashed #ef4444'}}></div>
                <div className="text-red-400 font-bold">Upper Bound</div>
                <div className="text-gray-400 text-[10px]">(Resistance - Center + {channelStdDevMultiplier.toFixed(1)}σ)</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-16 h-0.5" style={{borderTop: '2px dashed #8b5cf6'}}></div>
                <div className="text-purple-400 font-bold">Center Line</div>
                <div className="text-gray-400 text-[10px]">(Linear Regression Trend)</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-16 h-0.5" style={{borderTop: '2px dashed #10b981'}}></div>
                <div className="text-green-400 font-bold">Lower Bound</div>
                <div className="text-gray-400 text-[10px]">(Support - Center - {channelStdDevMultiplier.toFixed(1)}σ)</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-16 h-0.5 bg-yellow-500" style={{borderTop: '2px dashed #FBBF24'}}></div>
                <div className="text-yellow-400 font-bold">POC</div>
                <div className="text-gray-400 text-[10px]">(Point of Control - Highest Volume Price)</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-16 h-0.5 bg-purple-400" style={{borderTop: '2px dashed #c084fc', opacity: 0.6}}></div>
                <div className="text-purple-300 font-bold">HVN</div>
                <div className="text-gray-400 text-[10px]">(High Volume Nodes - Strong Price Levels)</div>
              </div>
            </div>

            {/* How to Read */}
            <div className="mt-3 pt-3 border-t border-gray-700">
              <div className="text-xs font-semibold text-cyan-400 mb-2">💡 How to Read:</div>
              <div className="space-y-1 text-[10px] text-gray-300">
                <div>• <span className="text-purple-400 font-semibold">Center Line:</span> Shows the dominant price trend direction based on linear regression</div>
                <div>• <span className="text-red-400 font-semibold">Upper/Lower Bounds:</span> Statistical boundaries ({channelStdDevMultiplier.toFixed(1)} standard deviations) where price is likely to stay within</div>
                <div>• <span className="text-yellow-400 font-semibold">POC & HVNs:</span> Price levels with high trading volume indicate strong support/resistance zones</div>
                <div>• <span className="text-green-400 font-semibold">Trading Signal:</span> When price touches a bound near POC/HVN, it&apos;s a stronger support/resistance level</div>
                <div>• <span className="text-orange-400 font-semibold">Breakout Signal:</span> Price breaking through a bound suggests potential trend change</div>
              </div>
            </div>

            <div className="text-[10px] text-gray-500 italic mt-3 text-center">
              The channel dynamically adjusts based on the last {channelLookback} periods of price action
            </div>
            </div>
          </div>
        );
      })()}

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
