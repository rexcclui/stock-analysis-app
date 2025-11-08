import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getCache, setCache } from '@/lib/cache';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Cache TTL for AI price analysis: 30 minutes
const AI_PRICE_ANALYSIS_CACHE_TTL = 30;

/**
 * AI-powered price trend analysis endpoint
 * Analyzes historical price data and provides buy/sell recommendations with resistance levels
 *
 * POST body:
 * - symbol: Stock symbol (e.g., AAPL)
 * - priceData: Array of {date, price} objects
 * - currentPrice: Current stock price
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { symbol, priceData = [], currentPrice } = body;

    if (!symbol) {
      return NextResponse.json({ error: 'Stock symbol is required' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 });
    }

    if (!priceData || priceData.length === 0) {
      return NextResponse.json({ error: 'Price data is required' }, { status: 400 });
    }

    // Create cache key based on symbol and recent price data
    const recentPrices = priceData.slice(-10).map(p => p.price).join(',');
    const cacheKey = `ai-price-analysis:${symbol}:${Buffer.from(recentPrices).toString('base64').slice(0, 30)}`;

    // Check if forceReload is requested
    const forceReload = body.forceReload === true;

    // Check cache first (unless force reload)
    if (!forceReload) {
      const cachedAnalysis = getCache(cacheKey);
      if (cachedAnalysis) {
        console.log(`[AI Price Analysis] Cache hit for ${symbol}`);
        return NextResponse.json({
          ...cachedAnalysis,
          fromCache: true,
          cacheKey
        });
      }
    }

    console.log(`[AI Price Analysis] Cache miss for ${symbol}, calling OpenAI`);

    // Prepare price data for AI analysis
    // Send sample data to reduce token usage (every 5th point for large datasets)
    const sampleInterval = priceData.length > 100 ? 5 : 1;
    const sampledData = priceData.filter((_, idx) => idx % sampleInterval === 0);

    const priceText = sampledData.map((p, idx) =>
      `${idx + 1}. ${p.date}: $${p.price.toFixed(2)}`
    ).join('\n');

    // Calculate basic statistics
    const prices = priceData.map(p => p.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const recentPrice = currentPrice || prices[prices.length - 1];

    // Create AI prompt for price analysis
    const prompt = `You are a technical analyst. Analyze the following price data for ${symbol} stock and provide actionable trading insights.

Current Price: $${recentPrice.toFixed(2)}
Price Range: $${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}
Average Price: $${avgPrice.toFixed(2)}
Data Points: ${priceData.length} (sample below)

Historical Price Data (Date: Price):
${priceText}

Please analyze the price trend and provide a detailed analysis in the following JSON format:
{
  "trendAnalysis": {
    "direction": "uptrend" | "downtrend" | "sideways" | "volatile",
    "strength": "strong" | "moderate" | "weak",
    "description": "Brief description of the trend pattern"
  },
  "technicalIndicators": {
    "momentum": "bullish" | "bearish" | "neutral",
    "volatility": "high" | "medium" | "low",
    "pricePosition": "near resistance" | "near support" | "mid-range" | "breakout" | "breakdown"
  },
  "supportLevels": [
    { "price": 150.50, "strength": "strong" | "moderate" | "weak", "reasoning": "why this is support" }
  ],
  "resistanceLevels": [
    { "price": 155.00, "strength": "strong" | "moderate" | "weak", "reasoning": "why this is resistance" }
  ],
  "buySignals": [
    {
      "price": 151.00,
      "type": "entry" | "accumulation" | "breakout",
      "confidence": "high" | "medium" | "low",
      "reasoning": "why buy at this level",
      "stopLoss": 148.00,
      "targetPrice": 158.00
    }
  ],
  "sellSignals": [
    {
      "price": 157.00,
      "type": "take-profit" | "resistance" | "breakdown",
      "confidence": "high" | "medium" | "low",
      "reasoning": "why sell at this level"
    }
  ],
  "recommendation": {
    "action": "strong buy" | "buy" | "hold" | "sell" | "strong sell",
    "confidence": "high" | "medium" | "low",
    "timeframe": "short-term (days)" | "medium-term (weeks)" | "long-term (months)",
    "reasoning": "Overall recommendation reasoning"
  },
  "keyLevelsToWatch": [
    "price level 1 with significance",
    "price level 2 with significance"
  ],
  "riskFactors": [
    "risk factor 1",
    "risk factor 2"
  ]
}

Important:
1. Identify 2-3 key support and resistance levels based on price history
2. Provide specific buy/sell price points with reasoning
3. For buy signals, include stop-loss and target prices
4. Consider the current price position in your analysis
5. Be conservative and realistic in recommendations

Provide ONLY the JSON response, no additional text.`;

    console.log(`[AI Price Analysis] Analyzing ${priceData.length} price points for ${symbol}`);

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 2000,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        {
          role: 'system',
          content: 'You are a technical analyst who provides price analysis in JSON format. Be specific with price levels and conservative with recommendations.'
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    // Extract and parse the response
    const responseText = completion.choices[0].message.content;
    console.log('[AI Price Analysis] Raw response:', responseText);

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
      console.error('[AI Price Analysis] JSON parse error:', parseError);
      return NextResponse.json({
        error: 'Failed to parse AI response',
        rawResponse: responseText
      }, { status: 500 });
    }

    // Add metadata
    const result = {
      ...analysis,
      symbol,
      currentPrice: recentPrice,
      analyzedAt: new Date().toISOString(),
      dataPoints: priceData.length,
      priceRange: { min: minPrice, max: maxPrice, average: avgPrice }
    };

    // Cache the result
    setCache(cacheKey, result, AI_PRICE_ANALYSIS_CACHE_TTL);
    console.log(`[AI Price Analysis] Successfully analyzed and cached ${symbol}`);

    return NextResponse.json({
      ...result,
      fromCache: false,
      cacheKey
    });

  } catch (error) {
    console.error('[AI Price Analysis] Error:', error);

    // Check for specific OpenAI errors
    const errorMessage = error.message || 'Failed to analyze price data';
    const statusCode = error.status || 500;

    // For rate limit errors, return more specific message
    if (error.status === 429 || errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
      return NextResponse.json({
        error: `OpenAI API Error: ${errorMessage}`,
        type: 'rate_limit',
        details: error.message
      }, { status: 429 });
    }

    return NextResponse.json({
      error: errorMessage,
      details: error.message
    }, { status: statusCode });
  }
}

// Set runtime configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
