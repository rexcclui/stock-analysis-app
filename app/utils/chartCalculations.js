/**
 * Chart Calculation Utilities
 *
 * This module contains all the technical indicator calculations and helper functions
 * for the PricePerformanceChart component.
 *
 * @module chartCalculations
 */

/**
 * Get the number of days for a given chart period
 * @param {string} period - Chart period (e.g., '1D', '7D', '1M', etc.)
 * @returns {number} Number of days in the period
 */
export const getPeriodDays = (period) => {
  const periodMap = {
    '1D': 1,
    '7D': 7,
    '1M': 30,
    '3M': 90,
    '6M': 180,
    '1Y': 252,
    '3Y': 756,
    '5Y': 1260
  };
  return periodMap[period] || 30;
};

/**
 * Get the N value for RVI calculation based on chart period
 * @param {string} period - Chart period
 * @returns {number} N value for RVI calculation
 */
export const getRviN = (period) => {
  const nMap = {
    '1D': 1,
    '7D': 2,
    '1M': 3,
    '3M': 5,
    '6M': 6,
    '1Y': 7,
    '3Y': 10,
    '5Y': 20
  };
  return nMap[period] || 5;
};

/**
 * Get SMA period for touch detection based on chart period
 * @param {string} period - Chart period
 * @returns {number} SMA period for touch detection
 */
export const getSmaPeriodForTouchDetection = (period) => {
  const smaMap = {
    '7D': 1,
    '1M': 3,
    '3M': 5,
    '6M': 10,
    '1Y': 14,
    '3Y': 20,
    '5Y': 30
  };
  return smaMap[period] || 3;
};

/**
 * Calculate 3-day moving average for price data
 * @param {Array} data - Array of price data points
 * @returns {Array} Data with ma3 property added
 */
export const calculate3DayMA = (data) => {
  if (!data || data.length === 0) return [];

  return data.map((point, idx) => {
    if (idx < 2) {
      return { ...point, ma3: point.price };
    }

    const sum = data.slice(idx - 2, idx + 1).reduce((acc, d) => acc + (d.price || 0), 0);
    const ma3 = sum / 3;

    return { ...point, ma3 };
  });
};

/**
 * Calculate RVI (Relative Volume Index) for each data point
 * @param {Array} data - Array of price data points
 * @param {string} period - Chart period
 * @returns {Array} Data with rvi property added
 */
export const calculateRVI = (data, period) => {
  if (!data || data.length === 0) return data;

  const N = getRviN(period);
  const longWindow = N * 5;

  return data.map((point, idx) => {
    if (idx < longWindow - 1) {
      return { ...point, rvi: 1 };
    }

    const shortWindowData = data.slice(Math.max(0, idx - N + 1), idx + 1);
    const shortAvg = shortWindowData.reduce((sum, d) => sum + (d.volume || 0), 0) / shortWindowData.length;

    const longWindowData = data.slice(Math.max(0, idx - longWindow + 1), idx + 1);
    const longAvg = longWindowData.reduce((sum, d) => sum + (d.volume || 0), 0) / longWindowData.length;

    const rvi = longAvg > 0 ? shortAvg / longAvg : 1;

    return { ...point, rvi };
  });
};

/**
 * Calculate VSPY (Relative Performance vs SPY on 3-day MA)
 * @param {Array} data - Stock price data
 * @param {string} period - Chart period
 * @param {Array} spyHistoricalData - SPY historical data
 * @returns {Array} Data with vspy property added
 */
export const calculateVSPY = (data, period, spyHistoricalData) => {
  if (!data || data.length === 0 || !spyHistoricalData || spyHistoricalData.length === 0) {
    return data.map(point => ({ ...point, vspy: 1 }));
  }

  const N = getRviN(period);
  const stockWithMA = calculate3DayMA(data);
  const spyWithMA = calculate3DayMA(spyHistoricalData);

  const spyMap = new Map();
  spyWithMA.forEach(point => {
    const dateKey = new Date(point.date).toISOString().split('T')[0];
    spyMap.set(dateKey, point);
  });

  return stockWithMA.map((point, idx) => {
    if (idx < N) {
      return { ...point, vspy: 1 };
    }

    const currentDate = new Date(point.date).toISOString().split('T')[0];
    const nDaysAgoDate = new Date(data[idx - N].date).toISOString().split('T')[0];

    const currentStockMA = point.ma3;
    const nDaysAgoStockMA = stockWithMA[idx - N].ma3;

    const stockPerformance = nDaysAgoStockMA > 0
      ? ((currentStockMA - nDaysAgoStockMA) / nDaysAgoStockMA)
      : 0;

    const currentSpyPoint = spyMap.get(currentDate);
    const nDaysAgoSpyPoint = spyMap.get(nDaysAgoDate);

    if (!currentSpyPoint || !nDaysAgoSpyPoint) {
      return { ...point, vspy: 1 };
    }

    const spyPerformance = nDaysAgoSpyPoint.ma3 > 0
      ? ((currentSpyPoint.ma3 - nDaysAgoSpyPoint.ma3) / nDaysAgoSpyPoint.ma3)
      : 0;

    let vspy = 1;
    if (Math.abs(spyPerformance) > 0.0001) {
      vspy = stockPerformance / spyPerformance;
      vspy = Math.max(-5, Math.min(10, vspy));
    } else if (stockPerformance > 0.01) {
      vspy = 3;
    } else if (stockPerformance < -0.01) {
      vspy = 0.3;
    }

    return { ...point, vspy };
  });
};

