import { NextResponse } from "next/server";
import { getCache, setCache, getCacheKey, FOUR_HOUR_TTL_MINUTES } from '../../../lib/cache';
import { createNoCacheResponse } from '../../../lib/response';

export const dynamic = 'force-dynamic';

const FMP_KEY = process.env.FMP_KEY;

// Calculate average volume over a period
function calculateAverageVolume(data, index, period = 20) {
  const start = index;
  const end = Math.min(index + period, data.length);

  let sum = 0;
  let count = 0;

  for (let i = start; i < end; i++) {
    sum += data[i].volume;
    count++;
  }

  return count > 0 ? sum / count : 0;
}

// Group data into 7-day periods and calculate relative volume
function calculate7DayPeriods(historicalData) {
  const periods = [];
  const PERIOD_LENGTH = 7;
  const AVG_VOLUME_PERIOD = 20;

  // Process data in 7-day chunks (newest to oldest)
  for (let i = 0; i < historicalData.length - PERIOD_LENGTH; i += PERIOD_LENGTH) {
    const periodData = [];
    const relativeVolumes = [];

    for (let j = 0; j < PERIOD_LENGTH && (i + j) < historicalData.length; j++) {
      const dayIndex = i + j;
      const day = historicalData[dayIndex];

      // Calculate average volume for this day (using 20-day average)
      const avgVolume = calculateAverageVolume(historicalData, dayIndex, AVG_VOLUME_PERIOD);

      // Calculate relative volume
      const relativeVolume = avgVolume > 0 ? (day.volume / avgVolume) : 1;

      periodData.push({
        date: day.date,
        volume: day.volume,
        avgVolume: avgVolume,
        relativeVolume: relativeVolume,
        close: day.close,
      });

      relativeVolumes.push(relativeVolume);
    }

    if (periodData.length === PERIOD_LENGTH) {
      // Calculate percentage change for the period
      const startPrice = periodData[periodData.length - 1].close; // Oldest day in period
      const endPrice = periodData[0].close; // Newest day in period
      const percentageChange = ((endPrice - startPrice) / startPrice) * 100;

      // Calculate average relative volume for the period
      const avgRelativeVolume = relativeVolumes.reduce((a, b) => a + b, 0) / relativeVolumes.length;

      periods.push({
        startDate: periodData[periodData.length - 1].date,
        endDate: periodData[0].date,
        percentageChange: percentageChange,
        avgRelativeVolume: avgRelativeVolume,
        relativeVolumes: relativeVolumes.reverse(), // Reverse to show oldest to newest
        data: periodData.reverse(), // Reverse to show chronological order
      });
    }
  }

  return periods;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol");
    const years = parseInt(searchParams.get("years") || "2");

    if (!symbol) {
      return createNoCacheResponse(
        { error: "Symbol is required" },
        400
      );
    }

    // Check cache first
    const cacheKey = getCacheKey(`relative-volume-matrix-${years}y`, symbol);
    const cachedData = getCache(cacheKey);
    if (cachedData) {
      console.log(`[CACHE HIT] Relative volume matrix for ${symbol} (${years}y)`);
      return createNoCacheResponse(cachedData);
    }

    // Fetch historical data from FMP
    const url = `https://financialmodelingprep.com/api/v3/historical-price-full/${symbol}?apikey=${FMP_KEY}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Failed to fetch historical data");
    }

    const data = await response.json();

    if (!data.historical || data.historical.length === 0) {
      return createNoCacheResponse(
        { error: "No historical data available" },
        404
      );
    }

    // Filter to specified years and sort by date (newest first)
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - years);

    const historicalData = data.historical
      .filter((item) => new Date(item.date) >= cutoffDate)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    // Calculate 7-day periods
    const periods = calculate7DayPeriods(historicalData);

    const result = {
      symbol,
      periods,
      dataPoints: historicalData.length,
    };

    // Cache the result (4 hours)
    setCache(cacheKey, result, FOUR_HOUR_TTL_MINUTES);

    return createNoCacheResponse(result);
  } catch (error) {
    console.error("Error in relative-volume-matrix API:", error);
    return createNoCacheResponse(
      { error: error.message || "Internal server error" },
      500
    );
  }
}
