import { NextResponse } from 'next/server';
import { getCache, setCache, getCacheKey, FOUR_HOUR_TTL_MINUTES } from '../../../lib/cache';
import { createNoCacheResponse } from '../../../lib/response';

// In-flight deduplication: symbol -> promise
const inFlightNews = new Map();

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

  let resultPromise = inFlightNews.get(symbol);
  if (!resultPromise) {
    resultPromise = (async () => {
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
        setCache(cacheKey, news, FOUR_HOUR_TTL_MINUTES);
        return { ok: true, payload: news };
      } catch (error) {
        console.error(`News API Error for ${symbol}: ${error.message}`);
        return { ok: false, payload: [
          {
            title: `Unable to fetch news for ${symbol}`,
            sentiment: 'neutral',
            date: new Date().toISOString().split('T')[0],
            error: true,
          },
        ] };
      }
    })();
    inFlightNews.set(symbol, resultPromise);
    resultPromise.finally(() => {
      inFlightNews.delete(symbol);
    });
  }

  const outcome = await resultPromise;
  console.log(`[NEWS RESULT] Symbol: ${symbol}, OK: ${outcome.ok}, Count: ${outcome.payload?.length || 0}`);
  if (outcome.ok) {
    return createNoCacheResponse(outcome.payload);
  } else {
    return createNoCacheResponse(outcome.payload, 500);
  }
}