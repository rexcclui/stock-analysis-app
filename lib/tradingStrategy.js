/**
 * Trading Strategy Analysis and Backtesting Utilities
 *
 * This module provides technical analysis functions for generating buy/sell signals
 * and backtesting trading strategies on historical data.
 */

/**
 * Calculate Simple Moving Average (SMA)
 * @param {Array} prices - Array of price values
 * @param {number} period - Number of periods for SMA
 * @returns {Array} Array of SMA values (null for initial periods)
 */
function calculateSMA(prices, period) {
  const sma = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      sma.push(null);
    } else {
      const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
  }
  return sma;
}

/**
 * Calculate Exponential Moving Average (EMA)
 * @param {Array} prices - Array of price values
 * @param {number} period - Number of periods for EMA
 * @returns {Array} Array of EMA values
 */
function calculateEMA(prices, period) {
  const ema = [];
  const multiplier = 2 / (period + 1);

  // Start with SMA for first value
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += prices[i];
  }
  ema[period - 1] = sum / period;

  // Calculate EMA for remaining values
  for (let i = 0; i < period - 1; i++) {
    ema.push(null);
  }

  for (let i = period; i < prices.length; i++) {
    ema[i] = (prices[i] - ema[i - 1]) * multiplier + ema[i - 1];
  }

  return ema;
}

/**
 * Calculate Relative Strength Index (RSI)
 * @param {Array} prices - Array of price values
 * @param {number} period - RSI period (typically 14)
 * @returns {Array} Array of RSI values (0-100)
 */
function calculateRSI(prices, period = 14) {
  const rsi = [];
  const gains = [];
  const losses = [];

  // Calculate price changes
  for (let i = 0; i < prices.length; i++) {
    if (i === 0) {
      gains.push(0);
      losses.push(0);
      rsi.push(null);
    } else {
      const change = prices[i] - prices[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? -change : 0);

      if (i < period) {
        rsi.push(null);
      } else if (i === period) {
        // First RSI calculation using simple average
        const avgGain = gains.slice(1, period + 1).reduce((a, b) => a + b, 0) / period;
        const avgLoss = losses.slice(1, period + 1).reduce((a, b) => a + b, 0) / period;
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        rsi.push(100 - (100 / (1 + rs)));
      } else {
        // Subsequent RSI using smoothed averages
        const prevAvgGain = (rsi[i - 1] !== null) ? gains.slice(i - period, i).reduce((a, b) => a + b, 0) / period : 0;
        const prevAvgLoss = (rsi[i - 1] !== null) ? losses.slice(i - period, i).reduce((a, b) => a + b, 0) / period : 0;
        const avgGain = ((prevAvgGain * (period - 1)) + gains[i]) / period;
        const avgLoss = ((prevAvgLoss * (period - 1)) + losses[i]) / period;
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        rsi.push(100 - (100 / (1 + rs)));
      }
    }
  }

  return rsi;
}

/**
 * Calculate Volume Moving Average
 * @param {Array} volumes - Array of volume values
 * @param {number} period - Number of periods for average
 * @returns {Array} Array of volume MA values
 */
function calculateVolumeMA(volumes, period) {
  return calculateSMA(volumes, period);
}

/**
 * Identify support and resistance levels from historical data
 * @param {Array} data - Array of {date, price, volume} objects
 * @returns {Object} {support: Array, resistance: Array}
 */
function identifySupportResistance(data) {
  const prices = data.map(d => d.price);
  const support = [];
  const resistance = [];

  // Find local minima (support) and maxima (resistance)
  for (let i = 2; i < prices.length - 2; i++) {
    // Local minimum (support)
    if (prices[i] < prices[i - 1] && prices[i] < prices[i - 2] &&
        prices[i] < prices[i + 1] && prices[i] < prices[i + 2]) {
      support.push({ index: i, price: prices[i], date: data[i].date });
    }

    // Local maximum (resistance)
    if (prices[i] > prices[i - 1] && prices[i] > prices[i - 2] &&
        prices[i] > prices[i + 1] && prices[i] > prices[i + 2]) {
      resistance.push({ index: i, price: prices[i], date: data[i].date });
    }
  }

  return { support, resistance };
}

/**
 * Generate trading signals based on multiple technical indicators
 * @param {Array} data - Array of {date, price, volume} objects
 * @param {Object} options - Strategy parameters
 * @returns {Object} Trading signals and indicators
 */
