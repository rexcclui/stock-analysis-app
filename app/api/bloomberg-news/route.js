import { getCache, setCache, getCacheKey, FOUR_HOUR_TTL_MINUTES } from '../../../lib/cache';
import { createNoCacheResponse } from '../../../lib/response';

// In-flight deduplication: symbol -> promise
const inFlightBloombergNews = new Map();

// Simple XML parser for RSS feeds (no external dependencies)
function parseRSSFeed(xmlText) {
  const items = [];

  // Match all <item> blocks
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let itemMatch;

  while ((itemMatch = itemRegex.exec(xmlText)) !== null) {
    const itemContent = itemMatch[1];

    // Extract title
    const titleMatch = /<title><!\[CDATA\[(.*?)\]\]><\/title>/.exec(itemContent) ||
                       /<title>(.*?)<\/title>/.exec(itemContent);
    const title = titleMatch ? titleMatch[1] : 'No title';

    // Extract link
    const linkMatch = /<link>(.*?)<\/link>/.exec(itemContent);
    const link = linkMatch ? linkMatch[1].trim() : '';

    // Extract pubDate
    const dateMatch = /<pubDate>(.*?)<\/pubDate>/.exec(itemContent);
    const pubDate = dateMatch ? dateMatch[1] : new Date().toISOString();

    // Extract source
    const sourceMatch = /<source.*?>(.*?)<\/source>/.exec(itemContent);
    const source = sourceMatch ? sourceMatch[1] : 'Bloomberg';

    items.push({
      title,
      url: link,
      date: new Date(pubDate).toISOString().split('T')[0],
      source,
      sentiment: 'neutral'
    });
  }

  return items;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return createNoCacheResponse({ error: 'Symbol required' }, 400);
  }

  // Check cache first
  const cacheKey = getCacheKey('bloomberg-news', symbol);
  const cachedData = getCache(cacheKey);
  if (cachedData) {
    console.log(`[CACHE HIT] Bloomberg News data for ${symbol}`);
    return createNoCacheResponse(cachedData);
  }

  let resultPromise = inFlightBloombergNews.get(symbol);
  if (!resultPromise) {
    resultPromise = (async () => {
      try {
        console.log(`[BLOOMBERG-NEWS] Fetching news for ${symbol}`);

        // Use Google News RSS but filter for Bloomberg articles
        const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(symbol + ' stock site:bloomberg.com')}&hl=en-US&gl=US&ceid=US:en`;

        const response = await fetch(rssUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        if (!response.ok) {
          throw new Error(`Bloomberg News RSS error: ${response.status}`);
        }

        const xmlData = await response.text();

        // Parse RSS feed
        const articles = parseRSSFeed(xmlData).slice(0, 20); // Limit to 20 articles

        console.log(`[BLOOMBERG-NEWS] Found ${articles.length} articles for ${symbol}`);

        setCache(cacheKey, articles, FOUR_HOUR_TTL_MINUTES);
        return { ok: true, payload: articles };
      } catch (error) {
        console.error(`Bloomberg News Error for ${symbol}: ${error.message}`);
        return { ok: false, payload: [
          {
            title: `Unable to fetch Bloomberg news for ${symbol}`,
            sentiment: 'neutral',
            date: new Date().toISOString().split('T')[0],
            error: true,
          },
        ] };
      }
    })();
    inFlightBloombergNews.set(symbol, resultPromise);
    resultPromise.finally(() => {
      inFlightBloombergNews.delete(symbol);
    });
  }

  const outcome = await resultPromise;
  console.log(`[BLOOMBERG-NEWS RESULT] Symbol: ${symbol}, OK: ${outcome.ok}, Count: ${outcome.payload?.length || 0}`);
  if (outcome.ok) {
    return createNoCacheResponse(outcome.payload);
  } else {
    return createNoCacheResponse(outcome.payload, 500);
  }
}
