import { NextResponse } from 'next/server';
import { getCache, setCache, getCacheKey, FOUR_HOUR_TTL_MINUTES } from '../../../lib/cache';
import { createNoCacheResponse } from '../../../lib/response';

// Generate simulated Google Trends data
// Note: Google Trends doesn't have an official API and blocks automated requests
// This generates realistic trend patterns based on stock symbol characteristics
function generateSimulatedTrends(symbol, days = 90) {
  const trendTimeSeries = [];
  const endDate = new Date();

  // Create a deterministic but varied baseline based on symbol
  const symbolHash = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const baseInterest = 30 + (symbolHash % 40); // 30-70 base range

  // Popular stocks get higher baseline
  const popularStocks = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA'];
  const popularityBonus = popularStocks.includes(symbol) ? 20 : 0;

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(endDate);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    // Create wave-like pattern with some randomness
    const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
    const wave = Math.sin(dayOfYear / 10) * 15; // Slow wave
    const noise = (Math.random() - 0.5) * 10; // Random noise

    // Calculate interest with bounds
    let interest = Math.round(baseInterest + popularityBonus + wave + noise);
    interest = Math.max(10, Math.min(100, interest)); // Clamp between 10-100

    trendTimeSeries.push({
      date: dateStr,
      interest: interest
    });
  }

  return trendTimeSeries;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return createNoCacheResponse({ error: 'Symbol required' }, 400);
  }

  const cacheKey = getCacheKey('google-trends', symbol);
  const cachedData = getCache(cacheKey);
  if (cachedData) {
    console.log(`[CACHE HIT] Google Trends data for ${symbol}`);
    return createNoCacheResponse(cachedData);
  }

  try {
    // Generate simulated trends data (90 days)
    const trendTimeSeries = generateSimulatedTrends(symbol, 90);

    console.log(`[GOOGLE TRENDS API] Generated ${trendTimeSeries.length} simulated data points for ${symbol}`);

    // Calculate average interest for different periods
    const now = new Date();
    const calculatePeriodAverage = (daysBack) => {
      const cutoffDate = new Date(now);
      cutoffDate.setDate(cutoffDate.getDate() - daysBack);

      const periodData = trendTimeSeries.filter(item =>
        new Date(item.date) >= cutoffDate
      );

      if (periodData.length === 0) return 0;

      const sum = periodData.reduce((acc, item) => acc + item.interest, 0);
      return Math.round(sum / periodData.length);
    };

    const averageInterest = trendTimeSeries.length > 0
      ? Math.round(trendTimeSeries.reduce((acc, item) => acc + item.interest, 0) / trendTimeSeries.length)
      : 0;

    const result = {
      symbol,
      averageInterest,
      interestHistory: {
        '7D': calculatePeriodAverage(7),
        '1M': calculatePeriodAverage(30),
        '3M': calculatePeriodAverage(90)
      },
      trendTimeSeries,
      source: 'Simulated Trends Data'
    };

    setCache(cacheKey, result, FOUR_HOUR_TTL_MINUTES);

    return createNoCacheResponse(result);
  } catch (error) {
    console.error('Google Trends API Error:', error.message);
    return createNoCacheResponse({
      symbol,
      averageInterest: 0,
      interestHistory: { '7D': 0, '1M': 0, '3M': 0 },
      trendTimeSeries: [],
      source: 'Default (API unavailable)',
      error: error.message
    });
  }
}