export function generateTradingSignals(data, options = {}) {
  const {
    fastPeriod = 10,
    slowPeriod = 30,
    rsiPeriod = 14,
    rsiOverbought = 70,
    rsiOversold = 30,
    volumePeriod = 20
  } = options;

  if (!data || data.length < slowPeriod + rsiPeriod) {
    return {
      signals: [],
      indicators: {},
      error: 'Insufficient data for analysis'
    };
  }

  const prices = data.map(d => d.price);
  const volumes = data.map(d => d.volume || 0);

  // Calculate technical indicators
  const fastMA = calculateEMA(prices, fastPeriod);
  const slowMA = calculateEMA(prices, slowPeriod);
  const rsi = calculateRSI(prices, rsiPeriod);
  const volumeMA = calculateVolumeMA(volumes, volumePeriod);
  const supportResistance = identifySupportResistance(data);

  // Generate signals
  const signals = [];
  let inPosition = false;
  let entryPrice = 0;

  for (let i = slowPeriod; i < data.length; i++) {
    // Skip if indicators not ready
    if (fastMA[i] === null || slowMA[i] === null || rsi[i] === null) continue;

    const currentPrice = prices[i];
    const volumeConfirm = volumes[i] > (volumeMA[i] || 0) * 0.8;

    // BUY Signal Conditions:
    // 1. Fast MA crosses above Slow MA (Golden Cross)
    // 2. RSI is not overbought
    // 3. Volume confirmation
    if (!inPosition &&
        fastMA[i] > slowMA[i] &&
        fastMA[i - 1] <= slowMA[i - 1] &&
        rsi[i] < rsiOverbought &&
        volumeConfirm) {

      signals.push({
        type: 'BUY',
        date: data[i].date,
        price: currentPrice,
        index: i,
        indicators: {
          fastMA: fastMA[i].toFixed(2),
          slowMA: slowMA[i].toFixed(2),
          rsi: rsi[i].toFixed(2),
          volume: volumes[i],
          volumeMA: volumeMA[i]?.toFixed(0)
        },
        reason: `Golden Cross (MA${fastPeriod} > MA${slowPeriod}), RSI: ${rsi[i].toFixed(1)}, Volume confirmed`
      });

      inPosition = true;
      entryPrice = currentPrice;
    }

    // SELL Signal Conditions:
    // 1. Fast MA crosses below Slow MA (Death Cross)
    // OR 2. RSI is overbought
    // OR 3. Stop loss hit (5% below entry)
    if (inPosition) {
      const stopLoss = entryPrice * 0.95; // 5% stop loss
      const takeProfit = entryPrice * 1.10; // 10% take profit

      const deathCross = fastMA[i] < slowMA[i] && fastMA[i - 1] >= slowMA[i - 1];
      const rsiOverboughtSignal = rsi[i] > rsiOverbought;
      const stopLossHit = currentPrice <= stopLoss;
      const takeProfitHit = currentPrice >= takeProfit;

      if (deathCross || rsiOverboughtSignal || stopLossHit || takeProfitHit) {
        let reason = '';
        if (deathCross) reason = `Death Cross (MA${fastPeriod} < MA${slowPeriod})`;
        else if (rsiOverboughtSignal) reason = `RSI Overbought: ${rsi[i].toFixed(1)}`;
        else if (stopLossHit) reason = `Stop Loss hit at ${stopLoss.toFixed(2)}`;
        else if (takeProfitHit) reason = `Take Profit hit at ${takeProfit.toFixed(2)}`;

        signals.push({
          type: 'SELL',
          date: data[i].date,
          price: currentPrice,
          index: i,
          indicators: {
            fastMA: fastMA[i].toFixed(2),
            slowMA: slowMA[i].toFixed(2),
            rsi: rsi[i].toFixed(2),
            volume: volumes[i],
            volumeMA: volumeMA[i]?.toFixed(0)
          },
          reason,
          profitLoss: ((currentPrice - entryPrice) / entryPrice * 100).toFixed(2)
        });

        inPosition = false;
        entryPrice = 0;
      }
    }
  }

  return {
    signals,
    indicators: {
      fastMA,
      slowMA,
      rsi,
      volumeMA,
      supportResistance
    },
    parameters: {
      fastPeriod,
      slowPeriod,
      rsiPeriod,
      rsiOverbought,
      rsiOversold,
      volumePeriod
    }
  };
}

/**
 * Backtest trading strategy on historical data
 * @param {Array} data - Array of {date, price, volume} objects
 * @param {Array} signals - Array of trading signals from generateTradingSignals
 * @param {Object} options - Backtest parameters
 * @returns {Object} Backtest results with performance metrics
 */
