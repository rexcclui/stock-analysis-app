import { NextResponse } from 'next/server';
import { getCache, setCache, getCacheKey } from '../../../lib/cache';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const sector = searchParams.get('sector');
  const exclude = searchParams.get('exclude');

  if (!sector) {
    return NextResponse.json({ error: 'Sector required' }, { status: 400 });
  }

  // Check cache first
  const cacheKey = getCacheKey('competitors', sector);
  const cachedData = getCache(cacheKey);
  if (cachedData) {
    console.log(`[CACHE HIT] Competitors data for sector ${sector}`);
    return NextResponse.json(cachedData);
  }

  try {
    const response = await fetch(
      `https://financialmodelingprep.com/api/v3/stock-screener?sector=${sector}&limit=10&apikey=${process.env.FMP_KEY}`
    );
    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error('Invalid response from API');
    }

    const competitors = data
      .filter(stock => stock.symbol !== exclude)
      .slice(0, 4)
      .map(stock => stock.symbol);

    // Cache the result (24 hours)
    setCache(cacheKey, competitors, 1440);

    return NextResponse.json(competitors);
  } catch (error) {
    console.error('Competitors API Error:', error);
    return NextResponse.json([]);
  }
}