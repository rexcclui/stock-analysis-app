import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol required' }, { status: 400 });
  }

  try {
    // Fetch real social sentiment data from FMP
    const sentimentResponse = await fetch(
      `https://financialmodelingprep.com/api/v4/social-sentiment?symbol=${symbol}&apikey=${process.env.FMP_KEY}`
    );
    
    if (!sentimentResponse.ok) {
      throw new Error(`API returned status ${sentimentResponse.status}`);
    }

    const sentimentData = await sentimentResponse.json();

    // Initialize with defaults
    let score = 0.5;
    let positive = 50;
    let neutral = 30;
    let negative = 20;
    let sentimentHistory = {
      '1D': 0.5, '7D': 0.5, '1M': 0.5, '3M': 0.5,
      '6M': 0.5, '1Y': 0.5, '3Y': 0.5, '5Y': 0.5
    };

    // Process array of hourly sentiment data from FMP
    if (Array.isArray(sentimentData) && sentimentData.length > 0) {
      // Filter out entries with zero sentiment (no data for that hour)
      const validData = sentimentData.filter(item => 
        (item.stocktwitsSentiment > 0 || item.twitterSentiment > 0)
      );

      if (validData.length > 0) {
        // Calculate current average sentiment from both sources
        let totalSentiment = 0;
        let sentimentCount = 0;

        validData.forEach(item => {
          if (item.stocktwitsSentiment > 0) {
            totalSentiment += item.stocktwitsSentiment;
            sentimentCount++;
          }
          if (item.twitterSentiment > 0) {
            totalSentiment += item.twitterSentiment;
            sentimentCount++;
          }
        });

        // Current overall score (0-1 scale where 0.5 = neutral)
        score = sentimentCount > 0 ? parseFloat((totalSentiment / sentimentCount).toFixed(2)) : 0.5;

        // Convert score to sentiment distribution
        // Sentiment is on 0-1 scale: 0 = very negative, 0.5 = neutral, 1 = very positive
        positive = Math.round(score * 100);
        negative = Math.round((1 - score) * 100);
        neutral = 100 - positive - negative;

        // Calculate historical sentiment by time periods
        const now = new Date();
        const calculatePeriodSentiment = (hoursBack) => {
          const cutoffTime = new Date(now.getTime() - hoursBack * 60 * 60 * 1000);
          const periodData = validData.filter(item => {
            const itemDate = new Date(item.date);
            return itemDate >= cutoffTime;
          });

          if (periodData.length === 0) return score;

          let totalPeriodSentiment = 0;
          let periodCount = 0;

          periodData.forEach(item => {
            if (item.stocktwitsSentiment > 0) {
              totalPeriodSentiment += item.stocktwitsSentiment;
              periodCount++;
            }
            if (item.twitterSentiment > 0) {
              totalPeriodSentiment += item.twitterSentiment;
              periodCount++;
            }
          });

          return periodCount > 0 ? parseFloat((totalPeriodSentiment / periodCount).toFixed(2)) : score;
        };

        // Generate sentiment history for different periods
        sentimentHistory = {
          '1D': calculatePeriodSentiment(24),
          '7D': calculatePeriodSentiment(24 * 7),
          '1M': calculatePeriodSentiment(24 * 30),
          '3M': calculatePeriodSentiment(24 * 90),
          '6M': calculatePeriodSentiment(24 * 180),
          '1Y': calculatePeriodSentiment(24 * 365),
          '3Y': calculatePeriodSentiment(24 * 365 * 3),
          '5Y': calculatePeriodSentiment(24 * 365 * 5)
        };
      }
    }

    return NextResponse.json({
      score,
      positive,
      neutral,
      negative,
      sentimentHistory,
      source: 'FMP Social Sentiment'
    });
  } catch (error) {
    console.error('Sentiment API Error:', error.message);
    return NextResponse.json({
      score: 0.5,
      positive: 50,
      neutral: 30,
      negative: 20,
      sentimentHistory: {
        '1D': 0.5, '7D': 0.5, '1M': 0.5, '3M': 0.5,
        '6M': 0.5, '1Y': 0.5, '3Y': 0.5, '5Y': 0.5
      },
      source: 'Default (API unavailable)'
    });
  }
}