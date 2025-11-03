import React from 'react';

export function FourierAnalysis({ cycleAnalysis }) {
  return (
    <div className="space-y-6">
      <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4 mb-6">
        <p className="italic" style={{ fontSize: '11px', color: '#fef08a' }}>
          <strong style={{ fontStyle: 'normal', color: '#fefce8' }}>Fourier/Spectral Analysis:</strong> This uses autocorrelation to identify recurring price patterns and cycles.
          The analysis finds periods (measured in days) where historical price movements tend to repeat.
          <strong style={{ fontStyle: 'normal', color: '#fde047' }}> Strength</strong> indicates how reliably each cycle appears in the data.
          Higher strength values suggest more consistent cyclical patterns that may help predict future price movements.
        </p>
      </div>

      <div className="rounded-lg p-6 border" style={{ backgroundColor: 'rgba(23, 37, 84, 0.5)', borderColor: '#1e3a8a' }}>
        <h3 className="text-lg font-bold mb-4" style={{ color: '#dbeafe' }}>Dominant Cycles Detected</h3>
        <p className="style={{ color: '#bfdbfe' }} mb-4">{cycleAnalysis.interpretation}</p>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid #1d4ed8' }}>
                <th className="text-left style={{ color: '#93c5fd' }} py-2 px-4">Period (Days)</th>
                <th className="text-right style={{ color: '#93c5fd' }} py-2 px-4">Strength</th>
              </tr>
            </thead>
            <tbody>
              {cycleAnalysis.dominantCycles?.map((cycle, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #1e3a8a' }}>
                  <td className="style={{ color: '#dbeafe' }} py-2 px-4">{cycle.period}</td>
                  <td className="text-right style={{ color: '#bfdbfe' }} py-2 px-4">{cycle.strength}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
