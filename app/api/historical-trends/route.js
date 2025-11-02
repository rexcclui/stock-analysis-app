import { NextResponse } from "next/server";
import { getCache, setCache, getCacheKey, FOUR_HOUR_TTL_MINUTES } from '../../../lib/cache';

const FMP_KEY = process.env.FMP_KEY;

// Find continuous trends (sequences of consecutive up/down days)
function findTrends(historicalData, type = "up") {
  const trends = [];

  let currentTrend = null;

  for (let i = 0; i < historicalData.length - 1; i++) {
    const today = historicalData[i];
    const yesterday = historicalData[i + 1];

    const dailyChange =
      ((today.close - yesterday.close) / yesterday.close) * 100;

    const isUpDay = dailyChange > 0;
    const isDownDay = dailyChange < 0;

    const matchesTrendType =
      (type === "up" && isUpDay) || (type === "down" && isDownDay);

    if (matchesTrendType) {
      if (!currentTrend) {
        // Start a new trend
        currentTrend = {
          startDate: today.date,
          startPrice: yesterday.close,
          endDate: today.date,
          endPrice: today.close,
          days: 1,
          firstDayChange: dailyChange,
          prices: [yesterday.close, today.close],
        };
      } else {
        // Continue the current trend
        currentTrend.endDate = today.date;
        currentTrend.endPrice = today.close;
        currentTrend.days++;
        currentTrend.prices.push(today.close);
      }
    } else {
      // Trend ended
      if (currentTrend && currentTrend.days >= 2) {
        // Only include trends of 2+ days
        const totalChange =
          ((currentTrend.endPrice - currentTrend.startPrice) /
            currentTrend.startPrice) *
          100;
        trends.push({
          ...currentTrend,
          totalChange: Math.abs(totalChange),
        });
      }
      currentTrend = null;
    }
  }

  // Add the last trend if it exists
  if (currentTrend && currentTrend.days >= 2) {
    const totalChange =
      ((currentTrend.endPrice - currentTrend.startPrice) /
        currentTrend.startPrice) *
      100;
    trends.push({
      ...currentTrend,
      totalChange: Math.abs(totalChange),
    });
  }

  // Sort by total change (descending) and take top 10
  trends.sort((a, b) => b.totalChange - a.totalChange);

  // Format for output
  return trends.slice(0, 10).map((trend) => ({
    startDate: trend.startDate,
    endDate: trend.endDate,
    days: trend.days,
    totalChange: type === "up" ? trend.totalChange : -trend.totalChange,
    firstDayChange: trend.firstDayChange,
    startPrice: trend.startPrice,
    endPrice: trend.endPrice,
  }));
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol");
    const years = parseInt(searchParams.get("years") || "5");
    const type = searchParams.get("type") || "up";

    if (!symbol) {
      return NextResponse.json(
        { error: "Symbol is required" },
        { status: 400 }
      );
    }

    // Check cache first
    const cacheKey = getCacheKey(`trends-${type}-${years}y`, symbol);
    const cachedData = getCache(cacheKey);
    if (cachedData) {
      console.log(`[CACHE HIT] Historical trends for ${symbol} (${type}, ${years}y)`);
      return NextResponse.json(cachedData);
    }

    // Fetch historical data from FMP
    const url = `https://financialmodelingprep.com/api/v3/historical-price-full/${symbol}?apikey=${FMP_KEY}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Failed to fetch historical data");
    }

    const data = await response.json();

    if (!data.historical || data.historical.length === 0) {
      return NextResponse.json(
        { error: "No historical data available" },
        { status: 404 }
      );
    }

    // Filter to specified years and sort by date (newest first)
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - years);

    const historicalData = data.historical
      .filter((item) => new Date(item.date) >= cutoffDate)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    // Find trends
    const trends = findTrends(historicalData, type);

    const result = {
      symbol,
      type,
      trends,
      dataPoints: historicalData.length,
    };

    // Cache the result (4 hours)
    setCache(cacheKey, result, FOUR_HOUR_TTL_MINUTES);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in historical-trends API:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
