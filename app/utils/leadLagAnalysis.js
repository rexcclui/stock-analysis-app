/**
 * Lead/Lag Analysis Utilities
 * Calculates beta, correlation, and lead/lag relationships between stocks
 */

/**
 * Calculate mean of an array
 */
function mean(arr) {
  return arr.reduce((sum, val) => sum + val, 0) / arr.length;
}

/**
 * Calculate standard deviation
 */
function standardDeviation(arr, meanVal = null) {
  const m = meanVal !== null ? meanVal : mean(arr);
  const squareDiffs = arr.map(value => Math.pow(value - m, 2));
  return Math.sqrt(mean(squareDiffs));
}

/**
 * Calculate Pearson correlation coefficient
 */
export function calculateCorrelation(x, y) {
  if (x.length !== y.length || x.length === 0) return 0;

  const n = x.length;
  const meanX = mean(x);
  const meanY = mean(y);

  let numerator = 0;
  let sumSquareX = 0;
  let sumSquareY = 0;

  for (let i = 0; i < n; i++) {
    const diffX = x[i] - meanX;
    const diffY = y[i] - meanY;
    numerator += diffX * diffY;
    sumSquareX += diffX * diffX;
    sumSquareY += diffY * diffY;
  }

  const denominator = Math.sqrt(sumSquareX * sumSquareY);
  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Calculate beta (slope of linear regression)
 * Beta = Cov(stock, market) / Var(market)
 */
export function calculateBeta(stockReturns, marketReturns) {
  if (stockReturns.length !== marketReturns.length || stockReturns.length === 0) {
    return 0;
  }

  const meanStock = mean(stockReturns);
  const meanMarket = mean(marketReturns);

  let covariance = 0;
  let variance = 0;

  for (let i = 0; i < stockReturns.length; i++) {
    const stockDiff = stockReturns[i] - meanStock;
    const marketDiff = marketReturns[i] - meanMarket;
    covariance += stockDiff * marketDiff;
    variance += marketDiff * marketDiff;
  }

  covariance /= stockReturns.length;
  variance /= marketReturns.length;

  return variance === 0 ? 0 : covariance / variance;
}

/**
 * Calculate daily returns from price data
 */
export function calculateReturns(prices) {
  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i - 1] !== 0) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
  }
  return returns;
}

/**
 * Calculate cross-correlation to find lead/lag relationship
 * Positive lag = comparisonStock leads selectedStock
 * Negative lag = comparisonStock lags selectedStock
 * Returns: { lag, correlation, maxCorrelation }
 */
export function calculateLeadLag(selectedReturns, comparisonReturns, maxLag = 20) {
  if (selectedReturns.length === 0 || comparisonReturns.length === 0) {
    return { lag: 0, correlation: 0, maxCorrelation: 0 };
  }

  let maxCorr = -Infinity;
  let bestLag = 0;

  // Try different lags from -maxLag to +maxLag
  for (let lag = -maxLag; lag <= maxLag; lag++) {
    let x = selectedReturns;
    let y = comparisonReturns;

    if (lag > 0) {
      // Comparison stock leads: shift comparison stock back in time
      x = selectedReturns.slice(lag);
      y = comparisonReturns.slice(0, -lag);
    } else if (lag < 0) {
      // Comparison stock lags: shift selected stock back in time
      x = selectedReturns.slice(0, lag);
      y = comparisonReturns.slice(-lag);
    }

    if (x.length > 10) { // Minimum data points for correlation
      const corr = Math.abs(calculateCorrelation(x, y));
      if (corr > maxCorr) {
        maxCorr = corr;
        bestLag = lag;
      }
    }
  }

  // Calculate correlation at best lag
  let x = selectedReturns;
  let y = comparisonReturns;

  if (bestLag > 0) {
    x = selectedReturns.slice(bestLag);
    y = comparisonReturns.slice(0, -bestLag);
  } else if (bestLag < 0) {
    x = selectedReturns.slice(0, bestLag);
    y = comparisonReturns.slice(-bestLag);
  }

  const correlation = calculateCorrelation(x, y);

  return {
    lag: bestLag,
    correlation: correlation,
    maxCorrelation: maxCorr
  };
}