/**
 * Calculate SMA (Simple Moving Average) for price data
 * @param {Array} data - Price data
 * @param {number} period - SMA period
 * @returns {Array} Data with sma and smaSlope properties
 */
export const calculateSMA = (data, period) => {
  if (!data || data.length === 0) return data;

  return data.map((point, idx) => {
    if (idx < period - 1) {
      return { ...point, sma: null, smaSlope: null };
    }

    const windowData = data.slice(idx - period + 1, idx + 1);
    const sma = windowData.reduce((sum, d) => sum + (d.price || 0), 0) / period;

    let smaSlope = null;
    if (idx >= period) {
      const prevWindowData = data.slice(idx - period, idx);
      const prevSma = prevWindowData.reduce((sum, d) => sum + (d.price || 0), 0) / period;
      smaSlope = sma - prevSma;
    }

    return { ...point, sma, smaSlope };
  });
};

/**
 * Calculate Linear Regression for trend line
 * @param {Array} data - Price data
 * @param {number} period - Lookback period
 * @param {string} priceSource - Price source ('close', 'hl2', 'ohlc4')
 * @returns {Object|null} Object with slope, intercept, and n properties
 */
export const calculateLinearRegression = (data, period, priceSource = 'close') => {
  if (!data || data.length < period) return null;

  const lookbackData = data.slice(-period);
  const n = lookbackData.length;

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

/**
 * Build configurable trend channel with linear regression
 * @param {Array} data - Price data
 * @param {number} lookback - Lookback period
 * @param {number} stdMult - Standard deviation multiplier
 * @param {Object} options - Additional options (interceptShift, endAt)
 * @param {number} channelBands - Number of channel bands for visualization
 * @returns {Array} Data with trend channel properties
 */
export const buildConfigurableTrendChannel = (data, lookback, stdMult, options = {}, channelBands = 6) => {
  if (!data || data.length < 2) return data;
  const { interceptShift = 0, endAt = 0 } = options;

  const effectiveEndIndex = data.length - endAt;
  const slice = lookback && lookback < data.length ? data.slice(-lookback) : data;
  const n = slice.length;
  if (n < 2) return data;

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
  const startIndex = data.length - n;

  return data.map((pt, idx) => {
    if (idx < startIndex || idx >= effectiveEndIndex) {
      return { ...pt, trendLine: null, trendUpper: null, trendLower: null };
    }

    const localX = idx - startIndex;
    const center = slope * localX + intercept;
    const upper = center + stdMult * stdDev;
    const lower = center - stdMult * stdDev;

    // Add partition band levels
    const extras = {};
    for (let b = 1; b < channelBands; b++) {
      const frac = b / channelBands;
      extras[`trendBand_${b}`] = lower + (upper - lower) * frac;
    }

    return {
      ...pt,
      trendLine: center,
      trendUpper: upper,
      trendLower: lower,
      ...extras
    };
  });
};

/**
 * Calculate Standard Deviation Channel
 * @param {Array} data - Price data
 * @param {number} period - Lookback period
 * @param {number} stdDevMultiplier - Standard deviation multiplier
 * @param {string} priceSource - Price source ('close', 'hl2', 'ohlc4')
 * @param {number} channelBands - Number of channel bands
 * @returns {Array} Data with channel properties
 */
export const calculateStdDevChannel = (data, period, stdDevMultiplier, priceSource = 'close', channelBands = 10) => {
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

    const windowData = data.slice(idx - period + 1, idx + 1);
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

    const centerLine = regression.slope * (period - 1) + regression.intercept;

    let sumSquaredDiff = 0;
    windowData.forEach((p, i) => {
      const regressionValue = regression.slope * i + regression.intercept;
      const price = p.price || 0;
      const diff = price - regressionValue;
      sumSquaredDiff += diff * diff;
    });

    const stdDev = Math.sqrt(sumSquaredDiff / period);
    const upperBound = centerLine + (stdDev * stdDevMultiplier);
    const lowerBound = centerLine - (stdDev * stdDevMultiplier);

    // Add partition band levels using volume quantiles across windowData
    // Goal: approximate equal volume per zone (deciles with channelBands=10).
    const extras = {};
    try {
      const volPoints = windowData
        .map(p => ({ price: p.price ?? p.close ?? p.open, volume: p.volume || 0 }))
        .filter(p => p.price != null && p.volume > 0);
      if (volPoints.length >= channelBands) {
        // Sort by price ascending
        volPoints.sort((a,b)=> a.price - b.price);
        const totalVol = volPoints.reduce((sum,v)=> sum + v.volume, 0);
        if (totalVol > 0) {
          const targets = Array.from({length: channelBands - 1}, (_,i)=> (i+1)/channelBands); // e.g. 0.1 .. 0.9
          const quantilePrices = [];
          let cum = 0;
          let ti = 0;
          for (let i=0;i<volPoints.length && ti < targets.length;i++) {
            cum += volPoints[i].volume;
            const ratio = cum / totalVol;
            while (ti < targets.length && ratio >= targets[ti]) {
              quantilePrices.push(volPoints[i].price);
              ti++;
            }
          }
          // Fallback if some quantiles missing
          while (quantilePrices.length < channelBands - 1) {
            const missingIndex = quantilePrices.length + 1;
            const frac = missingIndex / channelBands;
            quantilePrices.push(lowerBound + (upperBound - lowerBound) * frac);
          }
          // Assign band levels (ensure within channel bounds)
            quantilePrices.forEach((qp, idx) => {
              const clamped = Math.min(Math.max(qp, lowerBound), upperBound);
              extras[`channelBand_${idx+1}`] = clamped;
            });
        } else {
          // No volume -> fall back to even spacing
          for (let b = 1; b < channelBands; b++) {
            const frac = b / channelBands;
            extras[`channelBand_${b}`] = lowerBound + (upperBound - lowerBound) * frac;
          }
        }
      } else {
        // Not enough points -> even spacing
        for (let b = 1; b < channelBands; b++) {
          const frac = b / channelBands;
          extras[`channelBand_${b}`] = lowerBound + (upperBound - lowerBound) * frac;
        }
      }
    } catch (e) {
      // Safety fallback
      for (let b = 1; b < channelBands; b++) {
        const frac = b / channelBands;
        extras[`channelBand_${b}`] = lowerBound + (upperBound - lowerBound) * frac;
      }
    }

    return {
      ...point,
      centerLine,
      upperBound,
      lowerBound,
      stdDev,
      ...extras
    };
  });
};

