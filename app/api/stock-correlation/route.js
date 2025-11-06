import { NextResponse } from "next/server";
import { getCache, setCache, getCacheKey, FOUR_HOUR_TTL_MINUTES } from '../../../lib/cache';
import { createNoCacheResponse } from '../../../lib/response';
import {
  calculateReturns,
  alignReturns,
  calculateCorrelation,
  crossCorrelation,
  findLeadingStock,
  rollingCorrelation
} from '../../../lib/correlationUtils';

export const dynamic = 'force-dynamic';

const FMP_KEY = process.env.FMP_KEY;

/**
 * API endpoint to calculate correlation between two stocks
 * Query params:
 *   - symbol1: First stock symbol (required)
 *   - symbol2: Second stock symbol (required)
 *   - years: Number of years of historical data (default: 5)
 *   - maxLag: Maximum lag for lead-lag analysis (default: 10)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol1 = searchParams.get("symbol1");
    const symbol2 = searchParams.get("symbol2");
    const years = parseInt(searchParams.get("years") || "5");
    const maxLag = parseInt(searchParams.get("maxLag") || "10");

    if (!symbol1 || !symbol2) {
      return createNoCacheResponse(
        { error: "Both symbol1 and symbol2 are required" },
        400
      );
    }

    // Check cache first
    const cacheKey = getCacheKey(`stockcorr-${symbol1}-${symbol2}-${years}y-${maxLag}lag`, 'correlation');
    const cachedData = getCache(cacheKey);
    if (cachedData) {
      console.log(`[CACHE HIT] Stock correlation for ${symbol1} vs ${symbol2}`);
      return createNoCacheResponse(cachedData);
    }

    // Fetch historical data for both stocks
    const [stock1Response, stock2Response] = await Promise.all([
      fetch(`https://financialmodelingprep.com/api/v3/historical-price-full/${symbol1}?apikey=${FMP_KEY}`),
      fetch(`https://financialmodelingprep.com/api/v3/historical-price-full/${symbol2}?apikey=${FMP_KEY}`)
    ]);

    if (!stock1Response.ok || !stock2Response.ok) {
      throw new Error("Failed to fetch stock data");
    }

    const [stock1Data, stock2Data] = await Promise.all([
      stock1Response.json(),
      stock2Response.json()
    ]);

    if (!stock1Data.historical || stock1Data.historical.length === 0) {
      return createNoCacheResponse(
        { error: `No data available for ${symbol1}` },
        404
      );
    }

    if (!stock2Data.historical || stock2Data.historical.length === 0) {
      return createNoCacheResponse(
        { error: `No data available for ${symbol2}` },
        404
      );
    }

    // Filter to specified years
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - years);

    const stock1Historical = stock1Data.historical
      .filter((item) => new Date(item.date) >= cutoffDate)
      .map(item => ({ date: item.date, close: item.close }));

    const stock2Historical = stock2Data.historical
      .filter((item) => new Date(item.date) >= cutoffDate)
      .map(item => ({ date: item.date, close: item.close }));

    // Calculate returns
    const returns1 = calculateReturns(stock1Historical);
    const returns2 = calculateReturns(stock2Historical);

    // Align returns by date
    const aligned = alignReturns(returns1, returns2);

    if (aligned.returns1.length === 0) {
      return createNoCacheResponse(
        { error: "No overlapping dates between the two stocks" },
        400
      );
    }

    // Calculate basic correlation
    const basicCorrelation = calculateCorrelation(aligned.returns1, aligned.returns2);

    // Calculate cross-correlation for lead-lag analysis
    const crossCorr = crossCorrelation(aligned.returns1, aligned.returns2, maxLag);

    // Find best lead-lag relationship
    const leadLag = findLeadingStock(crossCorr, symbol1, symbol2);

    // Calculate rolling correlation (30-day window)
    const rolling = rollingCorrelation(aligned.returns1, aligned.returns2, aligned.dates, 30);

    // Calculate correlation strength categories
    const correlationStrength = Math.abs(basicCorrelation);
    let strength = 'Weak';
    if (correlationStrength > 0.7) strength = 'Very Strong';
    else if (correlationStrength > 0.5) strength = 'Strong';
    else if (correlationStrength > 0.3) strength = 'Moderate';

    const result = {
      symbol1,
      symbol2,
      years,
      dataPoints: aligned.returns1.length,
      correlation: {
        value: basicCorrelation,
        strength,
        direction: basicCorrelation > 0 ? 'Positive' : 'Negative'
      },
      leadLag: {
        bestLag: leadLag.lag,
        bestCorrelation: leadLag.correlation,
        leader: leadLag.leader,
        leaderSymbol: leadLag.leaderSymbol,
        followerSymbol: leadLag.followerSymbol,
        leadDays: leadLag.leadDays,
        interpretation: leadLag.interpretation
      },
      crossCorrelation: crossCorr,
      rollingCorrelation: rolling,
      summary: {
        avgReturn1: aligned.returns1.reduce((sum, r) => sum + r, 0) / aligned.returns1.length,
        avgReturn2: aligned.returns2.reduce((sum, r) => sum + r, 0) / aligned.returns2.length,
        volatility1: Math.sqrt(aligned.returns1.reduce((sum, r) => sum + r * r, 0) / aligned.returns1.length),
        volatility2: Math.sqrt(aligned.returns2.reduce((sum, r) => sum + r * r, 0) / aligned.returns2.length)
      }
    };

    // Cache the result (4 hours)
    setCache(cacheKey, result, FOUR_HOUR_TTL_MINUTES);

    return createNoCacheResponse(result);
  } catch (error) {
    console.error("Error in stock-correlation API:", error);
    return createNoCacheResponse(
      { error: error.message || "Internal server error" },
      500
    );
  }
}