/**
 * Align two price series by date and return aligned prices
 */
export function alignPriceSeries(selectedData, comparisonData) {
  if (!selectedData || !comparisonData || selectedData.length === 0 || comparisonData.length === 0) {
    return { selectedPrices: [], comparisonPrices: [], dates: [] };
  }

  // Create maps for quick lookup
  const selectedMap = new Map(selectedData.map(d => [d.date, d.price]));
  const comparisonMap = new Map(comparisonData.map(d => [d.date, d.price]));

  // Find common dates
  const commonDates = [...selectedMap.keys()].filter(date => comparisonMap.has(date));
  commonDates.sort();

  // Extract aligned prices
  const selectedPrices = commonDates.map(date => selectedMap.get(date));
  const comparisonPrices = commonDates.map(date => comparisonMap.get(date));

  return {
    selectedPrices,
    comparisonPrices,
    dates: commonDates
  };
}

/**
 * Perform comprehensive lead/lag analysis
 */
export function analyzeLeadLag(selectedStock, comparisonStock, period = '1Y') {
  if (!selectedStock || !comparisonStock) {
    return null;
  }

  // Get historical data
  const selectedData = selectedStock.chartData?.fullHistorical || selectedStock.chartData?.['1Y'] || [];
  const comparisonData = comparisonStock.chartData?.fullHistorical || comparisonStock.chartData?.['1Y'] || [];

  if (selectedData.length === 0 || comparisonData.length === 0) {
    return {
      code: comparisonStock.code,
      name: comparisonStock.name,
      beta: 'N/A',
      correlation: 'N/A',
      lag: 'N/A',
      relationship: 'Insufficient data',
      color: '#9ca3af'
    };
  }

  // Align price series
  const { selectedPrices, comparisonPrices, dates } = alignPriceSeries(selectedData, comparisonData);

  if (selectedPrices.length < 20) {
    return {
      code: comparisonStock.code,
      name: comparisonStock.name,
      beta: 'N/A',
      correlation: 'N/A',
      lag: 'N/A',
      relationship: 'Insufficient data',
      color: '#9ca3af'
    };
  }

  // Calculate returns
  const selectedReturns = calculateReturns(selectedPrices);
  const comparisonReturns = calculateReturns(comparisonPrices);

  // Calculate beta
  const beta = calculateBeta(comparisonReturns, selectedReturns);

  // Calculate correlation at zero lag
  const zeroLagCorr = calculateCorrelation(selectedReturns, comparisonReturns);

  // Calculate lead/lag
  const maxLag = Math.min(20, Math.floor(selectedReturns.length / 10));
  const { lag, correlation, maxCorrelation } = calculateLeadLag(selectedReturns, comparisonReturns, maxLag);

  // Determine relationship type
  let relationship = '';
  const absCorr = Math.abs(correlation);

  if (lag > 0) {
    relationship = `Leads by ${lag}d`;
  } else if (lag < 0) {
    relationship = `Lags by ${Math.abs(lag)}d`;
  } else {
    relationship = 'Synchronous';
  }

  // Determine color based on correlation strength
  let color;
  if (absCorr >= 0.7) {
    color = correlation > 0 ? '#10b981' : '#ef4444'; // Strong: green/red
  } else if (absCorr >= 0.5) {
    color = correlation > 0 ? '#34d399' : '#f87171'; // Moderate: lighter green/red
  } else if (absCorr >= 0.3) {
    color = correlation > 0 ? '#6ee7b7' : '#fca5a5'; // Weak: very light green/red
  } else {
    color = '#9ca3af'; // Very weak: gray
  }

  return {
    code: comparisonStock.code,
    name: comparisonStock.name,
    beta: beta.toFixed(3),
    correlation: correlation.toFixed(3),
    zeroLagCorr: zeroLagCorr.toFixed(3),
    lag: lag,
    maxCorrelation: maxCorrelation.toFixed(3),
    relationship,
    color,
    dataPoints: selectedReturns.length
  };
}
