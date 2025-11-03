import React from 'react';

export function PeakTroughAnalysis({ cycleAnalysis }) {
  return (
    <div className="space-y-6">
      <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4 mb-6">
        <p className="italic" style={{ fontSize: '11px', color: '#fef08a' }}>
          <strong style={{ fontStyle: 'normal', color: '#fefce8' }}>Peak-to-Trough Cycle Analysis:</strong> This analysis identifies local peaks (highs) and troughs (lows) in the price history.
          A peak occurs when the price is higher than surrounding days, and a trough occurs when it's lower.
          <strong style={{ fontStyle: 'normal', color: '#fde047' }}> Avg Cycle Length</strong> shows the average number of days between consecutive peaks, helping identify recurring price patterns.
          The cycles table shows the duration and price change between each pair of peaks.
        </p>
      </div>

      <div className="rounded-lg p-6 border" style={{ backgroundColor: 'rgba(23, 37, 84, 0.5)', borderColor: '#1e3a8a' }}>
        <h3 className="text-lg font-bold mb-4" style={{ color: '#dbeafe' }}>
          Cycle Statistics
        </h3>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className="text-sm" style={{ color: '#93c5fd' }}>Total Peaks</div>
            <div className="text-2xl font-bold" style={{ color: '#dbeafe' }}>{cycleAnalysis.totalPeaks}</div>
          </div>
          <div className="text-center">
            <div className="text-sm" style={{ color: '#93c5fd' }}>Total Troughs</div>
            <div className="text-2xl font-bold" style={{ color: '#dbeafe' }}>{cycleAnalysis.totalTroughs}</div>
          </div>
          <div className="text-center">
            <div className="text-sm" style={{ color: '#93c5fd' }}>Avg Cycle Length</div>
            <div className="text-2xl font-bold" style={{ color: '#dbeafe' }}>{cycleAnalysis.avgCycleLength} days</div>
          </div>
        </div>
      </div>

      <div className="rounded-lg p-6 border" style={{ backgroundColor: 'rgba(23, 37, 84, 0.5)', borderColor: '#1e3a8a' }}>
        <h3 className="text-lg font-bold mb-4" style={{ color: '#dbeafe' }}>Recent Peak-to-Peak Cycles</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid #1d4ed8' }}>
                <th className="text-left style={{ color: '#93c5fd' }} py-2 px-4">From</th>
                <th className="text-left style={{ color: '#93c5fd' }} py-2 px-4">To</th>
                <th className="text-right style={{ color: '#93c5fd' }} py-2 px-4">Days</th>
                <th className="text-right style={{ color: '#93c5fd' }} py-2 px-4">Price Change</th>
              </tr>
            </thead>
            <tbody>
              {cycleAnalysis.cycles?.map((cycle, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #1e3a8a' }}>
                  <td className="style={{ color: '#bfdbfe' }} py-2 px-4">{cycle.from}</td>
                  <td className="style={{ color: '#bfdbfe' }} py-2 px-4">{cycle.to}</td>
                  <td className="text-right style={{ color: '#dbeafe' }} py-2 px-4">{cycle.days}</td>
                  <td className={`text-right py-2 px-4 ${parseFloat(cycle.priceChange) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {cycle.priceChange}%
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
