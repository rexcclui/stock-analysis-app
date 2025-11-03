import { NextResponse } from 'next/server';
import { getCache, setCache, getCacheKey, FOUR_HOUR_TTL_MINUTES } from '../../../lib/cache';
import { createNoCacheResponse } from '../../../lib/response';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return createNoCacheResponse({ error: 'Symbol required' }, 400);
  }

  const cacheKey = getCacheKey('sentiment', symbol);
  const cachedData = getCache(cacheKey);
  if (cachedData) {
    console.log(`[CACHE HIT] Sentiment data for ${symbol}`);
    return createNoCacheResponse(cachedData);
  }

  try {
    const sentimentResponse = await fetch(
       `https://financialmodelingprep.com/api/v4/social-sentiment?symbol=${symbol}&page=0&apikey=${process.env.FMP_KEY}`
    );

    if (!sentimentResponse.ok) {
      throw new Error(`API returned status ${sentimentResponse.status}`);
    }

    const sentimentData = await sentimentResponse.json();
    console.log(`[SENTIMENT API] Received ${Array.isArray(sentimentData) ? sentimentData.length : 0} records for ${symbol}`);

    let score = 0.5;
    let positive = 50;
    let neutral = 30;
    let negative = 20;
    let sentimentHistory = { '1D': 0.5, '7D': 0.5, '1M': 0.5 };
    let sentimentTimeSeries = [];

    if (Array.isArray(sentimentData) && sentimentData.length > 0) {
      const validData = sentimentData.filter(item => 
        (item.stocktwitsSentiment > 0 || item.twitterSentiment > 0)
      );

      if (validData.length > 0) {
        const dailySentiments = {};
        const thirtyDaysAgo = new Date(new Date().setDate(new Date().getDate() - 30));

        validData.forEach(item => {
            const itemDate = new Date(item.date);
            if (itemDate >= thirtyDaysAgo) {
                const day = itemDate.toISOString().split('T')[0];
                if (!dailySentiments[day]) {
                    dailySentiments[day] = { stocktwitsTotal: 0, stocktwitsCount: 0, twitterTotal: 0, twitterCount: 0 };
                }
                if (item.stocktwitsSentiment > 0) {
                    dailySentiments[day].stocktwitsTotal += item.stocktwitsSentiment;
                    dailySentiments[day].stocktwitsCount++;
                }
                if (item.twitterSentiment > 0) {
                    dailySentiments[day].twitterTotal += item.twitterSentiment;
                    dailySentiments[day].twitterCount++;
                }
            }
        });

        // Convert daily sentiments to time series (only days with actual data)
        sentimentTimeSeries = Object.keys(dailySentiments)
            .map(day => {
                const dayData = dailySentiments[day];
                const stocktwitsAvg = dayData.stocktwitsCount > 0 ? dayData.stocktwitsTotal / dayData.stocktwitsCount : 0;
                const twitterAvg = dayData.twitterCount > 0 ? dayData.twitterTotal / dayData.twitterCount : 0;

                let score = 0.5; // Default score
                if (stocktwitsAvg > 0 && twitterAvg > 0) {
                    score = (stocktwitsAvg + twitterAvg) / 2;
                } else if (stocktwitsAvg > 0) {
                    score = stocktwitsAvg;
                } else if (twitterAvg > 0) {
                    score = twitterAvg;
                }

                return {
                    date: day,
                    score: parseFloat(score.toFixed(2))
                };
            })
            .sort((a, b) => new Date(a.date) - new Date(b.date));

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

        score = sentimentCount > 0 ? parseFloat((totalSentiment / sentimentCount).toFixed(2)) : 0.5;
        positive = Math.round(score * 100);
        negative = Math.round((1 - score) * 100);
        neutral = 100 - positive - negative;

        const now = new Date();
        const calculatePeriodSentiment = (hoursBack) => {
          const cutoffTime = new Date(now.getTime() - hoursBack * 60 * 60 * 1000);
          const periodData = validData.filter(item => new Date(item.date) >= cutoffTime);

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

        sentimentHistory = {
          '1D': calculatePeriodSentiment(24),
          '7D': calculatePeriodSentiment(24 * 7),
          '1M': calculatePeriodSentiment(24 * 30)
        };
      }
    }

    const result = {
      score,
      positive,
      neutral,
      negative,
      sentimentHistory,
      sentimentTimeSeries,
      source: 'FMP Social Sentiment'
    };

  setCache(cacheKey, result, FOUR_HOUR_TTL_MINUTES);

    return createNoCacheResponse(result);
  } catch (error) {
    console.error('Sentiment API Error:', error.message);
    return createNoCacheResponse({
      score: 0.5,
      positive: 50,
      neutral: 30,
      negative: 20,
      sentimentHistory: { '1D': 0.5, '7D': 0.5, '1M': 0.5 },
      sentimentTimeSeries: [],
      source: 'Default (API unavailable)'
    });
  }
}