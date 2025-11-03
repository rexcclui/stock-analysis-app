import { NextResponse } from "next/server";
import { getCache, setCache, getCacheKey, FOUR_HOUR_TTL_MINUTES } from '../../../lib/cache';
import { createNoCacheResponse } from '../../../lib/response';

export const dynamic = 'force-dynamic';

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

    const isOppositeDirection =
      (type === "up" && isDownDay) || (type === "down" && isUpDay);

    if (matchesTrendType) {
      if (!currentTrend) {
        // Start a new trend
        // Data is sorted newest to oldest. For a 1-day trend from yesterday->today:
        // - Chronologically: yesterday is START, today is END
        currentTrend = {
          startDate: yesterday.date,     // Chronological start (older date)
          startPrice: yesterday.close,
          endDate: today.date,           // Chronological end (newer date)
          endPrice: today.close,
          days: 1,
          firstDayChange: dailyChange,
          prices: [yesterday.close, today.close],
          startIndex: i, // Track the newest day of trend (lower index = more recent)
          endIndex: i, // Track where trend ends (oldest day)
        };
      } else {
        // Continue the current trend going backwards in time
        // yesterday becomes the new chronological start
        currentTrend.startDate = yesterday.date;  // Push start date further back
        currentTrend.startPrice = yesterday.close; // Update to earlier price
        currentTrend.days++;
        currentTrend.prices.unshift(yesterday.close); // Add to beginning since going back in time
        currentTrend.endIndex = i;
      }
    } else if (isOppositeDirection) {
      // Opposite direction - end current trend and start counting opposite
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
      currentTrend = null;
    }
    // If flat day, just skip it - don't end the trend, don't extend it
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

  // Format for output and calculate opposite direction data
  return trends.slice(0, 20).map((trend) => {
    // Find opposite direction trend that follows the main trend
    // Since trends now only end when opposite direction is encountered,
    // there should always be at least 1 opposite day (unless we're at the data boundary)
    let oppositeDays = 0;
    let oppositeEndPrice = trend.endPrice; // Start from where the trend ended (most recent price chronologically)

    // Data is sorted newest to oldest (index 0 = most recent)
    // trend.startIndex = index of most recent day of the trend
    // trend.endIndex = index of oldest day of the trend
    // Days AFTER the trend chronologically are at indices LOWER than startIndex

    // Check consecutive opposite direction days after the trend ended
    if (trend.startIndex > 0) {
      for (let j = trend.startIndex - 1; j >= 0; j--) {
        const today = historicalData[j];
        const prevDay = j + 1 < historicalData.length ? historicalData[j + 1] : null;

        if (!prevDay) break;

        const dailyChange = ((today.close - prevDay.close) / prevDay.close) * 100;

        const isOppositeDirection =
          (type === "up" && dailyChange < 0) ||
          (type === "down" && dailyChange > 0);

        if (isOppositeDirection) {
          oppositeDays++;
          oppositeEndPrice = today.close;
        } else {
          break; // Opposite trend ended (either same direction resumed or flat)
        }
      }
    }

    const oppositeChange = oppositeDays > 0
      ? ((oppositeEndPrice - trend.endPrice) / trend.endPrice) * 100
      : 0;

    return {
      startDate: trend.startDate,
      endDate: trend.endDate,
      days: trend.days,
      totalChange: type === "up" ? trend.totalChange : -trend.totalChange,
      firstDayChange: trend.firstDayChange,
      startPrice: trend.startPrice,
      endPrice: trend.endPrice,
      oppositeDays,
      oppositeChange,
    };
  });
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol");
    const years = parseInt(searchParams.get("years") || "5");
    const type = searchParams.get("type") || "up";
    const direction = searchParams.get("direction") || "up";

    if (!symbol) {
      return createNoCacheResponse(
        { error: "Symbol is required" },
        400
      );
    }

    // Check cache first
    const cacheKey = (type === "bigmoves" || type === "gapopen")
      ? getCacheKey(`${type}-${direction}-${years}y`, symbol)
      : getCacheKey(`trends-${type}-${years}y`, symbol);
    const cachedData = getCache(cacheKey);
    if (cachedData) {
      console.log(`[CACHE HIT] Historical trends for ${symbol} (${type}, ${years}y)`);
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

    let result;

    if (type === "bigmoves") {
      // Find all single-day moves
      const bigMoves = [];

      for (let i = 0; i < historicalData.length - 3; i++) {
        const today = historicalData[i];
        const yesterday = i < historicalData.length - 1 ? historicalData[i + 1] : null;

        if (!yesterday) continue;

        const dayChange = ((today.close - yesterday.close) / yesterday.close) * 100;

        // Filter by direction
        const matchesDirection =
          (direction === "up" && dayChange > 0) ||
          (direction === "down" && dayChange < 0);

        if (matchesDirection) {
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

      // Sort by absolute day change magnitude and take top 20
      bigMoves.sort((a, b) => Math.abs(b.dayChange) - Math.abs(a.dayChange));

      result = {
        symbol,
        type,
        direction,
        bigMoves: bigMoves.slice(0, 20),
        dataPoints: historicalData.length,
      };
    } else if (type === "gapopen") {
      // Find all gap opens (open price different from previous day's close)
      const gapOpens = [];

      for (let i = 0; i < historicalData.length - 1; i++) {
        const today = historicalData[i];
        const yesterday = i < historicalData.length - 1 ? historicalData[i + 1] : null;

        if (!yesterday) continue;

        // Gap Open % = (today's open - yesterday's close) / yesterday's close * 100
        const gapOpenPercent = ((today.open - yesterday.close) / yesterday.close) * 100;

        // Intraday change % = (today's close - today's open) / today's open * 100
        const intradayChange = ((today.close - today.open) / today.open) * 100;

        // Day change % = (today's close - yesterday's close) / yesterday's close * 100
        const dayChange = ((today.close - yesterday.close) / yesterday.close) * 100;

        // Filter by direction
        const matchesDirection =
          (direction === "up" && gapOpenPercent > 0) ||
          (direction === "down" && gapOpenPercent < 0);

        if (matchesDirection) {
          gapOpens.push({
            date: today.date,
            gapOpenPercent,
            intradayChange,
            dayChange,
          });
        }
      }

      // Sort by absolute gap open magnitude and take top 20
      gapOpens.sort((a, b) => Math.abs(b.gapOpenPercent) - Math.abs(a.gapOpenPercent));

      result = {
        symbol,
        type,
        direction,
        gapOpens: gapOpens.slice(0, 20),
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

    return createNoCacheResponse(result);
  } catch (error) {
    console.error("Error in historical-trends API:", error);
    return createNoCacheResponse(
      { error: error.message || "Internal server error" },
      500
    );
  }
}