/**
 * Format date for chart display based on period
 * @param {string} dateStr - Date string
 * @param {string} period - Chart period
 * @returns {string} Formatted date string
 */
export const formatChartDate = (dateStr, period) => {
  const d = new Date(dateStr);
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
};

/**
 * Map RVI value to color
 * @param {number} rvi - RVI value
 * @returns {string} Hex color code
 */
export const getRviColor = (rvi) => {
  if (rvi < 0.5) return '#DBEAFE';
  if (rvi < 0.7) return '#BFDBFE';
  if (rvi < 0.85) return '#93C5FD';
  if (rvi < 1.0) return '#60A5FA';
  if (rvi < 1.15) return '#3B82F6';
  if (rvi < 1.3) return '#2563EB';
  if (rvi < 1.5) return '#1D4ED8';
  if (rvi < 1.8) return '#1E40AF';
  if (rvi < 2.2) return '#1E3A8A';
  if (rvi < 2.8) return '#172554';
  if (rvi < 3.0) return '#312E81';
  if (rvi < 4.0) return '#6B21A8';
  return '#BE185D';
};

/**
 * Map VSPY value to color
 * @param {number} vspy - VSPY value
 * @returns {string} Hex color code
 */
export const getVspyColor = (vspy) => {
  if (vspy < 0.3) return '#DC2626';
  if (vspy < 0.4) return '#EF4444';
  if (vspy < 0.5) return '#F87171';
  if (vspy < 0.6) return '#FB923C';
  if (vspy < 0.7) return '#FBBF24';
  if (vspy < 0.8) return '#FCD34D';
  if (vspy < 0.85) return '#DBEAFE';
  if (vspy < 0.9) return '#BFDBFE';
  if (vspy < 0.95) return '#93C5FD';
  if (vspy < 1.0) return '#60A5FA';
  if (vspy < 1.05) return '#3B82F6';
  if (vspy < 1.1) return '#2563EB';
  if (vspy < 1.2) return '#1D4ED8';
  if (vspy < 1.3) return '#1E40AF';
  if (vspy < 1.5) return '#1E3A8A';
  if (vspy < 1.8) return '#312E81';
  if (vspy < 2.0) return '#4C1D95';
  if (vspy < 2.5) return '#7C3AED';
  if (vspy < 3.0) return '#A855F7';
  if (vspy < 4.0) return '#C026D3';
  return '#10B981';
};

/**
 * Get color index value based on color mode
 * @param {Object} point - Data point
 * @param {string} mode - Color mode ('rvi', 'vspy', etc.)
 * @returns {number} Color index value
 */
