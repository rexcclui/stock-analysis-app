import { NextResponse } from 'next/server';
import googleTrends from 'google-trends-api';
import { getCache, setCache, getCacheKey, FOUR_HOUR_TTL_MINUTES } from '../../../lib/cache';
import { createNoCacheResponse } from '../../../lib/response';

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
    // Get trends data for the past 90 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);

    // Format dates as required by Google Trends API
    const formatDate = (date) => {
      return date.toISOString().split('T')[0];
    };

    // Query Google Trends with the stock symbol and company name variations
    // Google Trends works better with full company names, but we'll try with symbol
    const trendsData = await googleTrends.interestOverTime({
      keyword: symbol,
      startTime: startDate,
      endTime: endDate,
    });

    const parsedData = JSON.parse(trendsData);
    console.log(`[GOOGLE TRENDS API] Received data for ${symbol}`);

    // Extract time series data
    let trendTimeSeries = [];

    if (parsedData?.default?.timelineData) {
      trendTimeSeries = parsedData.default.timelineData.map(item => {
        // Convert Google Trends timestamp to date
        const timestamp = parseInt(item.time) * 1000;
        const date = new Date(timestamp);
        const dateStr = formatDate(date);

        // Interest value is 0-100
        const interest = item.value[0] || 0;

        return {
          date: dateStr,
          interest: interest
        };
      });
    }

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
      source: 'Google Trends'
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
