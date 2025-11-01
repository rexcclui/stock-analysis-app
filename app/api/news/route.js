import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol required' }, { status: 400 });
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

    return NextResponse.json(news);
  } catch (error) {
    console.error('News API Error:', error);
    return NextResponse.json([
      {
        title: 'Unable to fetch latest news',
        sentiment: 'neutral',
        date: new Date().toISOString().split('T')[0]
      }
    ]);
  }
}