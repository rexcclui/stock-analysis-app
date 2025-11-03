import React from 'react';

export function SupportResistanceAnalysis({ cycleAnalysis }) {
  return (
    <div className="space-y-6">
      <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4 mb-6">
        <p className="italic" style={{ fontSize: '11px', color: '#fef08a' }}>
          <strong style={{ fontStyle: 'normal', color: '#fefce8' }}>Support & Resistance Levels:</strong> This identifies key price levels where the stock has repeatedly traded.
          <strong style={{ fontStyle: 'normal', color: '#22c55e' }}> Support</strong> levels are prices below the current price where buying pressure has historically prevented further decline.
          <strong style={{ fontStyle: 'normal', color: '#ef4444' }}> Resistance</strong> levels are prices above the current price where selling pressure has historically prevented further gains.
          <strong style={{ fontStyle: 'normal', color: '#fde047' }}> Touches</strong> shows how many times the price has tested that level, with more touches indicating stronger levels.
          <strong style={{ fontStyle: 'normal', color: '#fde047' }}> Distance</strong> shows how far each level is from the current price.
        </p>
      </div>

      <div className="rounded-lg p-6 border" style={{ backgroundColor: 'rgba(23, 37, 84, 0.5)', borderColor: '#1e3a8a' }}>
        <h3 className="text-lg font-bold mb-4" style={{ color: '#dbeafe' }}>Current Price & Key Levels</h3>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className="text-sm" style={{ color: '#93c5fd' }}>Current Price</div>
            <div className="text-2xl font-bold" style={{ color: '#dbeafe' }}>${cycleAnalysis.currentPrice}</div>
          </div>
          <div className="text-center">
            <div className="text-sm" style={{ color: '#93c5fd' }}>Nearest Support</div>
            <div className="text-2xl font-bold text-green-400">${cycleAnalysis.nearestSupport}</div>
          </div>
          <div className="text-center">
            <div className="text-sm" style={{ color: '#93c5fd' }}>Nearest Resistance</div>
            <div className="text-2xl font-bold text-red-400">${cycleAnalysis.nearestResistance}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="rounded-lg p-6 border" style={{ backgroundColor: 'rgba(23, 37, 84, 0.5)', borderColor: '#1e3a8a' }}>
          <h3 className="text-lg font-bold text-green-400 mb-4">Support Levels</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid #1d4ed8' }}>
                  <th className="text-left style={{ color: '#93c5fd' }} py-2 px-4">Price</th>
                  <th className="text-right style={{ color: '#93c5fd' }} py-2 px-4">Touches</th>
                  <th className="text-right style={{ color: '#93c5fd' }} py-2 px-4">Distance</th>
                </tr>
              </thead>
              <tbody>
                {cycleAnalysis.support?.map((level, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #1e3a8a' }}>
                    <td className="style={{ color: '#dbeafe' }} py-2 px-4">${level.price}</td>
                    <td className="text-right style={{ color: '#bfdbfe' }} py-2 px-4">{level.touches}</td>
                    <td className="text-right style={{ color: '#93c5fd' }} py-2 px-4">{level.distance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-lg p-6 border" style={{ backgroundColor: 'rgba(23, 37, 84, 0.5)', borderColor: '#1e3a8a' }}>
          <h3 className="text-lg font-bold text-red-400 mb-4">Resistance Levels</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid #1d4ed8' }}>
                  <th className="text-left style={{ color: '#93c5fd' }} py-2 px-4">Price</th>
                  <th className="text-right style={{ color: '#93c5fd' }} py-2 px-4">Touches</th>
                  <th className="text-right style={{ color: '#93c5fd' }} py-2 px-4">Distance</th>
                </tr>
              </thead>
              <tbody>
                {cycleAnalysis.resistance?.map((level, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #1e3a8a' }}>
                    <td className="style={{ color: '#dbeafe' }} py-2 px-4">${level.price}</td>
                    <td className="text-right style={{ color: '#bfdbfe' }} py-2 px-4">{level.touches}</td>
                    <td className="text-right style={{ color: '#93c5fd' }} py-2 px-4">{level.distance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
