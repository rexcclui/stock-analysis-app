import { RefreshCw, TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react';

/**
 * Panel component to display AI cycle analysis results
 */
export function AICycleAnalysisPanel({
  cycleAnalysis,
  showCycleAnalysis,
  onRefresh,
  cycleError
}) {
  if (!showCycleAnalysis && !cycleError) {
    return null;
  }

  if (cycleError) {
    return (
      <div className="mt-4 bg-red-900/30 border border-red-700 rounded-lg p-4">
        <div className="flex items-center gap-2 text-red-400">
          <AlertCircle size={20} />
          <span className="font-semibold">Cycle Analysis Error</span>
        </div>
        <p className="text-red-300 mt-2">{cycleError}</p>
      </div>
    );
  }

  if (!cycleAnalysis) {
    return null;
  }

  const getCycleIcon = (type) => {
    switch (type) {
      case 'bull': return <TrendingUp className="text-green-400" size={16} />;
      case 'bear': return <TrendingDown className="text-red-400" size={16} />;
      default: return <Minus className="text-yellow-400" size={16} />;
    }
  };

  const getCycleColor = (type) => {
    switch (type) {
      case 'bull': return 'text-green-400';
      case 'bear': return 'text-red-400';
      default: return 'text-yellow-400';
    }
  };

  const getStrengthColor = (strength) => {
    switch (strength) {
      case 'strong': return 'text-green-400';
      case 'moderate': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="mt-4 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-green-700/50 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <TrendingUp className="text-green-400" size={24} />
          <div>
            <h4 className="text-lg font-bold text-green-400">AI Cycle Analysis</h4>
            {cycleAnalysis.cycles && (
              <p className="text-sm text-gray-400">
                {cycleAnalysis.cycles.length} cycles identified in historical data
              </p>
            )}
          </div>
        </div>
        <button
          onClick={() => onRefresh(true)}
          className="flex items-center gap-1 px-3 py-1 bg-green-700 hover:bg-green-600 text-white rounded-lg text-xs transition"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Current Cycle Status */}
      {cycleAnalysis.currentCycle && (
        <div className="mb-6 bg-gray-700/50 rounded-lg p-4 border border-green-600/30">
          <h5 className="font-semibold text-white mb-3 flex items-center gap-2">
            {getCycleIcon(cycleAnalysis.currentCycle.type)}
            Current Cycle: <span className={getCycleColor(cycleAnalysis.currentCycle.type)}>
              {cycleAnalysis.currentCycle.type.toUpperCase()}
            </span>
            <span className="text-gray-400 text-sm ml-2">
              ({cycleAnalysis.currentCycle.stage} stage)
            </span>
          </h5>

          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <span className="text-gray-400 text-sm">Days in Cycle:</span>
              <p className="text-white font-semibold">{cycleAnalysis.currentCycle.daysInCycle}</p>
            </div>
            <div>
              <span className="text-gray-400 text-sm">Current Price:</span>
              <p className="text-white font-semibold">
                ${cycleAnalysis.currentCycle.priceRange.current?.toFixed(2)}
              </p>
            </div>
            <div>
              <span className="text-gray-400 text-sm">Cycle Low:</span>
              <p className="text-green-400 font-semibold">
                ${cycleAnalysis.currentCycle.priceRange.low?.toFixed(2)}
              </p>
            </div>
            <div>
              <span className="text-gray-400 text-sm">Cycle High:</span>
              <p className="text-red-400 font-semibold">
                ${cycleAnalysis.currentCycle.priceRange.high?.toFixed(2)}
              </p>
            </div>
          </div>

          <p className="text-gray-300 text-sm italic">{cycleAnalysis.currentCycle.description}</p>
        </div>
      )}

      {/* Historical Cycles */}
      {cycleAnalysis.cycles && cycleAnalysis.cycles.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h5 className="font-semibold text-white">Historical Cycles</h5>
            <div className="flex items-center gap-2">
              {(() => {
                const bullCount = cycleAnalysis.cycles.filter(c => c.type === 'bull').length;
                const bearCount = cycleAnalysis.cycles.filter(c => c.type === 'bear').length;
                const consolidationCount = cycleAnalysis.cycles.filter(c => c.type === 'consolidation').length;
                return (
                  <>
                    <span className="bg-green-600 text-white px-2 py-1 rounded text-xs font-bold">
                      {bullCount} Bull
                    </span>
                    <span className="bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">
                      {bearCount} Bear
                    </span>
                    {consolidationCount > 0 && (
                      <span className="bg-yellow-600 text-white px-2 py-1 rounded text-xs font-bold">
                        {consolidationCount} Consolidation
                      </span>
                    )}
                    <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-bold">
                      {cycleAnalysis.cycles.length} Total
                    </span>
                  </>
                );
              })()}
            </div>
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {cycleAnalysis.cycles.map((cycle, idx) => (
              <div
                key={cycle.id || idx}
                className="bg-gray-700/30 rounded-lg p-3 border border-gray-600/50"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getCycleIcon(cycle.type)}
                    <span className={`font-semibold ${getCycleColor(cycle.type)}`}>
                      Cycle #{cycle.id} - {cycle.type.toUpperCase()}
                    </span>
                    <span className={`text-xs ${getStrengthColor(cycle.strength)}`}>
                      ({cycle.strength})
                    </span>
                  </div>
                  <span className="text-gray-400 text-xs">{cycle.duration} days</span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                  <div>
                    <span className="text-gray-500">Start:</span>
                    <p className="text-gray-300">{cycle.startDate}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">End:</span>
                    <p className="text-gray-300">{cycle.endDate}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Change:</span>
                    <p className={cycle.priceRange.percentChange >= 0 ? 'text-green-400' : 'text-red-400'}>
                      {cycle.priceRange.percentChange >= 0 ? '+' : ''}
                      {cycle.priceRange.percentChange?.toFixed(2)}%
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                  <div>
                    <span className="text-gray-500">Low: </span>
                    <span className="text-gray-300">${cycle.priceRange.low?.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">High: </span>
                    <span className="text-gray-300">${cycle.priceRange.high?.toFixed(2)}</span>
                  </div>
                </div>

                <p className="text-gray-400 text-xs italic">{cycle.characteristics}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pattern Analysis */}
      {cycleAnalysis.patterns && (
        <div className="mb-6 bg-blue-900/20 rounded-lg p-4 border border-blue-600/30">
          <h5 className="font-semibold text-blue-400 mb-3">Pattern Analysis</h5>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <span className="text-gray-400 text-sm">Avg Cycle Duration:</span>
              <p className="text-white font-semibold">
                {cycleAnalysis.patterns.averageCycleDuration} days
              </p>
            </div>
            <div>
              <span className="text-gray-400 text-sm">Dominant Trend:</span>
              <p className={`font-semibold ${
                cycleAnalysis.patterns.dominantTrend === 'bullish' ? 'text-green-400' :
                cycleAnalysis.patterns.dominantTrend === 'bearish' ? 'text-red-400' :
                'text-yellow-400'
              }`}>
                {cycleAnalysis.patterns.dominantTrend?.toUpperCase()}
              </p>
            </div>
          </div>
          <div className="mb-3">
            <span className="text-gray-400 text-sm">Cycle Consistency:</span>
            <p className="text-white font-semibold">
              {cycleAnalysis.patterns.cycleConsistency?.toUpperCase()}
            </p>
          </div>
          {cycleAnalysis.patterns.keyObservations && (
            <div>
              <span className="text-gray-400 text-sm">Key Observations:</span>
              <ul className="list-disc list-inside text-gray-300 text-sm mt-1 space-y-1">
                {cycleAnalysis.patterns.keyObservations.map((obs, idx) => (
                  <li key={idx}>{obs}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Forecast */}
      {cycleAnalysis.forecast && (
        <div className="mb-6 bg-purple-900/20 rounded-lg p-4 border border-purple-600/30">
          <h5 className="font-semibold text-purple-400 mb-3">Forecast</h5>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <span className="text-gray-400 text-sm">Next Cycle Type:</span>
              <p className={`font-semibold ${getCycleColor(cycleAnalysis.forecast.nextCycleType)}`}>
                {cycleAnalysis.forecast.nextCycleType?.toUpperCase()}
              </p>
            </div>
            <div>
              <span className="text-gray-400 text-sm">Expected Duration:</span>
              <p className="text-white font-semibold">
                {cycleAnalysis.forecast.expectedDuration} days
              </p>
            </div>
          </div>
          <div className="mb-3">
            <span className="text-gray-400 text-sm">Price Targets:</span>
            <div className="grid grid-cols-3 gap-2 mt-1">
              <div className="text-center">
                <p className="text-xs text-gray-500">Pessimistic</p>
                <p className="text-red-400 font-semibold">
                  ${cycleAnalysis.forecast.priceTargets.pessimistic?.toFixed(2)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500">Realistic</p>
                <p className="text-yellow-400 font-semibold">
                  ${cycleAnalysis.forecast.priceTargets.realistic?.toFixed(2)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500">Optimistic</p>
                <p className="text-green-400 font-semibold">
                  ${cycleAnalysis.forecast.priceTargets.optimistic?.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
          <div className="mb-2">
            <span className="text-gray-400 text-sm">Confidence: </span>
            <span className={`font-semibold ${
              cycleAnalysis.forecast.confidence === 'high' ? 'text-green-400' :
              cycleAnalysis.forecast.confidence === 'medium' ? 'text-yellow-400' :
              'text-red-400'
            }`}>
              {cycleAnalysis.forecast.confidence?.toUpperCase()}
            </span>
          </div>
          <p className="text-gray-300 text-sm italic">{cycleAnalysis.forecast.reasoning}</p>
        </div>
      )}

      {/* Trading Recommendations */}
      {cycleAnalysis.tradingRecommendations && (
        <div className="bg-orange-900/20 rounded-lg p-4 border border-orange-600/30">
          <h5 className="font-semibold text-orange-400 mb-3">Trading Recommendations</h5>
          <div className="mb-3">
            <span className="text-gray-400 text-sm">Risk Level: </span>
            <span className={`font-semibold ${
              cycleAnalysis.tradingRecommendations.riskLevel === 'high' ? 'text-red-400' :
              cycleAnalysis.tradingRecommendations.riskLevel === 'medium' ? 'text-yellow-400' :
              'text-green-400'
            }`}>
              {cycleAnalysis.tradingRecommendations.riskLevel?.toUpperCase()}
            </span>
          </div>
          <div className="mb-3">
            <p className="text-gray-300 text-sm">
              {cycleAnalysis.tradingRecommendations.strategy}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-gray-400 text-sm">Entry Zones:</span>
              <p className="text-green-400 font-semibold text-sm">
                ${cycleAnalysis.tradingRecommendations.entryZones?.[0]?.toFixed(2)} -
                ${cycleAnalysis.tradingRecommendations.entryZones?.[1]?.toFixed(2)}
              </p>
            </div>
            <div>
              <span className="text-gray-400 text-sm">Exit Zones:</span>
              <p className="text-red-400 font-semibold text-sm">
                ${cycleAnalysis.tradingRecommendations.exitZones?.[0]?.toFixed(2)} -
                ${cycleAnalysis.tradingRecommendations.exitZones?.[1]?.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Metadata */}
      {cycleAnalysis.metadata && (
        <div className="mt-4 text-xs text-gray-500 text-right">
          Analysis performed on {new Date(cycleAnalysis.metadata.analyzedAt).toLocaleString()}
          {' '}({cycleAnalysis.metadata.analyzedDataPoints} data points)
        </div>
      )}
    </div>
  );
}
