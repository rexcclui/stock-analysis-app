import React from 'react';
import { ReferenceLine, ReferenceDot } from 'recharts';

/**
 * AIChartOverlay
 * Renders AI-generated support/resistance levels and buy/sell signals on the chart
 *
 * @param {Object} aiAnalysis - AI analysis data containing signals and levels
 * @param {boolean} showAiAnalysis - Whether to show AI markers
 * @param {Array} chartData - Chart data points for finding closest matches
 * @param {boolean} isCompareMode - Whether in comparison mode (disables AI overlay)
 */
export function AIChartOverlay({
  aiAnalysis,
  showAiAnalysis,
  chartData,
  isCompareMode = false
}) {
  // Debug logging
  console.log('AIChartOverlay - Render check:', {
    isCompareMode,
    showAiAnalysis,
    hasAiAnalysis: !!aiAnalysis,
    chartDataLength: chartData?.length,
    resistanceLevels: aiAnalysis?.resistanceLevels?.length,
    supportLevels: aiAnalysis?.supportLevels?.length,
    buySignals: aiAnalysis?.buySignals?.length,
    sellSignals: aiAnalysis?.sellSignals?.length,
    firstChartPoint: chartData?.[0]
  });

  // Don't render anything in compare mode or if AI analysis is not shown
  if (isCompareMode || !showAiAnalysis || !aiAnalysis) {
    console.log('AIChartOverlay - Not rendering because:', {
      isCompareMode,
      showAiAnalysis,
      hasAiAnalysis: !!aiAnalysis
    });
    return null;
  }

  console.log('AIChartOverlay - Rendering with analysis:', aiAnalysis);

  return (
    <>
      {/* AI Analysis - Resistance Levels */}
      {aiAnalysis.resistanceLevels && aiAnalysis.resistanceLevels.length > 0 && aiAnalysis.resistanceLevels.map((level, idx) => (
        <ReferenceLine
          key={`resistance-${idx}`}
          y={level.price}
          stroke="#ef4444"
          strokeDasharray="3 3"
          strokeWidth={level.strength === 'strong' ? 2 : 1}
          label={{
            value: `AI Resistance: $${level.price.toFixed(2)}`,
            position: idx % 2 === 0 ? 'right' : 'left',
            fill: '#ef4444',
            fontSize: 10
          }}
        />
      ))}

      {/* AI Analysis - Support Levels */}
      {aiAnalysis.supportLevels && aiAnalysis.supportLevels.length > 0 && aiAnalysis.supportLevels.map((level, idx) => (
        <ReferenceLine
          key={`support-${idx}`}
          y={level.price}
          stroke="#10b981"
          strokeDasharray="3 3"
          strokeWidth={level.strength === 'strong' ? 2 : 1}
          label={{
            value: `AI Support: $${level.price.toFixed(2)}`,
            position: idx % 2 === 0 ? 'right' : 'left',
            fill: '#10b981',
            fontSize: 10
          }}
        />
      ))}

      {/* AI Analysis - Buy Signals */}
      {aiAnalysis.buySignals && aiAnalysis.buySignals.length > 0 && chartData.length > 0 && aiAnalysis.buySignals.map((signal, idx) => {
        // Find the closest data point to this price
        const closestPoint = chartData.reduce((closest, point) => {
          if (!point.price || !closest.price) return closest;
          const currentDiff = Math.abs(point.price - signal.price);
          const closestDiff = Math.abs(closest.price - signal.price);
          return currentDiff < closestDiff ? point : closest;
        }, chartData[0]);

        return closestPoint && closestPoint.price ? (
          <ReferenceDot
            key={`buy-${idx}`}
            x={closestPoint.date}
            y={signal.price}
            r={6}
            fill="#10b981"
            stroke="#ffffff"
            strokeWidth={2}
            label={{
              value: `BUY $${signal.price.toFixed(2)}`,
              position: 'top',
              fill: '#10b981',
              fontSize: 9,
              fontWeight: 'bold'
            }}
          />
        ) : null;
      })}

      {/* AI Analysis - Sell Signals */}
      {aiAnalysis.sellSignals && aiAnalysis.sellSignals.length > 0 && chartData.length > 0 && aiAnalysis.sellSignals.map((signal, idx) => {
        // Find the closest data point to this price
        const closestPoint = chartData.reduce((closest, point) => {
          if (!point.price || !closest.price) return closest;
          const currentDiff = Math.abs(point.price - signal.price);
          const closestDiff = Math.abs(closest.price - signal.price);
          return currentDiff < closestDiff ? point : closest;
        }, chartData[0]);

        return closestPoint && closestPoint.price ? (
          <ReferenceDot
            key={`sell-${idx}`}
            x={closestPoint.date}
            y={signal.price}
            r={6}
            fill="#ef4444"
            stroke="#ffffff"
            strokeWidth={2}
            label={{
              value: `SELL $${signal.price.toFixed(2)}`,
              position: 'bottom',
              fill: '#ef4444',
              fontSize: 9,
              fontWeight: 'bold'
            }}
          />
        ) : null;
      })}
    </>
  );
}