export const getColorIndexValue = (point, mode) => {
  if (mode === 'rvi') return point.rvi || 1;
  if (mode === 'vspy') return point.vspy || 1;
  return 1;
};

/**
 * Add RVI/VSPY-based data keys for colored segments
 * @param {Array} data - Price data
 * @param {string} mode - Color mode ('rvi' or 'vspy')
 * @returns {Object} Object with enhanced data, colorMap, and maxSegmentId
 */
export const addRviDataKeys = (data, mode = 'rvi') => {
  if (!data || data.length === 0) return data;

  const getColor = mode === 'vspy' ? getVspyColor : getRviColor;

  let segmentId = 0;
  let currentColor = getColor(getColorIndexValue(data[0], mode));
  const colorMap = {};
  colorMap[0] = currentColor;

  const dataWithSegments = data.map((point, idx) => {
    const pointColor = getColor(getColorIndexValue(point, mode));
    const newPoint = { ...point };

    if (pointColor !== currentColor && idx > 0) {
      newPoint[`price_seg_${segmentId}`] = point.price;
      segmentId++;
      currentColor = pointColor;
      colorMap[segmentId] = currentColor;
      newPoint[`price_seg_${segmentId}`] = point.price;
    } else {
      newPoint[`price_seg_${segmentId}`] = point.price;
    }

    return newPoint;
  });

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

/**
 * Get color for volume bar based on intensity
 * @param {number} intensity - Volume intensity (0-1)
 * @returns {string} RGBA color string
 */
export const getVolumeBarColor = (intensity) => {
  const opacity = 0.15 + intensity * 0.35;
  return `rgba(59, 130, 246, ${opacity})`;
};

/**
 * Get color for channel band based on ratio and volume with gradient
 * @param {number} ratio - Position ratio within channel (0-1)
 * @param {number} volumePercentage - Volume percentage at this level
 * @returns {string} RGBA color string
 */
export const getChannelBandColor = (ratio, volumePercentage = 0) => {
  if (isNaN(ratio)) return 'rgba(255,255,255,0.05)';
  const r = Math.max(0, Math.min(1, ratio));

  // Gradient: emerald → teal → blue → purple → pink → red
  const anchors = [
    { r: 16,  g:185, b:129 }, // emerald
    { r: 20,  g:184, b:166 }, // teal
    { r: 59,  g:130, b:246 }, // blue
    { r:139,  g:92,  b:246 }, // purple
    { r:236,  g:72,  b:153 }, // pink
    { r:239,  g:68,  b:68  }  // red
  ];

  const segCount = anchors.length - 1;
  const scaled = r * segCount;
  const i = Math.min(segCount - 1, Math.floor(scaled));
  const t = scaled - i;
  const a = anchors[i];
  const b = anchors[i + 1];
  const rr = Math.round(a.r + (b.r - a.r) * t);
  const gg = Math.round(a.g + (b.g - a.g) * t);
  const bb = Math.round(a.b + (b.b - a.b) * t);

  let alpha = 0.15;
  if (volumePercentage > 0) {
    const normalizedVolume = Math.min(volumePercentage / 30, 1);
    alpha = 0.05 + (normalizedVolume * 0.60);
  }

  return `rgba(${rr}, ${gg}, ${bb}, ${alpha.toFixed(3)})`;
};

/**
 * Calculate Volume Profile (Volume at Price)
 * @param {Array} data - Price data
 * @param {number} numBins - Number of price bins
 * @returns {Object|null} Volume profile object with bins, POC, HVNs, and LVNs
 */
export const calculateVolumeProfile = (data, numBins = 70) => {
  if (!data || data.length === 0) return null;

  const prices = data.map(d => d.price || 0);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;

  if (priceRange === 0) return null;

  const binSize = priceRange / numBins;

  const bins = Array(numBins).fill(0).map((_, i) => ({
    priceLevel: minPrice + (i + 0.5) * binSize,
    priceMin: minPrice + i * binSize,
    priceMax: minPrice + (i + 1) * binSize,
    volume: 0
  }));

  data.forEach(point => {
    const price = point.price || 0;
    const volume = point.volume || 0;
    const binIndex = Math.min(
      Math.floor((price - minPrice) / binSize),
      numBins - 1
    );

    if (binIndex >= 0 && binIndex < numBins) {
      bins[binIndex].volume += volume;
    }
  });

  const volumes = bins.map(b => b.volume);
  const totalVolume = volumes.reduce((sum, v) => sum + v, 0);
  const avgVolume = totalVolume / numBins;
  const stdDevVolume = Math.sqrt(
    volumes.reduce((sum, v) => sum + Math.pow(v - avgVolume, 2), 0) / numBins
  );

  const pocBin = bins.reduce((max, bin) =>
    bin.volume > max.volume ? bin : max, bins[0]
  );

  const hvnThreshold = avgVolume + stdDevVolume;
  const hvns = bins.filter(bin => bin.volume > hvnThreshold);

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

/**
 * Analyze confluence between channel bounds and volume profile
 * @param {Array} channelData - Data with channel bounds
 * @param {Object} volumeProfile - Volume profile object
 * @param {number} proximityThreshold - Proximity threshold (default: 0.02 = 2%)
 * @returns {Array} Channel data with confluence states
 */
export const analyzeChannelConfluence = (channelData, volumeProfile, proximityThreshold = 0.02) => {
  if (!channelData || !volumeProfile) return channelData;

  return channelData.map(point => {
    if (!point.upperBound || !point.lowerBound) {
      return {
        ...point,
        upperBoundState: 'neutral',
        lowerBoundState: 'neutral'
      };
    }

    let upperBoundState = 'neutral';
    const upperPrice = point.upperBound;
    const upperThreshold = upperPrice * proximityThreshold;

    if (Math.abs(upperPrice - volumeProfile.poc.priceLevel) < upperThreshold) {
      upperBoundState = 'strong';
    } else {
      for (const hvn of volumeProfile.hvns) {
        if (Math.abs(upperPrice - hvn.priceLevel) < upperThreshold) {
          upperBoundState = 'strong';
          break;
        }
      }

      if (upperBoundState === 'neutral') {
        for (const lvn of volumeProfile.lvns) {
          if (Math.abs(upperPrice - lvn.priceLevel) < upperThreshold) {
            upperBoundState = 'weak';
            break;
          }
        }
      }
    }

    let lowerBoundState = 'neutral';
    const lowerPrice = point.lowerBound;
    const lowerThreshold = lowerPrice * proximityThreshold;

    if (Math.abs(lowerPrice - volumeProfile.poc.priceLevel) < lowerThreshold) {
      lowerBoundState = 'strong';
    } else {
      for (const hvn of volumeProfile.hvns) {
        if (Math.abs(lowerPrice - hvn.priceLevel) < lowerThreshold) {
          lowerBoundState = 'strong';
          break;
        }
      }

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

/**
 * Calculate volume distribution across channel zones
 * @param {Array} data - Price data
 * @param {string} channelType - Channel type ('channel' or 'trend')
 * @param {number} channelBands - Number of channel bands
 * @returns {Object} Object mapping zone index to volume percentage
 */
export const calculateZoneVolumeDistribution = (data, channelType = 'channel', channelBands = 10) => {
  if (!data || data.length === 0) return {};

  const zoneVolumes = {};
  let totalVolume = 0;

  data.forEach(pt => {
    const price = pt.price || pt.close;
    const volume = pt.volume || 0;

    if (!price || !volume) return;

    const lowerBound = channelType === 'trend' ? pt.trendLower : pt.lowerBound;
    const upperBound = channelType === 'trend' ? pt.trendUpper : pt.upperBound;

    if (lowerBound == null || upperBound == null) return;

    // Build band boundary array for this point
    const bandKeys = [];
    for (let b=1;b<channelBands;b++) bandKeys.push(channelType === 'trend' ? `trendBand_${b}` : `channelBand_${b}`);
    const boundaries = [lowerBound, ...bandKeys.map(k => pt[k]).filter(v => v!=null), upperBound];
    if (boundaries.length !== channelBands + 1) {
      // Fallback to uniform division if some boundaries missing
      const channelRange = upperBound - lowerBound;
      if (channelRange <= 0) return;
      const pricePosition = (price - lowerBound) / channelRange;
      let zoneIndex = Math.floor(pricePosition * channelBands);
      zoneIndex = Math.max(0, Math.min(channelBands - 1, zoneIndex));
      if (!zoneVolumes[zoneIndex]) zoneVolumes[zoneIndex] = 0;
      zoneVolumes[zoneIndex] += volume;
      totalVolume += volume;
      return;
    }
    // Determine zone by boundary search
    let zoneIndex = -1;
    for (let z=0; z<channelBands; z++) {
      const low = boundaries[z];
      const high = boundaries[z+1];
      if (price >= low && price <= high) { zoneIndex = z; break; }
    }
    if (zoneIndex === -1) return; // price outside
    if (!zoneVolumes[zoneIndex]) zoneVolumes[zoneIndex] = 0;
    zoneVolumes[zoneIndex] += volume;
    totalVolume += volume;

    if (!zoneVolumes[zoneIndex]) {
      zoneVolumes[zoneIndex] = 0;
    }
    zoneVolumes[zoneIndex] += volume;
    totalVolume += volume;
  });

  const zoneVolumePercentages = {};
  Object.keys(zoneVolumes).forEach(zoneIndex => {
    zoneVolumePercentages[zoneIndex] = totalVolume > 0
      ? (zoneVolumes[zoneIndex] / totalVolume) * 100
      : 0;
  });

  return zoneVolumePercentages;
};

/**
 * Calculate Volume Bar data for horizontal background zones
 * @param {Array} data - Price data
 * @param {number} numSlots - Number of price slots (default: 20)
 * @returns {Array} Volume bar data
 */
export const calculateVolumeBarData = (data, numSlots = 20) => {
  if (!data || data.length === 0) return [];

  const prices = data.map(d => d.price).filter(p => p != null);
  if (prices.length === 0) return [];

  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;

  if (priceRange === 0) return [];

  const slotSize = priceRange / numSlots;
  const slots = Array(numSlots).fill(0).map((_, i) => ({
    priceLevel: minPrice + (i + 0.5) * slotSize,
    priceMin: minPrice + i * slotSize,
    priceMax: minPrice + (i + 1) * slotSize,
    volume: 0
  }));

  data.forEach(point => {
    const price = point.price;
    const volume = point.volume || 0;
    if (price == null) return;

    const slotIndex = Math.min(
      Math.floor((price - minPrice) / slotSize),
      numSlots - 1
    );

    if (slotIndex >= 0 && slotIndex < numSlots) {
      slots[slotIndex].volume += volume;
    }
  });

  const maxVolume = Math.max(...slots.map(s => s.volume));
  if (maxVolume === 0) return [];

  return slots.map(slot => ({
    ...slot,
    intensity: slot.volume / maxVolume
  }));
};

/**
 * Compute optimal trend channel parameters ensuring both bounds touch price extremes
 * @param {Array} data - Price data
 * @param {number} lookback - Lookback period
 * @param {number} endAt - End offset from last data point
 * @param {string} chartPeriod - Chart period for dynamic SMA period selection
 * @returns {Object|null} Alignment parameters including interceptShift, optimalDelta, and touch information
 */
export const computeTrendChannelTouchAlignment = (data, lookback, endAt = 0, chartPeriod = '3M') => {
  if (!data || data.length < 2) return null;

  const smaPeriod = getSmaPeriodForTouchDetection(chartPeriod);
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

  // Apply dynamic SMA for smoothing
  const smaPrices = slice.map((pt, i) => {
    if (smaPeriod === 1) return pt.price || 0;
    if (i < smaPeriod - 1) return pt.price || 0;

    let sum = 0;
    for (let j = 0; j < smaPeriod; j++) {
      sum += (slice[i - j].price || 0);
    }
    return sum / smaPeriod;
  });

  const smaResiduals = smaPrices.map((price, i) => {
    const model = slope * i + baseIntercept;
    return price - model;
  });

  const smaMaxResidual = Math.max(...smaResiduals);
  const smaMinResidual = Math.min(...smaResiduals);
  const smaInterceptShift = (smaMaxResidual + smaMinResidual) / 2;
  const smaAdjustedResiduals = smaResiduals.map(diff => diff - smaInterceptShift);

  // Detect turning points
  const turningPoints = [];
  for (let i = 1; i < n; i++) {
    const prev = smaAdjustedResiduals[i - 1];
    const curr = smaAdjustedResiduals[i];

    if ((prev < 0 && curr >= 0) || (prev > 0 && curr <= 0) || (prev === 0 && curr !== 0)) {
      turningPoints.push({
        index: i,
        residual: adjustedResiduals[i],
        direction: curr >= 0 ? 'up' : 'down'
      });
    }
  }

  let touchesUpper = false;
  let touchesLower = false;
  let touchesUpperBoundary = false;
  let touchesLowerBoundary = false;

  if (extremeMagnitude === 0) {
    touchesUpper = touchesLower = touchesUpperBoundary = touchesLowerBoundary = true;
  } else {
    turningPoints.forEach(tp => {
      const isBoundaryIndex = tp.index < boundaryWindow || tp.index >= n - boundaryWindow;

      if (Math.abs(tp.residual - extremeMagnitude) <= tolerance) {
        touchesUpper = true;
        if (isBoundaryIndex) touchesUpperBoundary = true;
      }

      if (Math.abs(tp.residual + extremeMagnitude) <= tolerance) {
        touchesLower = true;
        if (isBoundaryIndex) touchesLowerBoundary = true;
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

/**
 * Find multiple non-overlapping channels in the data series
 * @param {Array} data - Price data with date and price properties
 * @param {number} minRatio - Minimum ratio of data points per channel (e.g., 0.05 for 1/20)
 * @param {number} maxRatio - Maximum ratio of data points per channel (e.g., 0.5 for 1/2)
 * @param {number} stdMultiplier - Standard deviation multiplier for channel width
 * @param {string} chartPeriod - Chart period for dynamic SMA period selection
 * @returns {Array} Array of channel objects with start/end indices and channel parameters
 */
export const findMultipleChannels = (data, minRatio = 0.05, maxRatio = 0.5, stdMultiplier = 2, chartPeriod = '3M') => {
  if (!data || data.length === 0) return [];

  const totalPoints = data.length;
  const minPoints = Math.max(10, Math.floor(totalPoints * minRatio));
  const maxPoints = Math.floor(totalPoints * maxRatio);

  const channels = [];
  const usedIndices = new Set();

  // Helper function to find best channel in a given range
  const findBestChannelInRange = (startIdx, endIdx) => {
    const rangeLength = endIdx - startIdx + 1;
    if (rangeLength < minPoints) return null;

    let bestChannel = null;
    let bestScore = -Infinity;

    // Try different lookback periods within the range
    const minLookback = Math.min(minPoints, rangeLength);
    const maxLookback = Math.min(maxPoints, rangeLength);
    const lookbackStep = Math.max(1, Math.floor((maxLookback - minLookback) / 20));

    for (let lookback = minLookback; lookback <= maxLookback; lookback += lookbackStep) {
      // Try different positions within the range
      const maxStartPos = Math.max(0, endIdx - lookback + 1);
      const posStep = Math.max(1, Math.floor((maxStartPos - startIdx) / 10));

      for (let pos = startIdx; pos <= maxStartPos; pos += posStep) {
        const channelEnd = Math.min(pos + lookback, endIdx + 1);
        const slice = data.slice(pos, channelEnd);

        if (slice.length < minPoints) continue;

        // Check if too many points are already used (allow up to 50% overlap)
        const usedCount = slice.filter((_, idx) => usedIndices.has(pos + idx)).length;
        if (usedCount > slice.length * 0.5) continue; // Skip if >50% already used

        // Calculate linear regression
        const n = slice.length;
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
        if (denom === 0) continue;

        const slope = (n * sumXY - sumX * sumY) / denom;
        const intercept = (sumY - slope * sumX) / n;

        // Calculate residuals and std dev
        const residuals = slice.map((pt, i) => (pt.price || 0) - (slope * i + intercept));
        const mean = residuals.reduce((sum, r) => sum + r, 0) / n;
        const variance = residuals.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / n;
        const stdDev = Math.sqrt(variance);

        if (stdDev === 0) continue;

        // Optimize stdMultiplier for this channel
        // Test different multiplier values to find the best fit
        let bestMultiplier = stdMultiplier; // Start with default
        let bestMultiplierScore = -Infinity;
        let bestMultiplierData = null;

        // Test multipliers from 1.0 to 4.0 in steps of 0.5
        for (let testMultiplier = 1.0; testMultiplier <= 4.0; testMultiplier += 0.5) {
          // Calculate channel bounds with this multiplier
          const upper = slice.map((_, i) => slope * i + intercept + testMultiplier * stdDev);
          const lower = slice.map((_, i) => slope * i + intercept - testMultiplier * stdDev);

          // Count points within channel
          let pointsInChannel = 0;
          let touchesUpper = false;
          let touchesLower = false;
          const tolerance = stdDev * 0.1;

          // Count points within ±20% of center line
          let pointsNearCenter = 0;

          slice.forEach((pt, i) => {
            const price = pt.price || 0;
            const center = slope * i + intercept;

            if (price >= lower[i] - tolerance && price <= upper[i] + tolerance) {
              pointsInChannel++;
            }
            if (Math.abs(price - upper[i]) <= tolerance) touchesUpper = true;
            if (Math.abs(price - lower[i]) <= tolerance) touchesLower = true;

            // Check if price is within ±20% of center line
            const centerTolerance = Math.abs(center) * 0.20;
            if (Math.abs(price - center) <= centerTolerance) {
              pointsNearCenter++;
            }
          });

          const coverage = pointsInChannel / n;
          const centerProximity = pointsNearCenter / n;

          // Reject if center proximity is too low
          if (centerProximity < 0.70) continue;

          // Score this multiplier configuration
          // Prefer configurations that:
          // 1. Have high coverage (most points within bounds)
          // 2. Touch both bounds (confirming price action tests the limits)
          // 3. Are not too wide (penalize excessively large multipliers)
          const touchBonus = (touchesUpper && touchesLower) ? 1.5 : (touchesUpper || touchesLower) ? 1.2 : 1.0;
          const relativeFit = 1 / (1 + stdDev / (intercept || 1));
          const lengthBonus = Math.log(n) / Math.log(totalPoints);
          const centerBonus = centerProximity;
          // Penalize very large multipliers (prefer tighter channels)
          const widthPenalty = 1 / (1 + testMultiplier / 4.0);
          const multiplierScore = coverage * touchBonus * relativeFit * lengthBonus * centerBonus * widthPenalty;

          if (multiplierScore > bestMultiplierScore) {
            bestMultiplierScore = multiplierScore;
            bestMultiplier = testMultiplier;
            bestMultiplierData = {
              coverage,
              centerProximity,
              touchesUpper,
              touchesLower,
              upper,
              lower
            };
          }
        }

        // Skip if no valid multiplier was found
        if (!bestMultiplierData) continue;

        // Filter: Check for excessive stdDev deviation at start/end of channel
        // This helps ensure the channel boundaries capture the true trend
        const boundaryCheckSize = Math.max(3, Math.floor(n * 0.1)); // Check 10% of data at each end (min 3 points)

        // Calculate average absolute residual at start
        const startResiduals = residuals.slice(0, boundaryCheckSize);
        const startAvgDeviation = startResiduals.reduce((sum, r) => sum + Math.abs(r), 0) / startResiduals.length;

        // Calculate average absolute residual at end
        const endResiduals = residuals.slice(-boundaryCheckSize);
        const endAvgDeviation = endResiduals.reduce((sum, r) => sum + Math.abs(r), 0) / endResiduals.length;

        // Calculate average absolute residual for entire channel
        const totalAvgDeviation = residuals.reduce((sum, r) => sum + Math.abs(r), 0) / n;

        // Reject if start or end deviation is more than 1.5x the average
        // This indicates the channel doesn't fit well at the boundaries
        const deviationThreshold = 1.5;
        if (startAvgDeviation > totalAvgDeviation * deviationThreshold ||
            endAvgDeviation > totalAvgDeviation * deviationThreshold) {
          continue; // Skip this channel candidate
        }

        // Use the best multiplier score as the channel score
        const score = bestMultiplierScore;

        if (score > bestScore) {
          bestScore = score;

          // Create intermediate bands (10 bands total, like standard channel mode)
          const BANDS = 10;
          const channelRange = bestMultiplier * stdDev * 2; // Total range from lower to upper

          bestChannel = {
            startIdx: pos,
            endIdx: channelEnd - 1,
            lookback: slice.length,
            slope,
            intercept,
            stdDev,
            stdMultiplier: bestMultiplier, // Store the optimized multiplier
            coverage: bestMultiplierData.coverage,
            centerProximity: bestMultiplierData.centerProximity,
            touchesUpper: bestMultiplierData.touchesUpper,
            touchesLower: bestMultiplierData.touchesLower,
            score,
            data: slice.map((pt, i) => {
              const center = slope * i + intercept;
              const upper = center + bestMultiplier * stdDev;
              const lower = center - bestMultiplier * stdDev;

              // Create intermediate bands
              const bands = {};
              for (let b = 1; b < BANDS; b++) {
                const ratio = b / BANDS;
                bands[`channelBand_${b}`] = lower + ratio * channelRange;
              }

              return {
                ...pt,
                channelUpper: upper,
                channelLower: lower,
                channelCenter: center,
                ...bands
              };
            })
          };
        }
      }
    }

    return bestChannel;
  };

  // Iteratively find channels until we can't find any more good ones
  const maxChannels = 10; // Limit to prevent infinite loops
  let remainingRanges = [{ start: 0, end: totalPoints - 1 }];

  for (let iteration = 0; iteration < maxChannels && remainingRanges.length > 0; iteration++) {
    let bestChannel = null;
    let bestRangeIdx = -1;

    // Find best channel across all remaining ranges
    remainingRanges.forEach((range, idx) => {
      const channel = findBestChannelInRange(range.start, range.end);
      if (channel && (!bestChannel || channel.score > bestChannel.score)) {
        bestChannel = channel;
        bestRangeIdx = idx;
      }
    });

    // Lower threshold for more channels - be more permissive
    if (!bestChannel || bestChannel.score < 0.15) break; // Stop if no good channel found

    // Add channel to results
    channels.push(bestChannel);

    // Mark indices as used (but allow 20% overlap for flexibility)
    const overlapBuffer = Math.floor(bestChannel.lookback * 0.2);
    for (let i = bestChannel.startIdx + overlapBuffer; i <= bestChannel.endIdx - overlapBuffer; i++) {
      if (i >= 0 && i < totalPoints) {
        usedIndices.add(i);
      }
    }

    // Update remaining ranges by removing the used segment
    const range = remainingRanges[bestRangeIdx];
    const newRanges = [];

    // Add range before channel if it's large enough (relaxed requirement)
    const beforeSize = bestChannel.startIdx - range.start;
    if (beforeSize >= minPoints * 0.8) { // Allow slightly smaller ranges
      newRanges.push({ start: range.start, end: bestChannel.startIdx - 1 });
    }

    // Add range after channel if it's large enough (relaxed requirement)
    const afterSize = range.end - bestChannel.endIdx;
    if (afterSize >= minPoints * 0.8) { // Allow slightly smaller ranges
      newRanges.push({ start: bestChannel.endIdx + 1, end: range.end });
    }

    // Replace the used range with new ranges
    remainingRanges.splice(bestRangeIdx, 1, ...newRanges);
  }

  // Sort channels by start index
  channels.sort((a, b) => a.startIdx - b.startIdx);

  return channels;
};
