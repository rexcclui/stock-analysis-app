'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, AlertCircle, Lightbulb, Target, Clock, Calendar, Award, AlertTriangle, Sparkles, RefreshCw } from 'lucide-react';

/**
 * AINewsSummary Component
 * Displays AI-generated analysis of news articles with impacts, expectations, and recommendations
 * Features two-level caching (client + server) for performance
 *
 * Props:
 * - analysis: AI analysis object from /api/analyze-news
 * - loading: boolean indicating if analysis is being generated
 * - error: error message if analysis failed
 * - onAnalyze: function to trigger manual analysis
 * - hasNews: boolean indicating if news data is available
 * - symbol: stock symbol
 */
export function AINewsSummary({ analysis, loading, error, onAnalyze, hasNews, symbol }) {
  const [cachedTime, setCachedTime] = useState(null);
  const [isFromCache, setIsFromCache] = useState(false);

  // Client-side cache management
  useEffect(() => {
    if (analysis) {
      // Check if this analysis is from cache
      if (analysis.fromCache) {
        setIsFromCache(true);
        setCachedTime(analysis.analyzedAt);
      } else {
        setIsFromCache(false);
        setCachedTime(analysis.analyzedAt);

        // Store in client cache (localStorage)
        try {
          const cacheData = {
            analysis,
            timestamp: new Date().toISOString(),
            symbol
          };
          localStorage.setItem(`ai-analysis-${symbol}`, JSON.stringify(cacheData));
        } catch (e) {
          console.warn('Failed to cache analysis in localStorage:', e);
        }
      }
    }
  }, [analysis, symbol]);

  // Load from client cache on mount
  useEffect(() => {
    if (!analysis && symbol) {
      try {
        const cached = localStorage.getItem(`ai-analysis-${symbol}`);
        if (cached) {
          const { analysis: cachedAnalysis, timestamp } = JSON.parse(cached);
          // Check if cache is less than 4 hours old
          const cacheAge = Date.now() - new Date(timestamp).getTime();
          const fourHours = 4 * 60 * 60 * 1000;

          if (cacheAge < fourHours) {
            // You can optionally auto-load from client cache here
            // For now, we'll let the server handle caching
            console.log('Client cache available for', symbol);
          }
        }
      } catch (e) {
        console.warn('Failed to load from client cache:', e);
      }
    }
  }, [symbol, analysis]);

  const handleForceReload = () => {
    // Clear client cache
    try {
      localStorage.removeItem(`ai-analysis-${symbol}`);
    } catch (e) {
      console.warn('Failed to clear client cache:', e);
    }

    // Trigger analysis with force reload flag
    onAnalyze(true); // Pass true to indicate force reload
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-purple-900/40 to-blue-900/40 rounded-xl shadow-xl p-6 border border-purple-500/30 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="animate-pulse flex items-center gap-2">
            <div className="w-6 h-6 bg-purple-500 rounded-full"></div>
            <h3 className="text-xl font-bold text-white">AI News Analysis</h3>
          </div>
        </div>
        <div className="text-gray-300 flex items-center gap-2">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-500"></div>
          Analyzing news articles with AI...
        </div>
      </div>
    );
  }

  // Show button to trigger analysis when no analysis exists yet
  if (!analysis) {
    return (
      <div className="bg-gradient-to-br from-purple-900/40 to-blue-900/40 rounded-xl shadow-xl p-6 border border-purple-500/30 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Sparkles className="text-purple-400" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">AI News Analysis</h3>
              <p className="text-sm text-gray-400">
                Get AI-powered insights on market impact, sentiment, and recommendations
              </p>
            </div>
          </div>

          <button
            onClick={() => onAnalyze(false)}
            disabled={!hasNews}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
              hasNews
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Sparkles size={20} />
            {hasNews ? `Analyze ${symbol} News with AI` : 'No News Available'}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-900/30 rounded-lg border border-red-500/50">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
              <div className="flex-1">
                <p className="text-red-400 font-semibold mb-1">Analysis Failed</p>
                <p className="text-gray-300 text-sm">{error}</p>

                {/* API Key not configured */}
                {error.includes('OPENAI_API_KEY') && (
                  <div className="mt-3 p-3 bg-red-900/20 rounded border border-red-500/30">
                    <p className="text-xs text-gray-300 mb-2 font-semibold">How to fix:</p>
                    <ol className="text-xs text-gray-400 space-y-1 ml-4 list-decimal">
                      <li>Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">OpenAI Platform</a></li>
                      <li>Create a <code className="bg-gray-800 px-1 rounded">.env.local</code> file in the project root</li>
                      <li>Add: <code className="bg-gray-800 px-1 rounded">OPENAI_API_KEY=your_key_here</code></li>
                      <li>Restart the development server</li>
                    </ol>
                  </div>
                )}

                {/* Rate Limit / Quota Exceeded */}
                {(error.includes('429') || error.includes('quota') || error.includes('rate limit') || error.includes('RateLimitError') || error.includes('insufficient_quota')) && (
                  <div className="mt-3 p-3 bg-red-900/20 rounded border border-red-500/30">
                    <p className="text-xs text-gray-300 mb-2 font-semibold">⚠️ OpenAI API Quota Exceeded</p>
                    <p className="text-xs text-gray-400 mb-3">Your OpenAI account has run out of credits or hit the rate limit.</p>

                    {error.includes('insufficient_quota') && (
                      <div className="mb-3 p-2 bg-orange-900/20 rounded border border-orange-500/30">
                        <p className="text-xs text-orange-300 font-semibold mb-2">📌 Already added credits but still seeing this?</p>
                        <ul className="text-xs text-gray-400 space-y-1 ml-4 list-disc">
                          <li><strong>Wait 2-5 minutes</strong> - Billing updates can take time to propagate</li>
                          <li><strong>Check organization</strong> - Your API key might be from a different org than where you added credits</li>
                          <li><strong>Verify the API key</strong> - Go to <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">API Keys</a> and check which organization owns your key</li>
                          <li><strong>Check usage limits</strong> - You may have set a monthly budget limit that's been reached</li>
                        </ul>
                      </div>
                    )}

                    <p className="text-xs text-gray-300 mb-2 font-semibold">Solutions:</p>
                    <ol className="text-xs text-gray-400 space-y-1 ml-4 list-decimal">
                      <li>Check your usage at <a href="https://platform.openai.com/usage" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">OpenAI Usage Dashboard</a></li>
                      <li>Add payment method at <a href="https://platform.openai.com/settings/organization/billing/overview" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Billing Settings</a></li>
                      <li>Verify API key organization at <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">API Keys page</a></li>
                      <li>Check usage limits at <a href="https://platform.openai.com/settings/organization/limits" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Limits page</a></li>
                      <li>If just added credits: <strong>Wait 5 minutes and try again</strong></li>
                    </ol>
                    <div className="mt-2 p-2 bg-yellow-900/20 rounded border border-yellow-500/30">
                      <p className="text-xs text-yellow-300">💡 <strong>Tip:</strong> OpenAI charges per token. Each analysis costs approximately $0.01-0.05 depending on the number of news articles.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Helper to get sentiment color and icon
  const getSentimentDisplay = (sentiment) => {
    const displays = {
      positive: { color: 'text-green-400', bg: 'bg-green-900/40', border: 'border-green-400', icon: TrendingUp, label: 'Positive' },
      negative: { color: 'text-red-400', bg: 'bg-red-900/40', border: 'border-red-400', icon: TrendingDown, label: 'Negative' },
      neutral: { color: 'text-gray-400', bg: 'bg-gray-900/40', border: 'border-gray-400', icon: Minus, label: 'Neutral' },
      mixed: { color: 'text-yellow-300', bg: 'bg-yellow-900/40', border: 'border-yellow-400', icon: AlertCircle, label: 'Mixed' }
    };
    return displays[sentiment] || displays.neutral;
  };

  // Helper to get confidence level color
  const getConfidenceColor = (confidence) => {
    const colors = {
      high: 'text-green-400',
      medium: 'text-yellow-300',
      low: 'text-red-400'
    };
    return colors[confidence] || 'text-gray-400';
  };

  const sentimentDisplay = getSentimentDisplay(analysis.overallSentiment);
  const SentimentIcon = sentimentDisplay.icon;
  const confidenceColor = getConfidenceColor(analysis.confidenceLevel);

  return (
    <div className="bg-gradient-to-br from-purple-900/40 to-blue-900/40 rounded-xl shadow-xl p-6 border border-purple-500/30 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <Lightbulb className="text-purple-400" size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white">AI News Analysis</h3>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span>{analysis.articlesAnalyzed} articles analyzed</span>
              {cachedTime && (
                <>
                  <span>•</span>
                  <span className={isFromCache ? 'text-yellow-400' : 'text-green-400'}>
                    {isFromCache ? '📦 Cached: ' : '🆕 Generated: '}
                    {new Date(cachedTime).toLocaleString()}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Overall Sentiment Badge */}
          <div className={`flex items-center gap-2 px-4 py-2 ${sentimentDisplay.bg} ${sentimentDisplay.border} border-2 rounded-lg`}>
            <SentimentIcon className={sentimentDisplay.color} size={20} />
            <span className={`font-bold ${sentimentDisplay.color}`}>
              {sentimentDisplay.label}
            </span>
            <span className={`text-xs font-semibold ml-2 ${confidenceColor}`}>
              ({analysis.confidenceLevel} confidence)
            </span>
          </div>

          {/* Force Reload Button */}
          <button
            onClick={handleForceReload}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all"
            title="Force reload analysis"
          >
            <RefreshCw size={18} />
            <span className="text-sm font-semibold">Reload</span>
          </button>
        </div>
      </div>

      {/* Table Format Display */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <tbody>
            {/* Row 1: Executive Summary */}
            <tr>
              <td colSpan={2} className="border border-gray-700 bg-gray-800/50 p-4 align-top">
                <h4 className="text-lg font-semibold text-white mb-2">Executive Summary</h4>
                <p className="text-gray-300 leading-relaxed">{analysis.summary}</p>
              </td>
            </tr>

            {/* Row 2: Short & Long Term Negative Impact */}
            <tr>
              <td className="border border-red-500/30 bg-red-900/20 p-4 w-1/2 align-top">
                <h4 className="text-lg font-bold mb-3" style={{ color: '#f87171' }}>
                  Short Term Negative Impact
                </h4>
                {analysis.negativeImpacts && analysis.negativeImpacts.length > 0 ? (
                  <div className="space-y-3">
                    {analysis.negativeImpacts.map((impact, idx) => (
                      <div key={idx} className="text-sm">
                        <p className="text-white font-medium mb-1">• {impact.point}</p>
                        <p className="text-gray-400 text-xs ml-3">{impact.reasoning}</p>
                      </div>
                    ))}
                    {analysis.shortTermImpact?.direction === 'bearish' && (
                      <div className="mt-3 pt-3 border-t border-red-500/30">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingDown className="text-red-400" size={16} />
                          <span className="text-red-400 font-semibold text-sm">
                            {analysis.shortTermImpact.magnitude} magnitude
                          </span>
                        </div>
                        <p className="text-gray-300 text-xs">{analysis.shortTermImpact.explanation}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">No significant short-term negative impacts</p>
                )}
              </td>
              <td className="border border-red-500/30 bg-red-900/20 p-4 w-1/2 align-top">
                <h4 className="text-lg font-bold mb-3" style={{ color: '#f87171' }}>
                  Long Term Negative Impact
                </h4>
                {analysis.longTermImpact?.direction === 'bearish' ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="text-red-400" size={18} />
                      <span className="text-red-400 font-semibold">Bearish</span>
                      <span className="text-xs text-gray-400">
                        (Magnitude: {analysis.longTermImpact.magnitude})
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">Timeframe: {analysis.longTermImpact.timeframe}</p>
                    <p className="text-gray-300 text-sm">{analysis.longTermImpact.explanation}</p>
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">No significant long-term negative impact identified</p>
                )}
              </td>
            </tr>

            {/* Row 3: Short & Long Term Positive Impact */}
            <tr>
              <td className="border border-green-500/30 bg-green-900/20 p-4 w-1/2 align-top">
                <h4 className="text-lg font-bold mb-3" style={{ color: '#4ade80' }}>
                  Short Term Positive Impact
                </h4>
                {analysis.positiveImpacts && analysis.positiveImpacts.length > 0 ? (
                  <div className="space-y-3">
                    {analysis.positiveImpacts.map((impact, idx) => (
                      <div key={idx} className="text-sm">
                        <p className="text-white font-medium mb-1">• {impact.point}</p>
                        <p className="text-gray-400 text-xs ml-3">{impact.reasoning}</p>
                      </div>
                    ))}
                    {analysis.shortTermImpact?.direction === 'bullish' && (
                      <div className="mt-3 pt-3 border-t border-green-500/30">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="text-green-400" size={16} />
                          <span className="text-green-400 font-semibold text-sm">
                            {analysis.shortTermImpact.magnitude} magnitude
                          </span>
                        </div>
                        <p className="text-gray-300 text-xs">{analysis.shortTermImpact.explanation}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">No significant short-term positive impacts</p>
                )}
              </td>
              <td className="border border-green-500/30 bg-green-900/20 p-4 w-1/2 align-top">
                <h4 className="text-lg font-bold mb-3" style={{ color: '#4ade80' }}>
                  Long Term Positive Impact
                </h4>
                {analysis.longTermImpact?.direction === 'bullish' ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="text-green-400" size={18} />
                      <span className="text-green-400 font-semibold">Bullish</span>
                      <span className="text-xs text-gray-400">
                        (Magnitude: {analysis.longTermImpact.magnitude})
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">Timeframe: {analysis.longTermImpact.timeframe}</p>
                    <p className="text-gray-300 text-sm">{analysis.longTermImpact.explanation}</p>
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">No significant long-term positive impact identified</p>
                )}
              </td>
            </tr>

            {/* Row 4: Key Risks */}
            <tr>
              <td colSpan={2} className="border border-orange-500/30 bg-orange-900/20 p-4 align-top">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="text-orange-400" size={20} />
                  <h4 className="text-lg font-bold text-white">
                    Key <span className="font-extrabold" style={{ color: '#f87171' }}>Risks</span>
                  </h4>
                </div>
                {analysis.keyRisks && analysis.keyRisks.length > 0 ? (
                  <ul className="space-y-2">
                    {analysis.keyRisks.map((risk, idx) => (
                      <li key={idx} className="text-sm text-gray-300">• {risk}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-400 text-sm">No significant risks identified</p>
                )}
              </td>
            </tr>

            {/* Row 5: Key Opportunities */}
            <tr>
              <td colSpan={2} className="border border-green-500/30 bg-green-900/20 p-4 align-top">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="text-green-400" size={20} />
                  <h4 className="text-lg font-bold text-white">
                    Key <span className="font-extrabold" style={{ color: '#60a5fa' }}>Opportunities</span>
                  </h4>
                </div>
                {analysis.keyOpportunities && analysis.keyOpportunities.length > 0 ? (
                  <ul className="space-y-2">
                    {analysis.keyOpportunities.map((opp, idx) => (
                      <li key={idx} className="text-sm text-gray-300">• {opp}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-400 text-sm">No significant opportunities identified</p>
                )}
              </td>
            </tr>

            {/* Row 6: AI Analyst Recommendation */}
            <tr>
              <td colSpan={2} className="border border-yellow-500 bg-yellow-900/20 p-4 align-top">
                <div className="flex items-center gap-3 mb-2">
                  <Award className="text-yellow-300" size={24} />
                  <div>
                    <h4 className="text-lg font-bold" style={{ color: '#fde047' }}>AI Analyst Recommendation</h4>
                    <span className="text-2xl font-extrabold" style={{ color: '#fde047' }}>
                      {analysis.analystRecommendation?.toUpperCase() || 'N/A'}
                    </span>
                  </div>
                </div>
                <p className="text-gray-300 text-sm mt-2">{analysis.recommendationReasoning}</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Disclaimer */}
      <div className="mt-4 p-3 bg-gray-900/50 rounded border border-gray-700">
        <p className="text-xs text-gray-400 text-center">
          ⚠️ This analysis is generated by AI and is for informational purposes only. Not financial advice.
          Always conduct your own research and consult with a qualified financial advisor.
        </p>
      </div>
    </div>
  );
}
