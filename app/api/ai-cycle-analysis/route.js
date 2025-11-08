import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getCache, setCache } from '../../../lib/cache';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(request) {
  try {
    const { symbol, priceData, currentPrice, forceReload } = await request.json();

    if (!symbol || !priceData || priceData.length === 0) {
      return NextResponse.json(
        { error: 'Symbol and price data are required' },
        { status: 400 }
      );
    }

    // Check cache (30 minute TTL)
    const cacheKey = `ai-cycle-${symbol}-${priceData.length}`;
    if (!forceReload) {
      const cached = getCache(cacheKey);
      if (cached) {
        console.log(`AI Cycle Analysis: Using cached result for ${symbol}`);
        return NextResponse.json(cached);
      }
    }

    // Prepare price data summary for AI
    const dataLength = priceData.length;
    const firstDate = priceData[0].date;
    const lastDate = priceData[priceData.length - 1].date;

    // Sample data points to reduce token usage (take every nth point for large datasets)
    const sampleSize = 500;
    const step = Math.max(1, Math.floor(dataLength / sampleSize));
    const sampledData = priceData.filter((_, idx) => idx % step === 0);

    // Calculate basic statistics
    const prices = priceData.map(d => d.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const priceRange = maxPrice - minPrice;
    const volatility = calculateVolatility(prices);

    // Find peaks and troughs for AI context
    const { peaks, troughs } = findPeaksAndTroughs(priceData);

    // Prepare the prompt for OpenAI
    const systemPrompt = `You are an expert financial analyst specializing in technical analysis and market cycle detection. Your task is to analyze historical price data to identify trend cycles, determine price ranges within each cycle, and provide actionable insights.

Analyze the data to identify:
1. Major trend cycles (bull and bear phases)
2. Price range (high/low) for each cycle
3. Cycle duration
4. Current market position within the cycle
5. Future cycle predictions

Return your analysis in the following JSON format:
{
  "cycles": [
    {
      "id": 1,
      "type": "bull|bear|consolidation",
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD",
      "duration": number (days),
      "priceRange": {
        "low": number,
        "high": number,
        "range": number,
        "percentChange": number
      },
      "characteristics": "Brief description of this cycle",
      "strength": "strong|moderate|weak"
    }
  ],
  "currentCycle": {
    "type": "bull|bear|consolidation",
    "stage": "early|mid|late",
    "priceRange": {
      "low": number,
      "high": number,
      "current": number
    },
    "daysInCycle": number,
    "description": "Current market position analysis"
  },
  "patterns": {
    "averageCycleDuration": number,
    "dominantTrend": "bullish|bearish|neutral",
    "cycleConsistency": "high|medium|low",
    "keyObservations": ["observation1", "observation2"]
  },
  "forecast": {
    "nextCycleType": "bull|bear|consolidation",
    "expectedDuration": number,
    "priceTargets": {
      "optimistic": number,
      "realistic": number,
      "pessimistic": number
    },
    "confidence": "high|medium|low",
    "reasoning": "Explanation of forecast"
  },
  "tradingRecommendations": {
    "strategy": "Description of recommended approach",
    "entryZones": [number, number],
    "exitZones": [number, number],
    "riskLevel": "high|medium|low"
  }
}`;

    const userPrompt = `Analyze the following stock price data for ${symbol}:

**Data Summary:**
- Symbol: ${symbol}
- Current Price: $${currentPrice?.toFixed(2) || 'N/A'}
- Date Range: ${firstDate} to ${lastDate}
- Total Data Points: ${dataLength} days
- Price Statistics:
  - Min: $${minPrice.toFixed(2)}
  - Max: $${maxPrice.toFixed(2)}
  - Average: $${avgPrice.toFixed(2)}
  - Range: $${priceRange.toFixed(2)} (${((priceRange / minPrice) * 100).toFixed(1)}%)
  - Volatility (StdDev): ${volatility.toFixed(2)}

**Identified Peaks (Local Maxima):**
${peaks.slice(-10).map(p => `- ${p.date}: $${p.price.toFixed(2)}`).join('\n')}

**Identified Troughs (Local Minima):**
${troughs.slice(-10).map(t => `- ${t.date}: $${t.price.toFixed(2)}`).join('\n')}

**Sample Price Data Points (${sampledData.length} samples):**
${sampledData.slice(0, 50).map(d => `${d.date}: $${d.price.toFixed(2)}`).join(', ')}...

Please analyze this data to identify trend cycles, their characteristics, and provide forecasts. Focus on identifying 3-5 major cycles if possible.`;

    // Call OpenAI API
    console.log(`AI Cycle Analysis: Analyzing ${symbol} with ${dataLength} data points`);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3, // Lower temperature for more consistent analysis
      max_tokens: 3000
    });

    const analysisText = completion.choices[0].message.content;
    const analysis = JSON.parse(analysisText);

    // Add metadata
    const result = {
      ...analysis,
      metadata: {
        symbol,
        currentPrice,
        analyzedDataPoints: dataLength,
        dateRange: { from: firstDate, to: lastDate },
        analyzedAt: new Date().toISOString()
      }
    };

    // Cache the result (30 minutes)
    setCache(cacheKey, result, 30);

    return NextResponse.json(result);

  } catch (error) {
    console.error('AI Cycle Analysis Error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze cycles: ' + error.message },
      { status: 500 }
    );
  }
}

// Helper function to calculate volatility (standard deviation)
function calculateVolatility(prices) {
  const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
  const squaredDiffs = prices.map(price => Math.pow(price - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / prices.length;
  return Math.sqrt(variance);
}

// Helper function to find peaks and troughs
function findPeaksAndTroughs(data, windowSize = 10) {
  const peaks = [];
  const troughs = [];

  for (let i = windowSize; i < data.length - windowSize; i++) {
    const current = data[i].price;

    // Check if current point is a peak
    const isPeak = data.slice(i - windowSize, i).every(d => d.price <= current) &&
                   data.slice(i + 1, i + windowSize + 1).every(d => d.price <= current);

    // Check if current point is a trough
    const isTrough = data.slice(i - windowSize, i).every(d => d.price >= current) &&
                     data.slice(i + 1, i + windowSize + 1).every(d => d.price >= current);

    if (isPeak) {
      peaks.push({ date: data[i].date, price: current, index: i });
    }
    if (isTrough) {
      troughs.push({ date: data[i].date, price: current, index: i });
    }
  }

  return { peaks, troughs };
}
