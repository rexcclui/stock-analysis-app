import React from 'react';
import { Target, TrendingUp, TrendingDown } from 'lucide-react';

/**
 * AIPriceAnalysisPanel
 * Displays comprehensive AI price analysis results including trend analysis,
 * recommendations, buy/sell signals, support/resistance levels, and risk factors
 *
 * @param {Object} aiAnalysis - AI analysis data
 * @param {boolean} showAiAnalysis - Whether to show the panel
 * @param {Function} onRefresh - Callback to refresh analysis
 * @param {string} aiError - Error message if analysis failed
 */
export function AIPriceAnalysisPanel({
  aiAnalysis,
  showAiAnalysis,
  onRefresh,
  aiError
}) {
  // Show error state if there's an error
  if (aiError) {
    return (
      <div className="mt-4 p-4 bg-red-900/30 rounded-lg border border-red-500/50">
        <div className="flex items-start gap-3">
          <div className="text-red-400 flex-shrink-0 mt-0.5">⚠️</div>
          <div className="flex-1">
            <p className="text-red-400 font-semibold mb-1">AI Analysis Failed</p>
            <p className="text-gray-300 text-sm">{aiError}</p>
            {aiError.includes('OPENAI_API_KEY') && (
              <p className="text-xs text-gray-400 mt-2">
                Please configure your OpenAI API key in the .env.local file
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Don't render if no analysis or not shown
  if (!aiAnalysis || !showAiAnalysis) {
    return null;
  }

  return (
    <div className="mt-4 bg-gradient-to-br from-purple-900/40 to-blue-900/40 rounded-xl shadow-xl p-4 border border-purple-500/30">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <Target className="text-purple-400" size={20} />
          </div>
          <div>
            <h4 className="text-lg font-bold" style={{ color: '#fde047' }}>AI Price Analysis</h4>
            <p className="text-xs text-gray-400">
              {aiAnalysis.fromCache ? '📦 Cached: ' : '🆕 Generated: '}
              {new Date(aiAnalysis.analyzedAt).toLocaleString()}
            </p>
          </div>
        </div>
        <button
          onClick={() => onRefresh(true)}
          className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs transition"
          title="Force reload analysis"
        >
          Refresh
        </button>
      </div>

      {/* Trend Analysis & Recommendation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
          <h5 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: '#fde047' }}>
            {aiAnalysis.trendAnalysis?.direction === 'uptrend' ? <TrendingUp className="text-green-400" size={16} /> :
             aiAnalysis.trendAnalysis?.direction === 'downtrend' ? <TrendingDown className="text-red-400" size={16} /> :
             <Target className="text-gray-400" size={16} />}
            Trend: {aiAnalysis.trendAnalysis?.direction?.toUpperCase() || 'N/A'}
          </h5>
          <p className="text-xs text-gray-300">
            Strength: <span className="font-semibold">{aiAnalysis.trendAnalysis?.strength}</span>
          </p>
          <p className="text-xs text-gray-400 mt-1">{aiAnalysis.trendAnalysis?.description}</p>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
          <h5 className="text-sm font-semibold mb-2" style={{ color: '#fde047' }}>Recommendation</h5>
          <p className="text-lg font-bold" style={{
            color: aiAnalysis.recommendation?.action?.includes('buy') ? '#10b981' :
                   aiAnalysis.recommendation?.action?.includes('sell') ? '#ef4444' : '#fbbf24'
          }}>
            {aiAnalysis.recommendation?.action?.toUpperCase() || 'N/A'}
          </p>
          <p className="text-xs text-gray-400">
            Confidence: <span className="font-semibold">{aiAnalysis.recommendation?.confidence}</span> |
            Timeframe: <span className="font-semibold">{aiAnalysis.recommendation?.timeframe}</span>
          </p>
          <p className="text-xs text-gray-300 mt-1">{aiAnalysis.recommendation?.reasoning}</p>
        </div>
      </div>

      {/* Buy Signals */}
      {aiAnalysis.buySignals && aiAnalysis.buySignals.length > 0 && (
        <div className="bg-green-900/20 rounded-lg p-3 border border-green-500/30 mb-3">
          <h5 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: '#fde047' }}>
            <TrendingUp size={16} />
            Buy Signals
          </h5>
          <div className="space-y-2">
            {aiAnalysis.buySignals.map((signal, idx) => (
              <div key={idx} className="text-xs">
                <p className="text-white font-medium">
                  💚 ${signal.price.toFixed(2)} ({signal.type}) - {signal.confidence} confidence
                </p>
                <p className="text-gray-300 ml-4">→ {signal.reasoning}</p>
                {signal.stopLoss && signal.targetPrice && (
                  <p className="text-gray-400 ml-4 text-xs">
                    Stop Loss: ${signal.stopLoss.toFixed(2)} | Target: ${signal.targetPrice.toFixed(2)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sell Signals */}
      {aiAnalysis.sellSignals && aiAnalysis.sellSignals.length > 0 && (
        <div className="bg-red-900/20 rounded-lg p-3 border border-red-500/30 mb-3">
          <h5 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: '#fde047' }}>
            <TrendingDown size={16} />
            Sell Signals
          </h5>
          <div className="space-y-2">
            {aiAnalysis.sellSignals.map((signal, idx) => (
              <div key={idx} className="text-xs">
                <p className="text-white font-medium">
                  ❤️ ${signal.price.toFixed(2)} ({signal.type}) - {signal.confidence} confidence
                </p>
                <p className="text-gray-300 ml-4">→ {signal.reasoning}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Support & Resistance Levels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        {aiAnalysis.supportLevels && aiAnalysis.supportLevels.length > 0 && (
          <div className="bg-green-900/20 rounded-lg p-3 border border-green-500/30">
            <h5 className="text-sm font-semibold mb-2" style={{ color: '#fde047' }}>Support Levels</h5>
            <div className="space-y-1">
              {aiAnalysis.supportLevels.map((level, idx) => (
                <div key={idx} className="text-xs">
                  <p className="text-white font-medium">
                    ${level.price.toFixed(2)} ({level.strength})
                  </p>
                  <p className="text-gray-400 ml-2">{level.reasoning}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {aiAnalysis.resistanceLevels && aiAnalysis.resistanceLevels.length > 0 && (
          <div className="bg-red-900/20 rounded-lg p-3 border border-red-500/30">
            <h5 className="text-sm font-semibold mb-2" style={{ color: '#fde047' }}>Resistance Levels</h5>
            <div className="space-y-1">
              {aiAnalysis.resistanceLevels.map((level, idx) => (
                <div key={idx} className="text-xs">
                  <p className="text-white font-medium">
                    ${level.price.toFixed(2)} ({level.strength})
                  </p>
                  <p className="text-gray-400 ml-2">{level.reasoning}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Key Levels and Risks */}
      {(aiAnalysis.keyLevelsToWatch || aiAnalysis.riskFactors) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {aiAnalysis.keyLevelsToWatch && aiAnalysis.keyLevelsToWatch.length > 0 && (
            <div className="bg-blue-900/20 rounded-lg p-3 border border-blue-500/30">
              <h5 className="text-sm font-semibold mb-2" style={{ color: '#fde047' }}>Key Levels to Watch</h5>
              <ul className="text-xs text-gray-300 space-y-1">
                {aiAnalysis.keyLevelsToWatch.map((level, idx) => (
                  <li key={idx}>• {level}</li>
                ))}
              </ul>
            </div>
          )}

          {aiAnalysis.riskFactors && aiAnalysis.riskFactors.length > 0 && (
            <div className="bg-orange-900/20 rounded-lg p-3 border border-orange-500/30">
              <h5 className="text-sm font-semibold mb-2" style={{ color: '#fde047' }}>Risk Factors</h5>
              <ul className="text-xs text-gray-300 space-y-1">
                {aiAnalysis.riskFactors.map((risk, idx) => (
                  <li key={idx}>• {risk}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Disclaimer */}
      <div className="mt-3 p-2 bg-gray-900/50 rounded border border-gray-700">
        <p className="text-xs text-gray-400 text-center">
          ⚠️ This AI analysis is for informational purposes only. Not financial advice. Always do your own research.
        </p>
      </div>
    </div>
  );
}
