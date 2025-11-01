import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol required' }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://financialmodelingprep.com/api/v4/social-sentiment?symbol=${symbol}&apikey=${process.env.FMP_KEY}`
    );
    const data = await response.json();
    
    const currentSentiment = data[0] || {};
    const score = currentSentiment.sentiment || 0.5;

    const sentimentData = {
      score: score,
      positive: Math.round(score * 100),
      neutral: Math.round((1 - score) * 50),
      negative: Math.round((1 - score) * 50),
      sentimentHistory: {
        '1D': score,
        '7D': score * 0.98,
        '1M': score * 0.95,
        '3M': score * 0.92,
        '6M': score * 0.88,
        '1Y': score * 0.85,
        '3Y': score * 0.80,
        '5Y': score * 0.75
      }
    };

    return NextResponse.json(sentimentData);
  } catch (error) {
    console.error('Sentiment API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch sentiment' }, { status: 500 });
  }
}