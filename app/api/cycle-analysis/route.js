import { NextResponse } from 'next/server';
import { createNoCacheResponse } from '../../../lib/response';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const years = parseInt(searchParams.get('years') || '5');
  const mode = searchParams.get('mode'); // seasonal, peak-trough, ma-crossover, fourier, support-resistance
  const maShort = parseInt(searchParams.get('maShort') || '50');
  const maLong = parseInt(searchParams.get('maLong') || '200');

  if (!symbol) {
    return createNoCacheResponse({ error: 'Symbol required' }, 400);
  }

  if (!mode) {
    return createNoCacheResponse({ error: 'Analysis mode required' }, 400);
  }

  try {
    // Fetch historical data from FMP
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - years);

    const response = await fetch(
      `https://financialmodelingprep.com/api/v3/historical-price-full/${symbol}?from=${startDate.toISOString().split('T')[0]}&to=${endDate.toISOString().split('T')[0]}&apikey=${process.env.FMP_KEY}`
    );

    if (!response.ok) {
      throw new Error(`API returned status ${response.status}`);
    }

    const data = await response.json();
    const historicalData = data.historical || [];

    if (historicalData.length === 0) {
      return createNoCacheResponse({ error: 'No historical data available' }, 404);
    }

    // Sort by date ascending
    historicalData.sort((a, b) => new Date(a.date) - new Date(b.date));

    let result = {};

    switch (mode) {
      case 'seasonal':
        // For seasonal analysis, also fetch SPY and QQQ data for comparison
        const benchmarks = ['SPY', 'QQQ'].filter(b => b !== symbol);
        const benchmarkData = {};

        for (const benchmarkSymbol of benchmarks) {
          try {
            const benchmarkResponse = await fetch(
              `https://financialmodelingprep.com/api/v3/historical-price-full/${benchmarkSymbol}?from=${startDate.toISOString().split('T')[0]}&to=${endDate.toISOString().split('T')[0]}&apikey=${process.env.FMP_KEY}`
            );
            if (benchmarkResponse.ok) {
              const benchmarkJson = await benchmarkResponse.json();
              const benchmarkHistorical = benchmarkJson.historical || [];
              benchmarkHistorical.sort((a, b) => new Date(a.date) - new Date(b.date));
              benchmarkData[benchmarkSymbol] = benchmarkHistorical;
            }
          } catch (err) {
            console.error(`Failed to fetch ${benchmarkSymbol}:`, err);
          }
        }

        result = analyzeSeasonalPatterns(historicalData, symbol, benchmarkData);
        break;
      case 'peak-trough':
        result = analyzePeakTrough(historicalData);
        break;
      case 'ma-crossover':
        result = analyzeMovingAverageCrossovers(historicalData, maShort, maLong);
        break;
      case 'fourier':
        result = analyzeFourier(historicalData);
        break;
      case 'support-resistance':
        result = analyzeSupportResistance(historicalData);
        break;
      default:
        return createNoCacheResponse({ error: 'Invalid analysis mode' }, 400);
    }

    return createNoCacheResponse({
      mode,
      symbol,
      dataPoints: historicalData.length,
      ...result
    });
  } catch (error) {
    console.error('Cycle Analysis API Error:', error);
    return createNoCacheResponse({ error: 'Failed to analyze cycles' }, 500);
  }
}

