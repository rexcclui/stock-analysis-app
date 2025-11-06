import { NextResponse } from 'next/server';
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
    // Get trends data for the past 90 days using direct HTTP request
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);

    // Format date as YYYY-MM-DD
    const formatDate = (date) => {
      return date.toISOString().split('T')[0];
    };

    // Build Google Trends explore URL
    // Google Trends uses a specific date format: YYYY-MM-DD YYYY-MM-DD
    const timeRange = `${formatDate(startDate)} ${formatDate(endDate)}`;

    // Encode the keyword
    const keyword = encodeURIComponent(symbol);

    // First, get the token from explore endpoint
    const exploreUrl = `https://trends.google.com/trends/api/explore?hl=en-US&tz=0&req={"comparisonItem":[{"keyword":"${symbol}","geo":"","time":"today 3-m"}],"category":0,"property":""}`;

    const exploreRes = await fetch(exploreUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!exploreRes.ok) {
      throw new Error(`Google Trends explore request failed: ${exploreRes.status}`);
    }

    let exploreText = await exploreRes.text();
    // Remove the leading )]}' from the response
    exploreText = exploreText.substring(5);
    const exploreData = JSON.parse(exploreText);

    console.log(`[GOOGLE TRENDS API] Received explore data for ${symbol}`);

    // Extract time series data from the explore response
    let trendTimeSeries = [];

    if (exploreData?.widgets) {
      // Find the TIMESERIES widget
      const timeseriesWidget = exploreData.widgets.find(w => w.id === 'TIMESERIES');

      if (timeseriesWidget?.request) {
        // Get the actual timeseries data
        const token = timeseriesWidget.token;
        const timeseriesReq = JSON.stringify(timeseriesWidget.request);

        const timeseriesUrl = `https://trends.google.com/trends/api/widgetdata/multiline?hl=en-US&tz=0&req=${encodeURIComponent(timeseriesReq)}&token=${token}`;

        const timeseriesRes = await fetch(timeseriesUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        if (timeseriesRes.ok) {
          let timeseriesText = await timeseriesRes.text();
          // Remove the leading )]}' from the response
          timeseriesText = timeseriesText.substring(5);
          const timeseriesData = JSON.parse(timeseriesText);

          if (timeseriesData?.default?.timelineData) {
            trendTimeSeries = timeseriesData.default.timelineData.map(item => {
              // Format timestamp to date string
              const timestamp = parseInt(item.time) * 1000;
              const date = new Date(timestamp);
              const dateStr = formatDate(date);

              // Interest value is 0-100
              const interest = item.value && item.value[0] !== undefined ? item.value[0] : 0;

              return {
                date: dateStr,
                interest: interest
              };
            });
          }
        }
      }
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
