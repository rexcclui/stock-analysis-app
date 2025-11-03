import { NextResponse } from "next/server";
import { getCache, setCache, getCacheKey, FOUR_HOUR_TTL_MINUTES } from '../../../lib/cache';
import { createNoCacheResponse } from '../../../lib/response';

const FMP_KEY = process.env.FMP_KEY;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol");
    const years = parseInt(searchParams.get("years") || "5");
    const direction = searchParams.get("direction") || "up";

    if (!symbol) {
      return createNoCacheResponse(
        { error: "Symbol is required" },
        400
      );
    }

    // Check cache first
    const cacheKey = getCacheKey(`spycorr-${direction}-${years}y`, symbol);
    const cachedData = getCache(cacheKey);
    if (cachedData) {
      console.log(`[CACHE HIT] SPY correlation for ${symbol} (${direction}, ${years}y)`);
      return createNoCacheResponse(cachedData);
    }

    // Fetch SPY historical data
    const spyUrl = `https://financialmodelingprep.com/api/v3/historical-price-full/SPY?apikey=${FMP_KEY}`;
    const spyResponse = await fetch(spyUrl);

    if (!spyResponse.ok) {
      throw new Error("Failed to fetch SPY data");
    }

    const spyData = await spyResponse.json();

    if (!spyData.historical || spyData.historical.length === 0) {
      return createNoCacheResponse(
        { error: "No SPY data available" },
        404
      );
    }

    // Fetch stock historical data
    const stockUrl = `https://financialmodelingprep.com/api/v3/historical-price-full/${symbol}?apikey=${FMP_KEY}`;
    const stockResponse = await fetch(stockUrl);

    if (!stockResponse.ok) {
      throw new Error("Failed to fetch stock data");
    }

    const stockData = await stockResponse.json();

    if (!stockData.historical || stockData.historical.length === 0) {
      return createNoCacheResponse(
        { error: "No stock data available" },
        404
      );
    }

    // Filter to specified years
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - years);

    const spyHistorical = spyData.historical
      .filter((item) => new Date(item.date) >= cutoffDate)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    const stockHistorical = stockData.historical
      .filter((item) => new Date(item.date) >= cutoffDate)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    // Create a map of stock data by date for quick lookup
    const stockByDate = {};
    stockHistorical.forEach((item) => {
      stockByDate[item.date] = item;
    });

    // Find SPY's biggest moves
    const spyMoves = [];
    for (let i = 0; i < spyHistorical.length - 1; i++) {
      const today = spyHistorical[i];
      const yesterday = spyHistorical[i + 1];

      const spyChange = ((today.close - yesterday.close) / yesterday.close) * 100;

      if ((direction === "up" && spyChange > 0) || (direction === "down" && spyChange < 0)) {
        spyMoves.push({
          date: today.date,
          spyChange,
          index: i,
        });
      }
    }

    // Sort by absolute magnitude and take top 20
    spyMoves.sort((a, b) => Math.abs(b.spyChange) - Math.abs(a.spyChange));
    const top10SpyMoves = spyMoves.slice(0, 20);

    // For each SPY move, find the stock's performance
    const correlations = [];

    for (const spyMove of top10SpyMoves) {
      const spyIndex = spyMove.index;
      const spyDate = spyMove.date;

      // Get stock data for the same date
      const stockSameDay = stockByDate[spyDate];
      if (!stockSameDay) continue;

      // Find stock index for this date
      const stockIndex = stockHistorical.findIndex((item) => item.date === spyDate);
      if (stockIndex === -1) continue;

      // Calculate stock changes
      const stockYesterday = stockIndex < stockHistorical.length - 1 ? stockHistorical[stockIndex + 1] : null;
      const stockAfter1 = stockIndex > 0 ? stockHistorical[stockIndex - 1] : null;
      const stockAfter2 = stockIndex > 1 ? stockHistorical[stockIndex - 2] : null;
      const stockAfter3 = stockIndex > 2 ? stockHistorical[stockIndex - 3] : null;
      const stockAfter7 = stockIndex > 6 ? stockHistorical[stockIndex - 7] : null;

      const stockSameDayChange = stockYesterday
        ? ((stockSameDay.close - stockYesterday.close) / stockYesterday.close) * 100
        : 0;

      const stockAfter1DayChange = stockAfter1
        ? ((stockAfter1.close - stockSameDay.close) / stockSameDay.close) * 100
        : 0;

      const stockAfter2DaysChange = stockAfter2
        ? ((stockAfter2.close - stockSameDay.close) / stockSameDay.close) * 100
        : 0;

      const stockAfter3DaysChange = stockAfter3
        ? ((stockAfter3.close - stockSameDay.close) / stockSameDay.close) * 100
        : 0;

      const stockAfter7DaysChange = stockAfter7
        ? ((stockAfter7.close - stockSameDay.close) / stockSameDay.close) * 100
        : 0;

      // Calculate SPY's after-effects
      const spyAfter1 = spyIndex > 0 ? spyHistorical[spyIndex - 1] : null;
      const spyAfter2 = spyIndex > 1 ? spyHistorical[spyIndex - 2] : null;
      const spyAfter3 = spyIndex > 2 ? spyHistorical[spyIndex - 3] : null;
      const spyAfter7 = spyIndex > 6 ? spyHistorical[spyIndex - 7] : null;

      const spyAfter1DayChange = spyAfter1
        ? ((spyAfter1.close - spyHistorical[spyIndex].close) / spyHistorical[spyIndex].close) * 100
        : 0;

      const spyAfter2DaysChange = spyAfter2
        ? ((spyAfter2.close - spyHistorical[spyIndex].close) / spyHistorical[spyIndex].close) * 100
        : 0;

      const spyAfter3DaysChange = spyAfter3
        ? ((spyAfter3.close - spyHistorical[spyIndex].close) / spyHistorical[spyIndex].close) * 100
        : 0;

      const spyAfter7DaysChange = spyAfter7
        ? ((spyAfter7.close - spyHistorical[spyIndex].close) / spyHistorical[spyIndex].close) * 100
        : 0;

      correlations.push({
        date: spyDate,
        spyChange: spyMove.spyChange,
        stockSameDay: stockSameDayChange,
        stockAfter1Day: stockAfter1DayChange,
        stockAfter2Days: stockAfter2DaysChange,
        stockAfter3Days: stockAfter3DaysChange,
        stockAfter7Days: stockAfter7DaysChange,
        spyAfter1Day: spyAfter1DayChange,
        spyAfter2Days: spyAfter2DaysChange,
        spyAfter3Days: spyAfter3DaysChange,
        spyAfter7Days: spyAfter7DaysChange,
      });
    }

    const result = {
      symbol,
      direction,
      correlations,
      dataPoints: spyHistorical.length,
    };

    // Cache the result (4 hours)
    setCache(cacheKey, result, FOUR_HOUR_TTL_MINUTES);

    return createNoCacheResponse(result);
  } catch (error) {
    console.error("Error in spy-correlation API:", error);
    return createNoCacheResponse(
      { error: error.message || "Internal server error" },
      500
    );
  }
}