// 1. Seasonal/Calendar Patterns Analysis
function analyzeSeasonalPatterns(data, symbol, benchmarkData = {}) {
  // Helper function to calculate seasonal patterns for a single symbol
  const calculatePatterns = (historicalData) => {
    const monthlyReturns = {};
    const quarterlyReturns = {};
    const dayOfWeekReturns = {};

    // Initialize structures
    for (let m = 0; m < 12; m++) {
      monthlyReturns[m] = { returns: [], count: 0, avgReturn: 0 };
    }
    for (let q = 1; q <= 4; q++) {
      quarterlyReturns[q] = { returns: [], count: 0, avgReturn: 0 };
    }
    for (let d = 0; d < 7; d++) {
      dayOfWeekReturns[d] = { returns: [], count: 0, avgReturn: 0 };
    }

    // Calculate daily returns and aggregate
    for (let i = 1; i < historicalData.length; i++) {
      const prevClose = historicalData[i - 1].close;
      const currClose = historicalData[i].close;
      const dailyReturn = ((currClose - prevClose) / prevClose) * 100;

      const date = new Date(historicalData[i].date);
      const month = date.getMonth();
      const quarter = Math.floor(month / 3) + 1;
      const dayOfWeek = date.getDay();

      monthlyReturns[month].returns.push(dailyReturn);
      monthlyReturns[month].count++;

      quarterlyReturns[quarter].returns.push(dailyReturn);
      quarterlyReturns[quarter].count++;

      dayOfWeekReturns[dayOfWeek].returns.push(dailyReturn);
      dayOfWeekReturns[dayOfWeek].count++;
    }

    return { monthlyReturns, quarterlyReturns, dayOfWeekReturns };
  };

  // Calculate patterns for main symbol
  const mainPatterns = calculatePatterns(data);

  // Calculate patterns for benchmarks
  const benchmarkPatterns = {};
  Object.keys(benchmarkData).forEach(benchmarkSymbol => {
    benchmarkPatterns[benchmarkSymbol] = calculatePatterns(benchmarkData[benchmarkSymbol]);
  });

  // Format results
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const monthlyAnalysis = Object.keys(mainPatterns.monthlyReturns).map(m => {
    const returns = mainPatterns.monthlyReturns[m].returns;
    const avg = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    const winRate = returns.length > 0 ? (returns.filter(r => r > 0).length / returns.length) * 100 : 0;

    const result = {
      month: monthNames[m],
      avgReturn: avg.toFixed(2),
      winRate: winRate.toFixed(1),
      count: returns.length
    };

    // Add benchmark data
    Object.keys(benchmarkPatterns).forEach(benchmarkSymbol => {
      const benchmarkReturns = benchmarkPatterns[benchmarkSymbol].monthlyReturns[m].returns;
      const benchmarkAvg = benchmarkReturns.length > 0 ? benchmarkReturns.reduce((a, b) => a + b, 0) / benchmarkReturns.length : 0;
      const benchmarkWinRate = benchmarkReturns.length > 0 ? (benchmarkReturns.filter(r => r > 0).length / benchmarkReturns.length) * 100 : 0;

      result[`${benchmarkSymbol}_avgReturn`] = benchmarkAvg.toFixed(2);
      result[`${benchmarkSymbol}_winRate`] = benchmarkWinRate.toFixed(1);
    });

    return result;
  });

  const quarterlyAnalysis = Object.keys(mainPatterns.quarterlyReturns).map(q => {
    const returns = mainPatterns.quarterlyReturns[q].returns;
    const avg = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    const winRate = returns.length > 0 ? (returns.filter(r => r > 0).length / returns.length) * 100 : 0;

    const result = {
      quarter: `Q${q}`,
      avgReturn: avg.toFixed(2),
      winRate: winRate.toFixed(1),
      count: returns.length
    };

    // Add benchmark data
    Object.keys(benchmarkPatterns).forEach(benchmarkSymbol => {
      const benchmarkReturns = benchmarkPatterns[benchmarkSymbol].quarterlyReturns[q].returns;
      const benchmarkAvg = benchmarkReturns.length > 0 ? benchmarkReturns.reduce((a, b) => a + b, 0) / benchmarkReturns.length : 0;
      const benchmarkWinRate = benchmarkReturns.length > 0 ? (benchmarkReturns.filter(r => r > 0).length / benchmarkReturns.length) * 100 : 0;

      result[`${benchmarkSymbol}_avgReturn`] = benchmarkAvg.toFixed(2);
      result[`${benchmarkSymbol}_winRate`] = benchmarkWinRate.toFixed(1);
    });

    return result;
  });

  const dayOfWeekAnalysis = Object.keys(mainPatterns.dayOfWeekReturns).map(d => {
    const returns = mainPatterns.dayOfWeekReturns[d].returns;
    const avg = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    const winRate = returns.length > 0 ? (returns.filter(r => r > 0).length / returns.length) * 100 : 0;

    const result = {
      day: dayNames[d],
      avgReturn: avg.toFixed(2),
      winRate: winRate.toFixed(1),
      count: returns.length
    };

    // Add benchmark data
    Object.keys(benchmarkPatterns).forEach(benchmarkSymbol => {
      const benchmarkReturns = benchmarkPatterns[benchmarkSymbol].dayOfWeekReturns[d].returns;
      const benchmarkAvg = benchmarkReturns.length > 0 ? benchmarkReturns.reduce((a, b) => a + b, 0) / benchmarkReturns.length : 0;
      const benchmarkWinRate = benchmarkReturns.length > 0 ? (benchmarkReturns.filter(r => r > 0).length / benchmarkReturns.length) * 100 : 0;

      result[`${benchmarkSymbol}_avgReturn`] = benchmarkAvg.toFixed(2);
      result[`${benchmarkSymbol}_winRate`] = benchmarkWinRate.toFixed(1);
    });

    return result;
  });

  return {
    monthly: monthlyAnalysis,
    quarterly: quarterlyAnalysis,
    dayOfWeek: dayOfWeekAnalysis,
    benchmarks: Object.keys(benchmarkData)
  };
}

