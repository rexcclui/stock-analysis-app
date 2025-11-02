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

  // Sort by total change (descending) and take top 20
  trends.sort((a, b) => b.totalChange - a.totalChange);

  // Format for output
  return trends.slice(0, 20).map((trend) => ({
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
    const threshold = parseFloat(searchParams.get("threshold") || "5");

    if (!symbol) {
      return NextResponse.json(
        { error: "Symbol is required" },
        { status: 400 }
      );
    }

    // Check cache first
    const cacheKey = type === "bigmoves"
      ? getCacheKey(`bigmoves-${threshold}-${years}y`, symbol)
      : getCacheKey(`trends-${type}-${years}y`, symbol);
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

    let result;

    if (type === "bigmoves") {
      // Find big single-day moves
      const bigMoves = [];

      for (let i = 0; i < historicalData.length - 3; i++) {
        const today = historicalData[i];
        const yesterday = i < historicalData.length - 1 ? historicalData[i + 1] : null;

        if (!yesterday) continue;

        const dayChange = ((today.close - yesterday.close) / yesterday.close) * 100;

        // Check if it exceeds threshold
        if (Math.abs(dayChange) >= threshold) {
          // Calculate after effects
          const after1Day = i > 0 && i < historicalData.length - 1
            ? ((historicalData[i - 1].close - today.close) / today.close) * 100
            : 0;

          const after2Days = i > 1 && i < historicalData.length - 2
            ? ((historicalData[i - 2].close - today.close) / today.close) * 100
            : 0;

          const after3Days = i > 2 && i < historicalData.length - 3
            ? ((historicalData[i - 3].close - today.close) / today.close) * 100
            : 0;

          bigMoves.push({
            date: today.date,
            dayChange,
            after1Day,
            after2Days,
            after3Days,
            price: today.close,
          });
        }
      }

      // Sort by absolute day change magnitude and take top 30
      bigMoves.sort((a, b) => Math.abs(b.dayChange) - Math.abs(a.dayChange));

      result = {
        symbol,
        type,
        threshold,
        bigMoves: bigMoves.slice(0, 30),
        dataPoints: historicalData.length,
      };
    } else {
      // Find trends
      const trends = findTrends(historicalData, type);

      result = {
        symbol,
        type,
        trends,
        dataPoints: historicalData.length,
      };
    }

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
