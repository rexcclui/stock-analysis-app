import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const sector = searchParams.get('sector');
  const exclude = searchParams.get('exclude');

  if (!sector) {
    return NextResponse.json({ error: 'Sector required' }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://financialmodelingprep.com/api/v3/stock-screener?sector=${sector}&limit=5&apikey=${process.env.FMP_KEY}`
    );
    const data = await response.json();

    const competitors = data
      .filter(stock => stock.symbol !== exclude)
      .slice(0, 4)
      .map(stock => stock.symbol);

    return NextResponse.json(competitors);
  } catch (error) {
    console.error('Competitors API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch competitors' }, { status: 500 });
  }
}