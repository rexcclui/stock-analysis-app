/**
 * Utility functions for stock correlation and lead-lag analysis
 */

/**
 * Calculate daily returns from price data
 * @param {Array} priceData - Array of {date, close} objects sorted by date (newest first)
 * @returns {Array} Array of {date, return} objects
 */
export function calculateReturns(priceData) {
  const returns = [];

  // Sort by date ascending for calculation
  const sorted = [...priceData].sort((a, b) => new Date(a.date) - new Date(b.date));

  for (let i = 1; i < sorted.length; i++) {
    const prevClose = sorted[i - 1].close;
    const currClose = sorted[i].close;
    const dailyReturn = (currClose - prevClose) / prevClose;

    returns.push({
      date: sorted[i].date,
      return: dailyReturn
    });
  }

  return returns;
}

/**
 * Align two return series by date
 * @param {Array} returns1 - First stock returns
 * @param {Array} returns2 - Second stock returns
 * @returns {Object} {dates, returns1, returns2} - aligned arrays
 */
export function alignReturns(returns1, returns2) {
  const dateMap1 = new Map(returns1.map(r => [r.date, r.return]));
  const dateMap2 = new Map(returns2.map(r => [r.date, r.return]));

  // Find common dates
  const commonDates = returns1
    .map(r => r.date)
    .filter(date => dateMap2.has(date))
    .sort((a, b) => new Date(a) - new Date(b));

  const aligned1 = commonDates.map(date => dateMap1.get(date));
  const aligned2 = commonDates.map(date => dateMap2.get(date));

  return {
    dates: commonDates,
    returns1: aligned1,
    returns2: aligned2
  };
}

/**
 * Calculate Pearson correlation coefficient
 * @param {Array} x - First array of numbers
 * @param {Array} y - Second array of numbers
 * @returns {number} Correlation coefficient between -1 and 1
 */
export function calculateCorrelation(x, y) {
  if (x.length !== y.length || x.length === 0) {
    return 0;
  }

  const n = x.length;
  const meanX = x.reduce((sum, val) => sum + val, 0) / n;
  const meanY = y.reduce((sum, val) => sum + val, 0) / n;

  let numerator = 0;
  let sumSqX = 0;
  let sumSqY = 0;

  for (let i = 0; i < n; i++) {
    const diffX = x[i] - meanX;
    const diffY = y[i] - meanY;
    numerator += diffX * diffY;
    sumSqX += diffX * diffX;
    sumSqY += diffY * diffY;
  }

  const denominator = Math.sqrt(sumSqX * sumSqY);
  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Calculate cross-correlation at different lags
 * @param {Array} returns1 - First stock returns (aligned)
 * @param {Array} returns2 - Second stock returns (aligned)
 * @param {number} maxLag - Maximum lag to test in days
 * @returns {Array} Array of {lag, correlation} objects
 */
export function crossCorrelation(returns1, returns2, maxLag = 10) {
  const results = [];

  for (let lag = -maxLag; lag <= maxLag; lag++) {
    let correlation;

    if (lag === 0) {
      // No lag - standard correlation
      correlation = calculateCorrelation(returns1, returns2);
    } else if (lag > 0) {
      // returns1 leads returns2 by 'lag' days
      const r1 = returns1.slice(lag);
      const r2 = returns2.slice(0, -lag);
      correlation = calculateCorrelation(r1, r2);
    } else {
      // returns2 leads returns1 by 'lag' days
      const absLag = Math.abs(lag);
      const r1 = returns1.slice(0, -absLag);
      const r2 = returns2.slice(absLag);
      correlation = calculateCorrelation(r1, r2);
    }

    results.push({ lag, correlation });
  }

  return results;
}

/**
 * Find the best lag and determine which stock leads
 * @param {Array} crossCorrResults - Results from crossCorrelation
 * @param {string} stock1Symbol - Symbol of first stock
 * @param {string} stock2Symbol - Symbol of second stock
 * @returns {Object} Lead-lag analysis results
 */
export function findLeadingStock(crossCorrResults, stock1Symbol, stock2Symbol) {
  let maxCorr = -Infinity;
  let bestLag = 0;

  crossCorrResults.forEach(({ lag, correlation }) => {
    if (Math.abs(correlation) > Math.abs(maxCorr)) {
      maxCorr = correlation;
      bestLag = lag;
    }
  });

  let leader = 'None';
  let leaderSymbol = null;
  let followerSymbol = null;

  if (bestLag > 0) {
    leader = stock1Symbol;
    leaderSymbol = stock1Symbol;
    followerSymbol = stock2Symbol;
  } else if (bestLag < 0) {
    leader = stock2Symbol;
    leaderSymbol = stock2Symbol;
    followerSymbol = stock1Symbol;
  }

  return {
    lag: bestLag,
    correlation: maxCorr,
    leader,
    leaderSymbol,
    followerSymbol,
    leadDays: Math.abs(bestLag),
    interpretation: interpretLeadLag(bestLag, maxCorr, stock1Symbol, stock2Symbol)
  };
}

/**
 * Interpret lead-lag results in human-readable format
 */
function interpretLeadLag(lag, correlation, stock1Symbol, stock2Symbol) {
  const corrStrength = Math.abs(correlation);
  let strength = 'weak';
  if (corrStrength > 0.7) strength = 'very strong';
  else if (corrStrength > 0.5) strength = 'strong';
  else if (corrStrength > 0.3) strength = 'moderate';

  const direction = correlation > 0 ? 'positive' : 'negative';

  if (lag === 0) {
    return `Stocks move together with ${strength} ${direction} correlation (${correlation.toFixed(3)}). No clear leader.`;
  } else if (lag > 0) {
    return `${stock1Symbol} leads ${stock2Symbol} by ${Math.abs(lag)} day${Math.abs(lag) > 1 ? 's' : ''} with ${strength} ${direction} correlation (${correlation.toFixed(3)}).`;
  } else {
    return `${stock2Symbol} leads ${stock1Symbol} by ${Math.abs(lag)} day${Math.abs(lag) > 1 ? 's' : ''} with ${strength} ${direction} correlation (${correlation.toFixed(3)}).`;
  }
}

/**
 * Calculate rolling correlation over time
 * @param {Array} returns1 - First stock returns
 * @param {Array} returns2 - Second stock returns
 * @param {number} window - Window size in days
 * @returns {Array} Array of {date, correlation} objects
 */
export function rollingCorrelation(returns1, returns2, dates, window = 30) {
  const results = [];

  for (let i = window - 1; i < returns1.length; i++) {
    const windowReturns1 = returns1.slice(i - window + 1, i + 1);
    const windowReturns2 = returns2.slice(i - window + 1, i + 1);
    const correlation = calculateCorrelation(windowReturns1, windowReturns2);

    results.push({
      date: dates[i],
      correlation
    });
  }

  return results;
}
