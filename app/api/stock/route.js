import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol required' }, { status: 400 });
  }

  try {
    // Fetch stock overview from Alpha Vantage
    const overviewResponse = await fetch(
      `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${process.env.ALPHA_VANTAGE_KEY}`
    );
    const overview = await overviewResponse.json();

    // Fetch historical prices from FMP
    const historicalResponse = await fetch(
      `https://financialmodelingprep.com/api/v3/historical-price-full/${symbol}?apikey=${process.env.FMP_KEY}`
    );
    const historical = await historicalResponse.json();

    // Calculate performance
    const calculatePerformance = (days) => {
      if (!historical.historical || historical.historical.length < days) return 0;
      const current = historical.historical[0].close;
      const past = historical.historical[days]?.close || current;
      return ((current - past) / past * 100).toFixed(2);
    };

    const stockData = {
      code: symbol,
      name: overview.Name,
      exchange: overview.Exchange,
      marketCap: (parseFloat(overview.MarketCapitalization) / 1e9).toFixed(2) + 'B',
      pe: parseFloat(overview.PERatio).toFixed(2),
      analystRating: overview.AnalystTargetPrice > overview['50DayMovingAverage'] ? 'Buy' : 'Hold',
      industry: overview.Industry,
      sector: overview.Sector,
      performance: {
        '1D': parseFloat(calculatePerformance(1)),
        '7D': parseFloat(calculatePerformance(7)),
        '1M': parseFloat(calculatePerformance(30)),
        '3M': parseFloat(calculatePerformance(90)),
        '6M': parseFloat(calculatePerformance(180)),
        '1Y': parseFloat(calculatePerformance(365)),
        '3Y': parseFloat(calculatePerformance(1095)),
        '5Y': parseFloat(calculatePerformance(1825))
      }
    };

    return NextResponse.json(stockData);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch stock data' }, { status: 500 });
  }
}