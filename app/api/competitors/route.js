import { NextResponse } from 'next/server';
import { getCache, setCache, getCacheKey, FOUR_HOUR_TTL_MINUTES } from '../../../lib/cache';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const industry = searchParams.get('industry');
  const exclude = searchParams.get('exclude');

  if (!industry) {
    return NextResponse.json({ error: 'Industry required' }, { status: 400 });
  }

  // Check cache first
  const cacheKey = getCacheKey('competitors', industry);
  const cachedData = getCache(cacheKey);
  if (cachedData) {
    console.log(`[CACHE HIT] Competitors data for industry ${industry}`);
    return NextResponse.json(cachedData);
  }

  try {
    const response = await fetch(
      `https://financialmodelingprep.com/api/v3/stock-screener?industry=${industry}&limit=30&apikey=${process.env.FMP_KEY}`
    );
    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error('Invalid response from API');
    }

    const competitors = data
      .filter(stock => stock.symbol !== exclude)
      .slice(0, 29)
      .map(stock => stock.symbol);

  // Cache the result (4 hours)
  setCache(cacheKey, competitors, FOUR_HOUR_TTL_MINUTES);

    return NextResponse.json(competitors);
  } catch (error) {
    console.error('Competitors API Error:', error);
    return NextResponse.json([]);
  }
}