export function backtestStrategy(data, signals, options = {}) {
  const {
    initialCapital = 10000,
    positionSize = 1.0, // 100% of capital per trade
    commission = 0.001 // 0.1% commission per trade
  } = options;

  let capital = initialCapital;
  let position = 0; // Number of shares
  let positionValue = 0;
  const trades = [];
  let totalCommission = 0;
  let winningTrades = 0;
  let losingTrades = 0;
  let totalProfit = 0;
  let totalLoss = 0;

  for (let i = 0; i < signals.length; i++) {
    const signal = signals[i];

    if (signal.type === 'BUY' && position === 0) {
      // Buy signal - enter position
      const investAmount = capital * positionSize;
      const commissionCost = investAmount * commission;
      const shares = (investAmount - commissionCost) / signal.price;

      position = shares;
      positionValue = investAmount - commissionCost;
      capital -= investAmount;
      totalCommission += commissionCost;

      trades.push({
        type: 'BUY',
        date: signal.date,
        price: signal.price,
        shares: shares.toFixed(4),
        value: positionValue.toFixed(2),
        commission: commissionCost.toFixed(2),
        reason: signal.reason
      });

    } else if (signal.type === 'SELL' && position > 0) {
      // Sell signal - exit position
      const sellValue = position * signal.price;
      const commissionCost = sellValue * commission;
      const netSellValue = sellValue - commissionCost;
      const profitLoss = netSellValue - positionValue;

      capital += netSellValue;
      totalCommission += commissionCost;

      if (profitLoss > 0) {
        winningTrades++;
        totalProfit += profitLoss;
      } else {
        losingTrades++;
        totalLoss += Math.abs(profitLoss);
      }

      trades.push({
        type: 'SELL',
        date: signal.date,
        price: signal.price,
        shares: position.toFixed(4),
        value: netSellValue.toFixed(2),
        commission: commissionCost.toFixed(2),
        profitLoss: profitLoss.toFixed(2),
        profitLossPct: ((profitLoss / positionValue) * 100).toFixed(2),
        reason: signal.reason
      });

      position = 0;
      positionValue = 0;
    }
  }

  // If still in position at end, close it at last price
  if (position > 0) {
    const lastPrice = data[data.length - 1].price;
    const sellValue = position * lastPrice;
    const commissionCost = sellValue * commission;
    const netSellValue = sellValue - commissionCost;
    const profitLoss = netSellValue - positionValue;

    capital += netSellValue;
    totalCommission += commissionCost;

    if (profitLoss > 0) {
      winningTrades++;
      totalProfit += profitLoss;
    } else {
      losingTrades++;
      totalLoss += Math.abs(profitLoss);
    }

    trades.push({
      type: 'SELL',
      date: data[data.length - 1].date,
      price: lastPrice,
      shares: position.toFixed(4),
      value: netSellValue.toFixed(2),
      commission: commissionCost.toFixed(2),
      profitLoss: profitLoss.toFixed(2),
      profitLossPct: ((profitLoss / positionValue) * 100).toFixed(2),
      reason: 'End of backtest period'
    });
  }

  const finalCapital = capital;
  const totalReturn = finalCapital - initialCapital;
  const totalReturnPct = ((totalReturn / initialCapital) * 100);
  const totalTrades = trades.filter(t => t.type === 'SELL').length;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades * 100) : 0;
  const avgWin = winningTrades > 0 ? totalProfit / winningTrades : 0;
  const avgLoss = losingTrades > 0 ? totalLoss / losingTrades : 0;
  const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : (totalProfit > 0 ? 999 : 0);

  return {
    summary: {
      initialCapital: initialCapital.toFixed(2),
      finalCapital: finalCapital.toFixed(2),
      totalReturn: totalReturn.toFixed(2),
      totalReturnPct: totalReturnPct.toFixed(2),
      totalTrades,
      winningTrades,
      losingTrades,
      winRate: winRate.toFixed(2),
      avgWin: avgWin.toFixed(2),
      avgLoss: avgLoss.toFixed(2),
      profitFactor: profitFactor.toFixed(2),
      totalCommission: totalCommission.toFixed(2)
    },
    trades,
    buySignals: signals.filter(s => s.type === 'BUY'),
    sellSignals: signals.filter(s => s.type === 'SELL')
  };
}

/**
 * Format backtest results for display
 * @param {Object} backtestResults - Results from backtestStrategy
 * @returns {string} Formatted summary text
 */
export function formatBacktestSummary(backtestResults) {
  const { summary } = backtestResults;
  return `
Backtest Results:
─────────────────────────────────────
Initial Capital:    $${summary.initialCapital}
Final Capital:      $${summary.finalCapital}
Total Return:       $${summary.totalReturn} (${summary.totalReturnPct}%)
─────────────────────────────────────
Total Trades:       ${summary.totalTrades}
Winning Trades:     ${summary.winningTrades}
Losing Trades:      ${summary.losingTrades}
Win Rate:           ${summary.winRate}%
─────────────────────────────────────
Average Win:        $${summary.avgWin}
Average Loss:       $${summary.avgLoss}
Profit Factor:      ${summary.profitFactor}
Total Commission:   $${summary.totalCommission}
  `.trim();
}
