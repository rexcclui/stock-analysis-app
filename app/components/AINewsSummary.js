'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Minus, AlertCircle, Lightbulb, Target, Clock, Calendar, Award, AlertTriangle, Sparkles } from 'lucide-react';

/**
 * AINewsSummary Component
 * Displays AI-generated analysis of news articles with impacts, expectations, and recommendations
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
            onClick={onAnalyze}
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

        {hasNews && !error && (
          <div className="mt-4 p-3 bg-blue-900/20 rounded-lg border border-blue-500/30">
            <p className="text-xs text-gray-300 flex items-start gap-2">
              <Lightbulb size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
              <span>
                Click the button above to generate a comprehensive AI analysis including sentiment,
                market expectations, short/long-term impact, risks, opportunities, and recommendations.
              </span>
            </p>
          </div>
        )}
      </div>
    );
  }

  // Helper to get sentiment color and icon
  const getSentimentDisplay = (sentiment) => {
    const displays = {
      positive: { color: 'text-green-400', bg: 'bg-green-900/30', border: 'border-green-500/50', icon: TrendingUp, label: 'Positive' },
      negative: { color: 'text-red-400', bg: 'bg-red-900/30', border: 'border-red-500/50', icon: TrendingDown, label: 'Negative' },
      neutral: { color: 'text-gray-400', bg: 'bg-gray-900/30', border: 'border-gray-500/50', icon: Minus, label: 'Neutral' },
      mixed: { color: 'text-yellow-400', bg: 'bg-yellow-900/30', border: 'border-yellow-500/50', icon: AlertCircle, label: 'Mixed' }
    };
    return displays[sentiment] || displays.neutral;
  };

  // Helper to get direction display
  const getDirectionDisplay = (direction) => {
    const displays = {
      bullish: { color: 'text-green-400', icon: TrendingUp, label: 'Bullish' },
      bearish: { color: 'text-red-400', icon: TrendingDown, label: 'Bearish' },
      neutral: { color: 'text-gray-400', icon: Minus, label: 'Neutral' }
    };
    return displays[direction] || displays.neutral;
  };

  // Helper to get alignment display
  const getAlignmentDisplay = (alignment) => {
    const displays = {
      exceeds: { color: 'text-green-400', label: 'Exceeds Expectations' },
      meets: { color: 'text-blue-400', label: 'Meets Expectations' },
      below: { color: 'text-red-400', label: 'Below Expectations' },
      unclear: { color: 'text-gray-400', label: 'Unclear' }
    };
    return displays[alignment] || displays.unclear;
  };

  // Helper to get recommendation display
  const getRecommendationDisplay = (rec) => {
    const displays = {
      'strong buy': { color: 'text-green-400', bg: 'bg-green-900/40', border: 'border-green-500', label: 'Strong Buy' },
      'buy': { color: 'text-green-300', bg: 'bg-green-900/30', border: 'border-green-400', label: 'Buy' },
      'hold': { color: 'text-yellow-400', bg: 'bg-yellow-900/30', border: 'border-yellow-500', label: 'Hold' },
      'sell': { color: 'text-red-300', bg: 'bg-red-900/30', border: 'border-red-400', label: 'Sell' },
      'strong sell': { color: 'text-red-400', bg: 'bg-red-900/40', border: 'border-red-500', label: 'Strong Sell' }
    };
    return displays[rec] || displays.hold;
  };

  const sentimentDisplay = getSentimentDisplay(analysis.overallSentiment);
  const SentimentIcon = sentimentDisplay.icon;
  const recommendation = getRecommendationDisplay(analysis.analystRecommendation);

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
            <p className="text-sm text-gray-400">
              {analysis.articlesAnalyzed} articles analyzed • {new Date(analysis.analyzedAt).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Overall Sentiment Badge */}
        <div className={`flex items-center gap-2 px-4 py-2 ${sentimentDisplay.bg} ${sentimentDisplay.border} border rounded-lg`}>
          <SentimentIcon className={sentimentDisplay.color} size={20} />
          <span className={`font-semibold ${sentimentDisplay.color}`}>
            {sentimentDisplay.label}
          </span>
          <span className="text-xs text-gray-400 ml-2">
            ({analysis.confidenceLevel} confidence)
          </span>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-gray-800/50 rounded-lg p-4 mb-6 border border-gray-700">
        <h4 className="text-lg font-semibold text-white mb-2">Executive Summary</h4>
        <p className="text-gray-300 leading-relaxed">{analysis.summary}</p>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Positive Impacts */}
        <div className="bg-green-900/20 rounded-lg p-4 border border-green-500/30">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="text-green-400" size={20} />
            <h4 className="text-lg font-semibold text-green-400">Positive Impacts</h4>
          </div>
          {analysis.positiveImpacts && analysis.positiveImpacts.length > 0 ? (
            <ul className="space-y-3">
              {analysis.positiveImpacts.map((impact, idx) => (
                <li key={idx} className="text-sm">
                  <p className="text-white font-medium mb-1">• {impact.point}</p>
                  <p className="text-gray-400 text-xs ml-3">{impact.reasoning}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400 text-sm">No significant positive impacts identified</p>
          )}
        </div>

        {/* Negative Impacts */}
        <div className="bg-red-900/20 rounded-lg p-4 border border-red-500/30">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="text-red-400" size={20} />
            <h4 className="text-lg font-semibold text-red-400">Negative Impacts</h4>
          </div>
          {analysis.negativeImpacts && analysis.negativeImpacts.length > 0 ? (
            <ul className="space-y-3">
              {analysis.negativeImpacts.map((impact, idx) => (
                <li key={idx} className="text-sm">
                  <p className="text-white font-medium mb-1">• {impact.point}</p>
                  <p className="text-gray-400 text-xs ml-3">{impact.reasoning}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400 text-sm">No significant negative impacts identified</p>
          )}
        </div>
      </div>

      {/* Market Expectation */}
      <div className="bg-blue-900/20 rounded-lg p-4 mb-6 border border-blue-500/30">
        <div className="flex items-center gap-2 mb-3">
          <Target className="text-blue-400" size={20} />
          <h4 className="text-lg font-semibold text-blue-400">Market Expectation Alignment</h4>
        </div>
        <div className="flex items-center gap-3 mb-2">
          <span className={`font-semibold ${getAlignmentDisplay(analysis.marketExpectation?.alignment).color}`}>
            {getAlignmentDisplay(analysis.marketExpectation?.alignment).label}
          </span>
        </div>
        <p className="text-gray-300 text-sm">{analysis.marketExpectation?.explanation}</p>
      </div>

      {/* Impact Timeline - Short & Long Term */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Short Term Impact */}
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="text-purple-400" size={20} />
            <h4 className="text-lg font-semibold text-purple-400">Short-Term Impact</h4>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {(() => {
                const dir = getDirectionDisplay(analysis.shortTermImpact?.direction);
                const DirIcon = dir.icon;
                return (
                  <>
                    <DirIcon className={dir.color} size={18} />
                    <span className={`font-semibold ${dir.color}`}>{dir.label}</span>
                    <span className="text-xs text-gray-400">
                      (Magnitude: {analysis.shortTermImpact?.magnitude})
                    </span>
                  </>
                );
              })()}
            </div>
            <p className="text-xs text-gray-400 mb-2">Timeframe: {analysis.shortTermImpact?.timeframe}</p>
            <p className="text-gray-300 text-sm">{analysis.shortTermImpact?.explanation}</p>
          </div>
        </div>

        {/* Long Term Impact */}
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="text-cyan-400" size={20} />
            <h4 className="text-lg font-semibold text-cyan-400">Long-Term Impact</h4>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {(() => {
                const dir = getDirectionDisplay(analysis.longTermImpact?.direction);
                const DirIcon = dir.icon;
                return (
                  <>
                    <DirIcon className={dir.color} size={18} />
                    <span className={`font-semibold ${dir.color}`}>{dir.label}</span>
                    <span className="text-xs text-gray-400">
                      (Magnitude: {analysis.longTermImpact?.magnitude})
                    </span>
                  </>
                );
              })()}
            </div>
            <p className="text-xs text-gray-400 mb-2">Timeframe: {analysis.longTermImpact?.timeframe}</p>
            <p className="text-gray-300 text-sm">{analysis.longTermImpact?.explanation}</p>
          </div>
        </div>
      </div>

      {/* Risks and Opportunities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Key Risks */}
        <div className="bg-orange-900/20 rounded-lg p-4 border border-orange-500/30">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="text-orange-400" size={20} />
            <h4 className="text-lg font-semibold text-orange-400">Key Risks</h4>
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
        </div>

        {/* Key Opportunities */}
        <div className="bg-green-900/20 rounded-lg p-4 border border-green-500/30">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="text-green-400" size={20} />
            <h4 className="text-lg font-semibold text-green-400">Key Opportunities</h4>
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
        </div>
      </div>

      {/* Analyst Recommendation */}
      <div className={`${recommendation.bg} rounded-lg p-4 border ${recommendation.border}`}>
        <div className="flex items-center gap-3 mb-2">
          <Award className={recommendation.color} size={24} />
          <div>
            <h4 className="text-lg font-semibold text-white">AI Analyst Recommendation</h4>
            <span className={`text-2xl font-bold ${recommendation.color}`}>
              {recommendation.label}
            </span>
          </div>
        </div>
        <p className="text-gray-300 text-sm mt-2">{analysis.recommendationReasoning}</p>
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
