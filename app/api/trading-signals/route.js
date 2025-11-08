import { NextResponse } from 'next/server';
import { getCache, setCache } from '@/lib/cache';
import { generateTradingSignals, backtestStrategy, formatBacktestSummary } from '@/lib/tradingStrategy';

// Cache TTL for trading signals analysis: 30 minutes
const TRADING_SIGNALS_CACHE_TTL = 30;

/**
 * Trading Signals Analysis with Backtesting
 *
 * Analyzes historical price and volume data to generate buy/sell signals
 * using technical indicators (Moving Averages, RSI, Volume).
 * Performs backtesting to show historical performance.
 *
 * POST body:
 * - symbol: Stock symbol (e.g., AAPL)
 * - historicalData: Array of {date, price, volume} objects
 * - options: Optional strategy parameters
 * - forceReload: Boolean to bypass cache
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      symbol,
      historicalData = [],
      options = {},
      forceReload = false
    } = body;

    // Validate input
    if (!symbol) {
      return NextResponse.json({ error: 'Stock symbol is required' }, { status: 400 });
    }

    if (!historicalData || historicalData.length === 0) {
      return NextResponse.json({ error: 'Historical data is required' }, { status: 400 });
    }

    // Check if data has required fields
    const hasRequiredFields = historicalData.every(d => d.date && d.price !== undefined);
    if (!hasRequiredFields) {
      return NextResponse.json({
        error: 'Historical data must include date and price fields'
      }, { status: 400 });
    }

    // Create cache key based on symbol and recent data
    const recentPrices = historicalData.slice(-10).map(d => d.price).join(',');
    const cacheKey = `trading-signals:${symbol}:${Buffer.from(recentPrices).toString('base64').slice(0, 30)}`;

    // Check cache first (unless force reload)
    if (!forceReload) {
      const cachedAnalysis = getCache(cacheKey);
      if (cachedAnalysis) {
        console.log(`[Trading Signals] Cache hit for ${symbol}`);
        return NextResponse.json({
          ...cachedAnalysis,
          fromCache: true,
          cacheKey
        });
      }
    }

    console.log(`[Trading Signals] Cache miss for ${symbol}, generating analysis`);
    console.log(`[Trading Signals] Analyzing ${historicalData.length} data points`);

    // Default strategy parameters
    const defaultOptions = {
      fastPeriod: 10,
      slowPeriod: 30,
      rsiPeriod: 14,
      rsiOverbought: 70,
      rsiOversold: 30,
      volumePeriod: 20,
      ...options
    };

    // Generate trading signals
    const signalAnalysis = generateTradingSignals(historicalData, defaultOptions);

    if (signalAnalysis.error) {
      return NextResponse.json({
        error: signalAnalysis.error,
        details: 'Not enough historical data for technical analysis'
      }, { status: 400 });
    }

    // Perform backtesting
    const backtestOptions = {
      initialCapital: 10000,
      positionSize: 1.0,
      commission: 0.001,
      ...options.backtestOptions
    };

    const backtestResults = backtestStrategy(
      historicalData,
      signalAnalysis.signals,
      backtestOptions
    );

    // Calculate additional statistics
    const currentPrice = historicalData[historicalData.length - 1].price;
    const startPrice = historicalData[0].price;
    const buyAndHoldReturn = ((currentPrice - startPrice) / startPrice * 100).toFixed(2);

    // Determine strategy performance vs buy-and-hold
    const strategyReturn = parseFloat(backtestResults.summary.totalReturnPct);
    const outperformance = (strategyReturn - parseFloat(buyAndHoldReturn)).toFixed(2);

    // Get the most recent signal
    const lastSignal = signalAnalysis.signals.length > 0
      ? signalAnalysis.signals[signalAnalysis.signals.length - 1]
      : null;

    // Determine current position based on signals
    let currentPosition = 'NEUTRAL';
    if (lastSignal) {
      currentPosition = lastSignal.type === 'BUY' ? 'LONG' : 'NEUTRAL';
    }

    // Get buy and sell signals with their positions in the data
    const buySignals = backtestResults.buySignals.map(signal => ({
      date: signal.date,
      price: signal.price,
      index: signal.index,
      reason: signal.reason,
      indicators: signal.indicators
    }));

    const sellSignals = backtestResults.sellSignals.map(signal => ({
      date: signal.date,
      price: signal.price,
      index: signal.index,
      reason: signal.reason,
      indicators: signal.indicators
    }));

    // Prepare response
    const result = {
      symbol,
      analyzedAt: new Date().toISOString(),
      dataPoints: historicalData.length,
      currentPrice,
      currentPosition,
      lastSignal: lastSignal ? {
        type: lastSignal.type,
        date: lastSignal.date,
        price: lastSignal.price,
        reason: lastSignal.reason
      } : null,

      // Strategy parameters
      parameters: signalAnalysis.parameters,

      // Trading signals
      buySignals,
      sellSignals,
      totalSignals: signalAnalysis.signals.length,

      // Backtest results
      backtest: {
        summary: backtestResults.summary,
        trades: backtestResults.trades,
        buyAndHoldReturn,
        strategyReturn: backtestResults.summary.totalReturnPct,
        outperformance,
        formattedSummary: formatBacktestSummary(backtestResults)
      },

      // Performance comparison
      performance: {
        strategyBetter: parseFloat(outperformance) > 0,
        strategyReturnPct: backtestResults.summary.totalReturnPct,
        buyAndHoldReturnPct: buyAndHoldReturn,
        outperformancePct: outperformance
      },

      // Risk metrics
      risk: {
        winRate: backtestResults.summary.winRate,
        profitFactor: backtestResults.summary.profitFactor,
        avgWin: backtestResults.summary.avgWin,
        avgLoss: backtestResults.summary.avgLoss
      }
    };

    // Cache the result
    setCache(cacheKey, result, TRADING_SIGNALS_CACHE_TTL);
    console.log(`[Trading Signals] Successfully analyzed and cached ${symbol}`);

    return NextResponse.json({
      ...result,
      fromCache: false,
      cacheKey
    });

  } catch (error) {
    console.error('[Trading Signals] Error:', error);

    return NextResponse.json({
      error: 'Failed to generate trading signals',
      details: error.message
    }, { status: 500 });
  }
}

// Set runtime configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
