import { NextResponse } from 'next/server';
import { getCache, setCache, getCacheKey, FOUR_HOUR_TTL_MINUTES } from '../../../lib/cache';
import { createNoCacheResponse } from '../../../lib/response';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const industry = searchParams.get('industry');
  const sector = searchParams.get('sector');
  const exclude = searchParams.get('exclude');

  if (!industry && !sector) {
    return createNoCacheResponse({ error: 'Industry or sector required' }, 400);
  }

  // Check cache first
  const cacheKey = getCacheKey('competitors', industry || sector);
  const cachedData = getCache(cacheKey);
  if (cachedData) {
    console.log(`[CACHE HIT] Competitors data for ${industry || sector}`);
    return createNoCacheResponse(cachedData);
  }

  try {
    // First try to get competitors from the same industry
    let competitors = [];
    let comparisonType = 'industry'; // Track what type of comparison we're returning

    if (industry) {
      const industryResponse = await fetch(
        `https://financialmodelingprep.com/api/v3/stock-screener?industry=${industry}&limit=30&apikey=${process.env.FMP_KEY}`
      );
      const industryData = await industryResponse.json();

      if (Array.isArray(industryData) && industryData.length > 0) {
        competitors = industryData
          .filter(stock => stock.symbol !== exclude)
          .slice(0, 29)
          .map(stock => stock.symbol);
      }
    }

    // If no industry competitors found, fallback to sector (same sector, different industries)
    if (competitors.length === 0 && sector) {
      console.log(`No industry competitors found, falling back to sector: ${sector}`);
      comparisonType = 'sector'; // Update comparison type
      const sectorResponse = await fetch(
        `https://financialmodelingprep.com/api/v3/stock-screener?sector=${sector}&limit=30&apikey=${process.env.FMP_KEY}`
      );
      const sectorData = await sectorResponse.json();

      if (Array.isArray(sectorData) && sectorData.length > 0) {
        // Filter to exclude same industry if we know it, and exclude the selected stock
        competitors = sectorData
          .filter(stock => stock.symbol !== exclude && (!industry || stock.industry !== industry))
          .slice(0, 29)
          .map(stock => stock.symbol);
      }
    }

    const result = { competitors, type: comparisonType };

    // Cache the result (4 hours)
    setCache(cacheKey, result, FOUR_HOUR_TTL_MINUTES);

    return createNoCacheResponse(result);
  } catch (error) {
    console.error('Competitors API Error:', error);
    return createNoCacheResponse([]);
  }
}