import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * AI-powered news analysis endpoint
 * Analyzes all news articles for a stock symbol and generates comprehensive summary
 *
 * Query params:
 * - symbol: Stock symbol (e.g., AAPL)
 * - newsData: JSON string containing all news articles from different sources
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { symbol, newsApiNews = [], googleNews = [], yahooNews = [], bloombergNews = [] } = body;

    if (!symbol) {
      return NextResponse.json({ error: 'Stock symbol is required' }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
    }

    // Combine all news sources
    const allNews = [
      ...newsApiNews.map(n => ({ ...n, source: n.source || 'NewsAPI' })),
      ...googleNews.map(n => ({ ...n, source: n.source || 'Google News' })),
      ...yahooNews.map(n => ({ ...n, source: n.source || 'Yahoo Finance' })),
      ...bloombergNews.map(n => ({ ...n, source: n.source || 'Bloomberg' }))
    ].filter(article => article.title && !article.error);

    if (allNews.length === 0) {
      return NextResponse.json({ error: 'No news articles available for analysis' }, { status: 400 });
    }

    // Prepare news data for AI analysis
    const newsText = allNews.map((article, idx) =>
      `${idx + 1}. [${article.date}] ${article.source}: ${article.title}`
    ).join('\n');

    // Create AI prompt for comprehensive analysis
    const prompt = `You are a financial analyst. Analyze the following news articles about ${symbol} stock and provide a comprehensive summary.

News Articles:
${newsText}

Please provide a detailed analysis in the following JSON format:
{
  "overallSentiment": "positive" | "negative" | "neutral" | "mixed",
  "confidenceLevel": "high" | "medium" | "low",
  "summary": "A 2-3 sentence overview of the key themes and developments",
  "positiveImpacts": [
    { "point": "specific positive impact", "reasoning": "why this matters" }
  ],
  "negativeImpacts": [
    { "point": "specific negative impact", "reasoning": "why this matters" }
  ],
  "marketExpectation": {
    "alignment": "exceeds" | "meets" | "below" | "unclear",
    "explanation": "How the news aligns with market expectations"
  },
  "shortTermImpact": {
    "direction": "bullish" | "bearish" | "neutral",
    "magnitude": "high" | "medium" | "low",
    "timeframe": "days to weeks",
    "explanation": "Expected short-term market reaction"
  },
  "longTermImpact": {
    "direction": "bullish" | "bearish" | "neutral",
    "magnitude": "high" | "medium" | "low",
    "timeframe": "months to years",
    "explanation": "Expected long-term fundamental impact"
  },
  "keyRisks": [
    "risk factor 1",
    "risk factor 2"
  ],
  "keyOpportunities": [
    "opportunity 1",
    "opportunity 2"
  ],
  "analystRecommendation": "strong buy" | "buy" | "hold" | "sell" | "strong sell",
  "recommendationReasoning": "Brief explanation of the recommendation"
}

Provide ONLY the JSON response, no additional text.`;

    console.log(`[AI News Analysis] Analyzing ${allNews.length} articles for ${symbol}`);

    // Call Anthropic API
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    // Extract and parse the response
    const responseText = message.content[0].text;
    console.log('[AI News Analysis] Raw response:', responseText);

    // Parse JSON from response
    let analysis;
    try {
      // Try to extract JSON if there's any extra text
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        analysis = JSON.parse(responseText);
      }
    } catch (parseError) {
      console.error('[AI News Analysis] JSON parse error:', parseError);
      return NextResponse.json({
        error: 'Failed to parse AI response',
        rawResponse: responseText
      }, { status: 500 });
    }

    // Add metadata
    const result = {
      ...analysis,
      symbol,
      analyzedAt: new Date().toISOString(),
      articlesAnalyzed: allNews.length,
      sources: {
        newsApi: newsApiNews.length,
        google: googleNews.length,
        yahoo: yahooNews.length,
        bloomberg: bloombergNews.length
      }
    };

    console.log(`[AI News Analysis] Successfully analyzed ${symbol}`);

    return NextResponse.json(result);

  } catch (error) {
    console.error('[AI News Analysis] Error:', error);
    return NextResponse.json({
      error: 'Failed to analyze news',
      details: error.message
    }, { status: 500 });
  }
}

// Set runtime configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
