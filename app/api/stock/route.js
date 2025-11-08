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
  const cacheKey = getCacheKey('stock', symbol);
  const cachedData = getCache(cacheKey);
  if (cachedData) {
    console.log(`[CACHE HIT] Stock data for ${symbol}`);
    return createNoCacheResponse(cachedData);
  }

  try {
    // Fetch company profile from FMP
    const profileResponse = await fetch(
      `https://financialmodelingprep.com/api/v3/profile/${symbol}?apikey=${process.env.FMP_KEY}`
    );
    const profileData = await profileResponse.json();

    // Normalize profile data: FMP may return either an array or an object.
    if (!profileData) {
      return createNoCacheResponse({ error: 'Stock not found' }, 404);
    }

    let profile = null;
    if (Array.isArray(profileData)) {
      if (profileData.length === 0) {
        return createNoCacheResponse({ error: 'Stock not found' }, 404);
      }
      profile = profileData[0];
    } else if (typeof profileData === 'object') {
      profile = profileData;
    } else {
      return createNoCacheResponse({ error: 'Stock not found' }, 404);
    }

    // Fetch quote for current price and day change
    const quoteResponse = await fetch(
      `https://financialmodelingprep.com/api/v3/quote/${symbol}?apikey=${process.env.FMP_KEY}`
    );
    const quoteData = await quoteResponse.json();
    const quote = quoteData[0] || {};

    // Fetch historical prices from FMP
    const historicalResponse = await fetch(
      `https://financialmodelingprep.com/api/v3/historical-price-full/${symbol}?apikey=${process.env.FMP_KEY}`
    );
    const historical = await historicalResponse.json();

    let performance = {
      '1D': 0, '7D': 0, '1M': 0, '3M': 0,
      '6M': 0, '1Y': 0, '3Y': 0, '5Y': 0
    };

    let chartData = [];

    if (historical.historical && Array.isArray(historical.historical) && historical.historical.length > 0) {
      const calculatePerformance = (days) => {
        if (historical.historical.length <= days) return 0;
        const current = historical.historical[0].close;
        const past = historical.historical[days]?.close;
        if (!past || !current) return 0;
        return parseFloat(((current - past) / past * 100).toFixed(2));
      };

      performance = {
        '1D': calculatePerformance(1),
        '7D': calculatePerformance(7),
        '1M': calculatePerformance(30),
        '3M': calculatePerformance(90),
        '6M': calculatePerformance(180),
        '1Y': calculatePerformance(252),
        '3Y': historical.historical.length > 756 ? calculatePerformance(756) : (historical.historical.length > 252 ? calculatePerformance(historical.historical.length - 1) : 0),
        '5Y': historical.historical.length > 1260 ? calculatePerformance(1260) : (historical.historical.length > 252 ? calculatePerformance(historical.historical.length - 1) : 0)
      };

      // Helper function to format dates based on period
      const formatDate = (dateStr, isLongPeriod) => {
        const d = new Date(dateStr);
        if (isLongPeriod) {
          // yyyy-mm format for periods > 3 years
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          return `${yyyy}-${mm}`;
        } else {
          // yy-mm-dd format for shorter periods
          const yy = String(d.getFullYear()).slice(-2);
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          return `${yy}-${mm}-${dd}`;
        }
      };

      // Prepare full historical data for chart (reversed so oldest is first, newest is last)
      const fullHistoricalData = historical.historical.slice().reverse().map(d => ({
        date: d.date,
        price: d.close,
        volume: d.volume || 0,
        rawDate: d.date
      }));

      // Prepare chart data for different periods (for backward compatibility and initial view)
      chartData = {
        '1D': historical.historical.slice(0, 1).reverse().map(d => ({ date: formatDate(d.date, false), price: d.close })),
        '7D': historical.historical.slice(0, 7).reverse().map(d => ({ date: formatDate(d.date, false), price: d.close })),
        '1M': historical.historical.slice(0, 30).reverse().map(d => ({ date: formatDate(d.date, false), price: d.close })),
        '3M': historical.historical.slice(0, 90).reverse().map(d => ({ date: formatDate(d.date, false), price: d.close })),
        '6M': historical.historical.slice(0, 180).reverse().map(d => ({ date: formatDate(d.date, false), price: d.close })),
        '1Y': historical.historical.slice(0, 252).reverse().map(d => ({ date: formatDate(d.date, false), price: d.close })),
        '3Y': historical.historical.slice(0, 756).reverse().map(d => ({ date: formatDate(d.date, true), price: d.close })),
        '5Y': historical.historical.slice(0, 1260).reverse().map(d => ({ date: formatDate(d.date, true), price: d.close }))
      };

      // Add full historical data
      chartData.fullHistorical = fullHistoricalData;
    }

    // P/E ratio fallbacks & computation
    const rawPe = (
      (typeof profile.pe === 'number' ? profile.pe : null) ??
      (typeof profile.priceToEarnings === 'number' ? profile.priceToEarnings : null) ??
      (typeof quote.pe === 'number' ? quote.pe : null) ??
      (typeof quote.priceToEarningsRatio === 'number' ? quote.priceToEarningsRatio : null)
    );

    let peValue = 'N/A';
    if (typeof rawPe === 'number' && rawPe > 0) {
      peValue = rawPe.toFixed(2);
    } else {
      // Try compute using price / eps if eps positive
      const eps = typeof profile.eps === 'number' ? profile.eps : null;
      const priceForPe = (typeof quote.price === 'number' ? quote.price : null) ?? (typeof profile.price === 'number' ? profile.price : null);
      if (eps !== null) {
        if (eps > 0 && priceForPe && priceForPe > 0) {
          peValue = (priceForPe / eps).toFixed(2);
        } else if (eps <= 0) {
          peValue = '—'; // Dash indicates negative or zero earnings
        }
      }
    }

    const price = quote.price || profile.price || 0;
    const lastDiv = profile.lastDiv || 0;
  const dividendYieldRaw = (price > 0 && lastDiv > 0) ? ((lastDiv / price) * 100).toFixed(2) : null;
  const dividendYield = dividendYieldRaw ? dividendYieldRaw + '%' : '—';
  const betaValue = (typeof profile.beta === 'number' && profile.beta !== 0) ? profile.beta.toFixed(2) : (profile.beta || 'N/A');

  // Calculate resistance and support from historical data
  let resistance = null;
  let support = null;
  if (historical.historical && Array.isArray(historical.historical) && historical.historical.length > 0) {
    const last30Days = historical.historical.slice(0, 30);
    const prices = last30Days.map(d => d.close);
    resistance = Math.max(...prices);
    support = Math.min(...prices);
  }

    const stockData = {
      code: symbol,
      name: profile?.companyName || profile?.company || 'N/A',
      website: profile?.website || null,
      exchange: profile?.exchangeShortName || profile?.exchange || 'N/A',
      currentPrice: price,
      dayChange: quote?.changesPercentage || 0,
      marketCap: (typeof profile?.mktCap === 'number')
        ? (profile.mktCap / 1e9).toFixed(1) + 'B'
        : (profile?.mktCap ? String(profile.mktCap) : 'N/A'),
      pe: peValue,
      beta: betaValue,
      dividendYield: dividendYield,
      fiftyTwoWeekRange: profile?.range || 'N/A',
      // Compute analyst rating defensively: dcf and price must be numbers
      analystRating: (typeof profile?.dcf === 'number' && typeof profile?.price === 'number')
        ? (profile.dcf > profile.price ? 'Buy' : 'Hold')
        : 'N/A',
      industry: profile?.industry || 'N/A',
      sector: profile?.sector || 'N/A',
      resistance,
      support,
      performance,
      chartData
    };

  // Cache the result (4 hours)
  setCache(cacheKey, stockData, FOUR_HOUR_TTL_MINUTES);

    return createNoCacheResponse(stockData);
  } catch (error) {
    console.error('Stock API Error:', error);
    return createNoCacheResponse({ error: 'Failed to fetch stock data' }, 500);
  }
}