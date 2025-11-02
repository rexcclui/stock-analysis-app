import { NextResponse } from 'next/server';
import { getCache, setCache, getCacheKey, FOUR_HOUR_TTL_MINUTES } from '../../../lib/cache';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol required' }, { status: 400 });
  }

  // Check cache first
  const cacheKey = getCacheKey('stock', symbol);
  const cachedData = getCache(cacheKey);
  if (cachedData) {
    console.log(`[CACHE HIT] Stock data for ${symbol}`);
    return NextResponse.json(cachedData);
  }

  try {
    // Fetch company profile from FMP
    const profileResponse = await fetch(
      `https://financialmodelingprep.com/api/v3/profile/${symbol}?apikey=${process.env.FMP_KEY}`
    );
    const profileData = await profileResponse.json();

    if (!profileData || profileData.length === 0) {
      return NextResponse.json({ error: 'Stock not found' }, { status: 404 });
    }

    const profile = profileData[0];

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

      // Prepare chart data for different periods
      chartData = {
        '1D': historical.historical.slice(0, 1).reverse().map(d => ({ date: d.date, price: d.close })),
        '7D': historical.historical.slice(0, 7).reverse().map(d => ({ date: d.date, price: d.close })),
        '1M': historical.historical.slice(0, 30).reverse().map(d => ({ date: d.date, price: d.close })),
        '3M': historical.historical.slice(0, 90).reverse().map(d => ({ date: d.date, price: d.close })),
        '6M': historical.historical.slice(0, 180).reverse().map(d => ({ date: d.date, price: d.close })),
        '1Y': historical.historical.slice(0, 252).reverse().map(d => ({ date: d.date, price: d.close })),
        '3Y': historical.historical.slice(0, 756).reverse().map(d => ({ date: d.date, price: d.close })),
        '5Y': historical.historical.slice(0, 1260).reverse().map(d => ({ date: d.date, price: d.close }))
      };
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
    const dividendYield = (price > 0 && lastDiv > 0) ? ((lastDiv / price) * 100).toFixed(2) : 0;

    const stockData = {
      code: symbol,
      name: profile.companyName,
      website: profile.website,
      exchange: profile.exchangeShortName || profile.exchange || 'N/A',
      currentPrice: price,
      dayChange: quote.changesPercentage || 0,
      marketCap: profile.mktCap 
        ? (profile.mktCap / 1e9).toFixed(2) + 'B'
        : 'N/A',
      pe: peValue,
      dividendYield: dividendYield,
      fiftyTwoWeekRange: profile.range,
      analystRating: profile.dcf > profile.price ? 'Buy' : 'Hold',
      industry: profile.industry || 'N/A',
      sector: profile.sector || 'N/A',
      performance,
      chartData
    };

  // Cache the result (4 hours)
  setCache(cacheKey, stockData, FOUR_HOUR_TTL_MINUTES);

    return NextResponse.json(stockData);
  } catch (error) {
    console.error('Stock API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch stock data' }, { status: 500 });
  }
}