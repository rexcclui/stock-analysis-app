import React, { useState } from 'react';

export function MAPerformanceMatrix({ simulationResults, onParametersSelect }) {
  const [activeTab, setActiveTab] = useState('3day');

  // Create matrix data structure for table
  const getMatrixData = (perfKey) => {
    if (!simulationResults) return { matrix: {}, shortMAs: [], longMAs: [], minValue: 0, maxValue: 0 };

    const matrix = {};
    const shortMAsSet = new Set();
    const longMAsSet = new Set();
    let minValue = Infinity;
    let maxValue = -Infinity;

    simulationResults.allResults.forEach(result => {
      const value = result[perfKey];
      shortMAsSet.add(result.short);
      longMAsSet.add(result.long);

      if (!matrix[result.long]) {
        matrix[result.long] = {};
      }
      matrix[result.long][result.short] = value;

      if (value < minValue) minValue = value;
      if (value > maxValue) maxValue = value;
    });

    const shortMAs = Array.from(shortMAsSet).sort((a, b) => a - b);
    const longMAs = Array.from(longMAsSet).sort((a, b) => a - b);

    return { matrix, shortMAs, longMAs, minValue, maxValue };
  };

  // Get background color for cell based on value
  const getCellColor = (value, minValue, maxValue) => {
    if (value === null || value === undefined) return 'transparent';

    if (value >= 0) {
      // Positive values: light green to deep green
      const ratio = maxValue > 0 ? value / maxValue : 0;

      // Interpolate from light green (#bbf7d0) to deep green (#14532d)
      const r = Math.round(187 - (187 - 20) * ratio);
      const g = Math.round(247 - (247 - 83) * ratio);
      const b = Math.round(208 - (208 - 45) * ratio);
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      // Negative values: light red to very red
      const ratio = minValue < 0 ? value / minValue : 0;

      // Interpolate from light red (#fecaca) to very red (#7f1d1d)
      const r = Math.round(254 - (254 - 127) * ratio);
      const g = Math.round(202 - (202 - 29) * ratio);
      const b = Math.round(202 - (202 - 29) * ratio);
      return `rgb(${r}, ${g}, ${b})`;
    }
  };

  // Get text color based on background brightness
  const getTextColor = (value) => {
    if (value === null || value === undefined) return '#9ca3af';

    // Use white text for darker backgrounds (high values)
    if (Math.abs(value) > 20) return '#ffffff';

    // Use dark text for lighter backgrounds (low values)
    return '#1f2937';
  };

  const applyParameters = (short, long) => {
    if (onParametersSelect) {
      onParametersSelect(short, long);
    }
  };

  // Render matrix table
  const renderMatrix = (perfKey) => {
    const { matrix, shortMAs, longMAs, minValue, maxValue } = getMatrixData(perfKey);

    return (
      <div className="overflow-auto max-h-[600px]">
        <table className="border-collapse text-xs">
          <thead style={{ position: 'sticky', top: 0, backgroundColor: '#172554', zIndex: 10 }}>
            <tr>
              <th className="border border-blue-700 px-2 py-1 font-semibold" style={{ color: '#93c5fd', minWidth: '60px' }}>
                Long MA ↓ / Short MA →
              </th>
              {shortMAs.map(shortMA => (
                <th key={shortMA} className="border border-blue-700 px-2 py-1 font-semibold" style={{ color: '#60a5fa', minWidth: '50px' }}>
                  {shortMA}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {longMAs.map(longMA => (
              <tr key={longMA}>
                <td className="border border-blue-700 px-2 py-1 font-bold" style={{ color: '#a78bfa', backgroundColor: '#172554' }}>
                  {longMA}
                </td>
                {shortMAs.map(shortMA => {
                  const value = matrix[longMA]?.[shortMA];
                  return (
                    <td
                      key={`${longMA}-${shortMA}`}
                      className="border border-blue-700 px-2 py-1 text-center font-semibold cursor-pointer hover:opacity-80"
                      style={{
                        backgroundColor: getCellColor(value, minValue, maxValue),
                        color: getTextColor(value)
                      }}
                      onClick={() => value !== null && value !== undefined && applyParameters(shortMA, longMA)}
                      title={value !== null && value !== undefined ? `Short: ${shortMA}, Long: ${longMA}, Perf: ${value >= 0 ? '+' : ''}${value}%` : 'N/A'}
                    >
                      {value !== null && value !== undefined ? `${value >= 0 ? '+' : ''}${value.toFixed(1)}` : '-'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  if (!simulationResults) return null;

  return (
    <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', borderLeft: '3px solid #8b5cf6' }}>
      <h4 className="text-base font-bold mb-3" style={{ color: '#c4b5fd' }}>
        Performance Matrix: Short MA vs Long MA
      </h4>
      <p className="text-xs mb-4" style={{ color: '#bfdbfe' }}>
        Rows show Long MA, columns show Short MA.
        Color coding: <span style={{ color: '#14532d', backgroundColor: '#bbf7d0', padding: '2px 4px', borderRadius: '2px' }}>light green (low positive)</span> → <span style={{ color: '#ffffff', backgroundColor: '#14532d', padding: '2px 4px', borderRadius: '2px' }}>deep green (high positive)</span> | <span style={{ color: '#1f2937', backgroundColor: '#fecaca', padding: '2px 4px', borderRadius: '2px' }}>light red (near zero negative)</span> → <span style={{ color: '#ffffff', backgroundColor: '#7f1d1d', padding: '2px 4px', borderRadius: '2px' }}>very red (most negative)</span>
      </p>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b" style={{ borderColor: '#1e3a8a' }}>
        <button
          onClick={() => setActiveTab('3day')}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === '3day'
              ? 'border-b-2 border-blue-400 text-blue-400'
              : 'text-gray-400 hover:text-blue-300'
          }`}
        >
          3-Day
        </button>
        <button
          onClick={() => setActiveTab('7day')}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === '7day'
              ? 'border-b-2 border-green-400 text-green-400'
              : 'text-gray-400 hover:text-green-300'
          }`}
        >
          7-Day
        </button>
        <button
          onClick={() => setActiveTab('14day')}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === '14day'
              ? 'border-b-2 border-orange-400 text-orange-400'
              : 'text-gray-400 hover:text-orange-300'
          }`}
        >
          14-Day
        </button>
        <button
          onClick={() => setActiveTab('30day')}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === '30day'
              ? 'border-b-2 border-purple-400 text-purple-400'
              : 'text-gray-400 hover:text-purple-300'
          }`}
        >
          30-Day
        </button>
      </div>

      {/* Matrix Tables */}
      {activeTab === '3day' && renderMatrix('totalPerf3day')}
      {activeTab === '7day' && renderMatrix('totalPerf7day')}
      {activeTab === '14day' && renderMatrix('totalPerf14day')}
      {activeTab === '30day' && renderMatrix('totalPerf30day')}
    </div>
  );
}