// 2. Peak-to-Trough Analysis
function analyzePeakTrough(data) {
  const peaks = [];
  const troughs = [];
  const cycles = [];

  // Find peaks and troughs using simple algorithm
  for (let i = 5; i < data.length - 5; i++) {
    const current = data[i].close;
    const isPeak = data.slice(i - 5, i).every(d => d.close < current) &&
                   data.slice(i + 1, i + 6).every(d => d.close < current);
    const isTrough = data.slice(i - 5, i).every(d => d.close > current) &&
                     data.slice(i + 1, i + 6).every(d => d.close > current);

    if (isPeak) {
      peaks.push({ date: data[i].date, price: current, index: i });
    }
    if (isTrough) {
      troughs.push({ date: data[i].date, price: current, index: i });
    }
  }

  // Calculate cycles (peak to peak)
  for (let i = 1; i < peaks.length; i++) {
    const daysBetween = Math.round((new Date(peaks[i].date) - new Date(peaks[i - 1].date)) / (1000 * 60 * 60 * 24));
    const priceChange = ((peaks[i].price - peaks[i - 1].price) / peaks[i - 1].price) * 100;

    cycles.push({
      from: peaks[i - 1].date,
      to: peaks[i].date,
      days: daysBetween,
      priceChange: priceChange.toFixed(2),
      fromPrice: peaks[i - 1].price.toFixed(2),
      toPrice: peaks[i].price.toFixed(2)
    });
  }

  const avgCycleLength = cycles.length > 0 ? cycles.reduce((sum, c) => sum + c.days, 0) / cycles.length : 0;

  return {
    peaks: peaks.slice(-10).map(p => ({ date: p.date, price: p.price.toFixed(2) })),
    troughs: troughs.slice(-10).map(t => ({ date: t.date, price: t.price.toFixed(2) })),
    cycles: cycles.slice(-10),
    avgCycleLength: avgCycleLength.toFixed(0),
    totalPeaks: peaks.length,
    totalTroughs: troughs.length
  };
}

