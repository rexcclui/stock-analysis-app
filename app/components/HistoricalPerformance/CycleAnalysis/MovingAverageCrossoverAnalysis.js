import React from 'react';

export function MovingAverageCrossoverAnalysis({ cycleAnalysis }) {
  return (
    <div className="space-y-6">
      <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4 mb-6">
        <p className="italic" style={{ fontSize: '11px', color: '#fef08a' }}>
          <strong style={{ fontStyle: 'normal', color: '#fefce8' }}>Moving Average Crossover Analysis:</strong> This tracks the relationship between 50-day and 200-day moving averages.
          A <strong style={{ fontStyle: 'normal', color: '#22c55e' }}>Golden Cross</strong> (bullish signal) occurs when the 50-day MA crosses above the 200-day MA.
          A <strong style={{ fontStyle: 'normal', color: '#ef4444' }}>Death Cross</strong> (bearish signal) occurs when the 50-day MA crosses below the 200-day MA.
          These crossovers are widely used technical indicators for identifying potential trend changes in the market.
        </p>
      </div>

      <div className="rounded-lg p-6 border" style={{ backgroundColor: 'rgba(23, 37, 84, 0.5)', borderColor: '#1e3a8a' }}>
        <h3 className="text-lg font-bold mb-4" style={{ color: '#dbeafe' }}>Current Moving Average Status</h3>
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-sm" style={{ color: '#93c5fd' }}>Current Price</div>
            <div className="text-xl font-bold style={{ color: '#dbeafe' }}">${cycleAnalysis.currentPrice}</div>
          </div>
          <div className="text-center">
            <div className="text-sm" style={{ color: '#93c5fd' }}>50-Day MA</div>
            <div className="text-xl font-bold text-blue-400">${cycleAnalysis.currentMA50}</div>
          </div>
          <div className="text-center">
            <div className="text-sm" style={{ color: '#93c5fd' }}>200-Day MA</div>
            <div className="text-xl font-bold text-purple-400">${cycleAnalysis.currentMA200}</div>
          </div>
          <div className="text-center">
            <div className="text-sm" style={{ color: '#93c5fd' }}>Signal</div>
            <div className={`text-xl font-bold ${cycleAnalysis.currentSignal === 'Bullish' ? 'text-green-400' : 'text-red-400'}`}>
              {cycleAnalysis.currentSignal}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg p-6 border" style={{ backgroundColor: 'rgba(23, 37, 84, 0.5)', borderColor: '#1e3a8a' }}>
        <h3 className="text-lg font-bold mb-4" style={{ color: '#dbeafe' }}>
          Recent Crossovers (Total: {cycleAnalysis.totalCrossovers})
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid #1d4ed8' }}>
                <th className="text-left style={{ color: '#93c5fd' }} py-2 px-4">Date</th>
                <th className="text-left style={{ color: '#93c5fd' }} py-2 px-4">Type</th>
                <th className="text-right style={{ color: '#93c5fd' }} py-2 px-4">Price</th>
                <th className="text-center style={{ color: '#93c5fd' }} py-2 px-4">Signal</th>
                <th className="text-right style={{ color: '#93c5fd' }} py-2 px-4">3 Day %</th>
                <th className="text-right style={{ color: '#93c5fd' }} py-2 px-4">7 Day %</th>
                <th className="text-right style={{ color: '#93c5fd' }} py-2 px-4">14 Day %</th>
                <th className="text-right style={{ color: '#93c5fd' }} py-2 px-4">30 Day %</th>
              </tr>
            </thead>
            <tbody>
              {cycleAnalysis.crossovers?.map((cross, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #1e3a8a' }}>
                  <td className="style={{ color: '#bfdbfe' }} py-2 px-4">{cross.date}</td>
                  <td className="style={{ color: '#dbeafe' }} py-2 px-4">{cross.type}</td>
                  <td className="text-right style={{ color: '#bfdbfe' }} py-2 px-4">${cross.price}</td>
                  <td className="text-center py-2 px-4">
                    <span className={`px-2 py-1 rounded text-sm ${cross.signal === 'Bullish' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                      {cross.signal}
                    </span>
                  </td>
                  <td className="text-right py-2 px-4">
                    {cross.perf3day !== null ? (
                      <span style={{ color: parseFloat(cross.perf3day) >= 0 ? '#22c55e' : '#ef4444' }}>
                        {parseFloat(cross.perf3day) >= 0 ? '+' : ''}{cross.perf3day}%
                      </span>
                    ) : (
                      <span style={{ color: '#9ca3af' }}>N/A</span>
                    )}
                  </td>
                  <td className="text-right py-2 px-4">
                    {cross.perf7day !== null ? (
                      <span style={{ color: parseFloat(cross.perf7day) >= 0 ? '#22c55e' : '#ef4444' }}>
                        {parseFloat(cross.perf7day) >= 0 ? '+' : ''}{cross.perf7day}%
                      </span>
                    ) : (
                      <span style={{ color: '#9ca3af' }}>N/A</span>
                    )}
                  </td>
                  <td className="text-right py-2 px-4">
                    {cross.perf14day !== null ? (
                      <span style={{ color: parseFloat(cross.perf14day) >= 0 ? '#22c55e' : '#ef4444' }}>
                        {parseFloat(cross.perf14day) >= 0 ? '+' : ''}{cross.perf14day}%
                      </span>
                    ) : (
                      <span style={{ color: '#9ca3af' }}>N/A</span>
                    )}
                  </td>
                  <td className="text-right py-2 px-4">
                    {cross.perf30day !== null ? (
                      <span style={{ color: parseFloat(cross.perf30day) >= 0 ? '#22c55e' : '#ef4444' }}>
                        {parseFloat(cross.perf30day) >= 0 ? '+' : ''}{cross.perf30day}%
                      </span>
                    ) : (
                      <span style={{ color: '#9ca3af' }}>N/A</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
