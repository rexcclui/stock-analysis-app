import { NextResponse } from 'next/server';
import { getCache, setCache, getCacheKey, FOUR_HOUR_TTL_MINUTES } from '../../../lib/cache';
import { createNoCacheResponse } from '../../../lib/response';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return createNoCacheResponse({ error: 'Symbol required' }, 400);
  }

  // Check cache first
  const cacheKey = getCacheKey('news', symbol);
  const cachedData = getCache(cacheKey);
  if (cachedData) {
    console.log(`[CACHE HIT] News data for ${symbol}`);
    return createNoCacheResponse(cachedData);
  }

  try {
    const response = await fetch(
      `https://newsapi.org/v2/everything?q=${symbol}&sortBy=publishedAt&language=en&pageSize=5&apiKey=${process.env.NEWS_API_KEY}`
    );
    const data = await response.json();

    if (data.status === 'error') {
      throw new Error(data.message);
    }

    const news = data.articles?.map(article => ({
      title: article.title,
      sentiment: 'neutral',
      date: article.publishedAt.split('T')[0],
      url: article.url
    })) || [];

  // Cache the result (4 hours)
  setCache(cacheKey, news, FOUR_HOUR_TTL_MINUTES);

    return createNoCacheResponse(news);
  } catch (error) {
    console.error(`News API Error for ${symbol}: ${error.message}`);
    return createNoCacheResponse(
      [
        {
          title: `Unable to fetch news for ${symbol}`,
          sentiment: 'neutral',
          date: new Date().toISOString().split('T')[0],
          error: true,
        },
      ],
      500
    );
  }
}