// 3. Moving Average Crossover Analysis
function analyzeMovingAverageCrossovers(data, maShort = 50, maLong = 200) {
  const MA_SHORT = maShort;
  const MA_LONG = maLong;

  if (data.length < MA_LONG) {
    return { error: 'Not enough data for MA analysis' };
  }

  const maShortValues = [];
  const maLongValues = [];
  const crossovers = [];

  // Calculate MAs
  for (let i = 0; i < data.length; i++) {
    if (i >= MA_SHORT - 1) {
      const sumShort = data.slice(i - MA_SHORT + 1, i + 1).reduce((sum, d) => sum + d.close, 0);
      maShortValues.push(sumShort / MA_SHORT);
    } else {
      maShortValues.push(null);
    }

    if (i >= MA_LONG - 1) {
      const sumLong = data.slice(i - MA_LONG + 1, i + 1).reduce((sum, d) => sum + d.close, 0);
      maLongValues.push(sumLong / MA_LONG);
    } else {
      maLongValues.push(null);
    }
  }

  // Find crossovers
  for (let i = MA_LONG; i < data.length - 1; i++) {
    const prevShort = maShortValues[i - 1];
    const currShort = maShortValues[i];
    const prevLong = maLongValues[i - 1];
    const currLong = maLongValues[i];

    // Golden Cross (bullish)
    if (prevShort < prevLong && currShort > currLong) {
      const crossoverPrice = data[i].close;
      
      // Calculate performance at different time periods
      const perf3day = i + 3 < data.length ? ((data[i + 3].close - crossoverPrice) / crossoverPrice * 100) : null;
      const perf7day = i + 7 < data.length ? ((data[i + 7].close - crossoverPrice) / crossoverPrice * 100) : null;
      const perf14day = i + 14 < data.length ? ((data[i + 14].close - crossoverPrice) / crossoverPrice * 100) : null;
      const perf30day = i + 30 < data.length ? ((data[i + 30].close - crossoverPrice) / crossoverPrice * 100) : null;

      crossovers.push({
        date: data[i].date,
        type: 'Golden Cross',
        price: data[i].close.toFixed(2),
        signal: 'Bullish',
        perf3day: perf3day?.toFixed(2),
        perf7day: perf7day?.toFixed(2),
        perf14day: perf14day?.toFixed(2),
        perf30day: perf30day?.toFixed(2)
      });
    }

    // Death Cross (bearish)
    if (prevShort > prevLong && currShort < currLong) {
      const crossoverPrice = data[i].close;

      // Calculate performance at different time periods
      const perf3day = i + 3 < data.length ? ((data[i + 3].close - crossoverPrice) / crossoverPrice * 100) : null;
      const perf7day = i + 7 < data.length ? ((data[i + 7].close - crossoverPrice) / crossoverPrice * 100) : null;
      const perf14day = i + 14 < data.length ? ((data[i + 14].close - crossoverPrice) / crossoverPrice * 100) : null;
      const perf30day = i + 30 < data.length ? ((data[i + 30].close - crossoverPrice) / crossoverPrice * 100) : null;

      crossovers.push({
        date: data[i].date,
        type: 'Death Cross',
        price: data[i].close.toFixed(2),
        signal: 'Bearish',
        perf3day: perf3day?.toFixed(2),
        perf7day: perf7day?.toFixed(2),
        perf14day: perf14day?.toFixed(2),
        perf30day: perf30day?.toFixed(2)
      });
    }
  }

  const currentMAShort = maShortValues[maShortValues.length - 1];
  const currentMALong = maLongValues[maLongValues.length - 1];
  const currentPrice = data[data.length - 1].close;

  // Prepare chart data (return all data for zoom/pan functionality)
  const chartData = [];
  for (let i = 0; i < data.length; i++) {
    chartData.push({
      date: data[i].date,
      price: parseFloat(data[i].close.toFixed(2)),
      maShort: maShortValues[i] ? parseFloat(maShortValues[i].toFixed(2)) : null,
      maLong: maLongValues[i] ? parseFloat(maLongValues[i].toFixed(2)) : null
    });
  }

  return {
    crossovers: crossovers.slice(-10),
    currentMA50: currentMAShort?.toFixed(2),
    currentMA200: currentMALong?.toFixed(2),
    currentPrice: currentPrice.toFixed(2),
    currentSignal: currentMAShort > currentMALong ? 'Bullish' : 'Bearish',
    totalCrossovers: crossovers.length,
    maShort: MA_SHORT,
    maLong: MA_LONG,
    chartData: chartData
  };
}

// 4. Fourier / Spectral Analysis (simplified)
function analyzeFourier(data) {
  const prices = data.map(d => d.close);
  const N = Math.min(prices.length, 512); // Use up to 512 points for performance
  const truncatedPrices = prices.slice(-N);

  // Simple autocorrelation to find dominant periods
  const maxLag = Math.min(200, Math.floor(N / 2));
  const correlations = [];

  for (let lag = 1; lag <= maxLag; lag++) {
    let sum = 0;
    let count = 0;
    for (let i = lag; i < truncatedPrices.length; i++) {
      sum += truncatedPrices[i] * truncatedPrices[i - lag];
      count++;
    }
    correlations.push({
      period: lag,
      correlation: count > 0 ? sum / count : 0
    });
  }

  // Find peaks in autocorrelation (dominant cycles)
  const dominantCycles = [];
  for (let i = 5; i < correlations.length - 5; i++) {
    const isLocalMax = correlations.slice(i - 5, i).every(c => c.correlation < correlations[i].correlation) &&
                       correlations.slice(i + 1, i + 6).every(c => c.correlation < correlations[i].correlation);

    if (isLocalMax && correlations[i].correlation > 0) {
      dominantCycles.push({
        period: correlations[i].period,
        strength: correlations[i].correlation.toFixed(2)
      });
    }
  }

  // Sort by strength and take top 5
  dominantCycles.sort((a, b) => b.strength - a.strength);

  return {
    dominantCycles: dominantCycles.slice(0, 5),
    interpretation: dominantCycles.length > 0
      ? `Found ${dominantCycles.length} significant cycles. Primary cycle is approximately ${dominantCycles[0].period} days.`
      : 'No significant cycles detected in the data.'
  };
}

// 5. Support and Resistance Levels
function analyzeSupportResistance(data) {
  const prices = data.map(d => d.close);
  const currentPrice = prices[prices.length - 1];

  // Find price clusters (potential support/resistance)
  const priceRange = Math.max(...prices) - Math.min(...prices);
  const bucketSize = priceRange / 50; // Divide into 50 buckets
  const buckets = {};

  prices.forEach(price => {
    const bucket = Math.floor(price / bucketSize) * bucketSize;
    buckets[bucket] = (buckets[bucket] || 0) + 1;
  });

  // Find significant levels (high frequency buckets)
  const levels = Object.keys(buckets)
    .map(bucket => ({
      price: parseFloat(bucket),
      touches: buckets[bucket],
      distance: Math.abs(parseFloat(bucket) - currentPrice)
    }))
    .filter(level => level.touches >= 5) // At least 5 touches
    .sort((a, b) => b.touches - a.touches)
    .slice(0, 10);

  // Classify as support or resistance based on current price
  const support = levels
    .filter(l => l.price < currentPrice)
    .sort((a, b) => b.price - a.price)
    .slice(0, 5)
    .map(l => ({
      price: l.price.toFixed(2),
      touches: l.touches,
      distance: ((currentPrice - l.price) / currentPrice * 100).toFixed(2) + '%'
    }));

  const resistance = levels
    .filter(l => l.price > currentPrice)
    .sort((a, b) => a.price - b.price)
    .slice(0, 5)
    .map(l => ({
      price: l.price.toFixed(2),
      touches: l.touches,
      distance: ((l.price - currentPrice) / currentPrice * 100).toFixed(2) + '%'
    }));

  return {
    currentPrice: currentPrice.toFixed(2),
    support,
    resistance,
    nearestSupport: support[0]?.price || 'N/A',
    nearestResistance: resistance[0]?.price || 'N/A'
  };
}
