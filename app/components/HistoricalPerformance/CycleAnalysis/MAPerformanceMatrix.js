import React, { useState } from 'react';

export function MAPerformanceMatrix({ simulationResults, onParametersSelect }) {
  const [activeTab, setActiveTab] = useState('3day');

  // Create matrix data structure for table
  const getMatrixData = (perfKey) => {
    if (!simulationResults) return { matrix: {}, crossoverCounts: {}, shortMAs: [], longMAs: [], minValue: 0, maxValue: 0, minNegative: 0, maxPositive: 0 };

    const matrix = {};
    const crossoverCounts = {}; // Track crossover counts for all combinations
    const shortMAsSet = new Set();
    const longMAsSet = new Set();
    let minValue = Infinity;
    let maxValue = -Infinity;
    let minNegative = 0; // Most negative value
    let maxPositive = 0; // Most positive value

    // Use unfiltered results if available, otherwise use filtered (for backwards compatibility)
    const allResults = simulationResults.allResultsUnfiltered || simulationResults.allResults;
    const filteredResults = simulationResults.allResults;
    
    allResults.forEach(result => {
      const key = `${result.long}-${result.short}`;
      crossoverCounts[key] = result.crossoverCount;
      shortMAsSet.add(result.short);
      longMAsSet.add(result.long);

      if (!matrix[result.long]) {
        matrix[result.long] = {};
      }
      // Store null for filtered-out results, actual value for included results
      const isIncluded = filteredResults.find(r => r.short === result.short && r.long === result.long);
      if (isIncluded) {
        const value = result[perfKey];
        matrix[result.long][result.short] = value;

        if (value !== null && value !== undefined) {
          if (value < minValue) minValue = value;
          if (value > maxValue) maxValue = value;

          // Track separate positive and negative ranges
          if (value < 0 && value < minNegative) minNegative = value;
          if (value > 0 && value > maxPositive) maxPositive = value;
        }
      } else {
        // Mark as filtered (null value, but we still have crossoverCount)
        matrix[result.long][result.short] = null;
      }
    });

    const shortMAs = Array.from(shortMAsSet).sort((a, b) => a - b);
    const longMAs = Array.from(longMAsSet).sort((a, b) => a - b);

    return { matrix, crossoverCounts, shortMAs, longMAs, minValue, maxValue, minNegative, maxPositive };
  };

  // Get background color for cell based on value
  const getCellColor = (value, minNegative, maxPositive) => {
    if (value === null || value === undefined) return 'transparent';

    // Ensure value is a number
    const numValue = typeof value === 'string' ? parseFloat(value) : value;

    if (numValue > 0) {
      // Positive values: light green (lowest) to deep green (highest)
      const ratio = maxPositive > 0 ? numValue / maxPositive : 0;

      // Interpolate from light green (#bbf7d0) to deep green (#14532d)
      const r = Math.round(187 - (187 - 20) * ratio);
      const g = Math.round(247 - (247 - 83) * ratio);
      const b = Math.round(208 - (208 - 45) * ratio);
      return `rgb(${r}, ${g}, ${b})`;
    } else if (numValue < 0) {
      // Negative values: light red (highest/closest to 0) to deep red (lowest/most negative)
      const ratio = minNegative < 0 ? numValue / minNegative : 0;

      // Interpolate from light red (#fecaca) to deep red (#7f1d1d)
      const r = Math.round(254 - (254 - 127) * ratio);
      const g = Math.round(202 - (202 - 29) * ratio);
      const b = Math.round(202 - (202 - 29) * ratio);
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      // Value is 0 or very close to 0 - neutral gray
      return '#e5e7eb';
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
    const { matrix, crossoverCounts, shortMAs, longMAs, minNegative, maxPositive } = getMatrixData(perfKey);

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
                  const bCount = crossoverCounts[`${longMA}-${shortMA}`];
                  // Handle NaN values - treat as no data
                  const displayValue = value !== null && value !== undefined && !isNaN(value) ? value : null;
                  const isFiltered = displayValue === null && bCount !== undefined;
                  
                  return (
                    <td
                      key={`${longMA}-${shortMA}`}
                      className="border border-blue-700 px-2 py-1 text-center font-semibold cursor-pointer hover:opacity-80 relative"
                      style={{
                        backgroundColor: getCellColor(displayValue, minNegative, maxPositive),
                        color: getTextColor(displayValue),
                        minHeight: '24px'
                      }}
                      onClick={() => displayValue !== null && displayValue !== undefined && applyParameters(shortMA, longMA)}
                      title={displayValue !== null && displayValue !== undefined ? `Short: ${shortMA}, Long: ${longMA}, Perf: ${displayValue >= 0 ? '+' : ''}${displayValue}%` : isFiltered ? `Filtered: B count = ${bCount}` : 'N/A'}
                    >
                      {displayValue !== null && displayValue !== undefined ? `${displayValue >= 0 ? '+' : ''}${displayValue.toFixed(1)}` : isFiltered ? <span style={{ fontSize: '0.6em', color: '#9ca3af', position: 'absolute', bottom: '2px', right: '2px' }}>B:{bCount}</span> : '-'}
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
    <div className="p-4 rounded-lg mt-8" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', borderLeft: '3px solid #8b5cf6' }}>
      <h4 className="text-base font-bold mb-3 mt-8" style={{ color: '#c4b5fd' }}>
        Performance Matrix: Short MA vs Long MA (Average %)
      </h4>
      <div className="text-xs mb-4 flex items-center gap-0" style={{ color: '#bfdbfe' }}>
        <div className="flex items-center gap-3">
          <span>Rows show Long MA, columns show Short MA. | Color coding:</span>
          <div style={{ display: 'inline-flex', gap: '2px', alignItems: 'center' }}>
            <div style={{ width: '24px', height: '20px', backgroundColor: '#7f1d1d', borderRadius: '2px', border: '1px solid #5f0d0d' }}></div>
            <div style={{ width: '24px', height: '20px', backgroundColor: '#fecaca', borderRadius: '2px', border: '1px solid #f87171' }}></div>
            <div style={{ width: '24px', height: '20px', backgroundColor: '#bbf7d0', borderRadius: '2px', border: '1px solid #86efac' }}></div>
            <div style={{ width: '24px', height: '20px', backgroundColor: '#14532d', borderRadius: '2px', border: '1px solid #065f46' }}></div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 pl-3" style={{ borderBottom: '1px solid #1e3a8a' }}>
          <button
            onClick={() => setActiveTab('3day')}
            style={{
              padding: '4px 12px',
              fontSize: '0.75rem',
              fontWeight: '600',
              borderRadius: '4px 4px 0 0',
              cursor: 'pointer',
              border: activeTab === '3day' ? '2px solid #60a5fa' : 'none',
              borderBottom: activeTab === '3day' ? '2px solid #60a5fa' : 'none',
              color: activeTab === '3day' ? '#60a5fa' : '#9ca3af',
              backgroundColor: activeTab === '3day' ? 'rgba(30, 58, 138, 0.3)' : 'transparent',
              transition: 'all 0.3s ease'
            }}
          >
            3-Day
          </button>
          <button
            onClick={() => setActiveTab('7day')}
            style={{
              padding: '4px 12px',
              fontSize: '0.75rem',
              fontWeight: '600',
              borderRadius: '4px 4px 0 0',
              cursor: 'pointer',
              border: activeTab === '7day' ? '2px solid #4ade80' : 'none',
              borderBottom: activeTab === '7day' ? '2px solid #4ade80' : 'none',
              color: activeTab === '7day' ? '#4ade80' : '#9ca3af',
              backgroundColor: activeTab === '7day' ? 'rgba(20, 83, 45, 0.3)' : 'transparent',
              transition: 'all 0.3s ease'
            }}
          >
            7-Day
          </button>
          <button
            onClick={() => setActiveTab('14day')}
            style={{
              padding: '4px 12px',
              fontSize: '0.75rem',
              fontWeight: '600',
              borderRadius: '4px 4px 0 0',
              cursor: 'pointer',
              border: activeTab === '14day' ? '2px solid #facc15' : 'none',
              borderBottom: activeTab === '14day' ? '2px solid #facc15' : 'none',
              color: activeTab === '14day' ? '#facc15' : '#9ca3af',
              backgroundColor: activeTab === '14day' ? 'rgba(120, 53, 15, 0.3)' : 'transparent',
              transition: 'all 0.3s ease'
            }}
          >
            14-Day
          </button>
          <button
            onClick={() => setActiveTab('30day')}
            style={{
              padding: '4px 12px',
              fontSize: '0.75rem',
              fontWeight: '600',
              borderRadius: '4px 4px 0 0',
              cursor: 'pointer',
              border: activeTab === '30day' ? '2px solid #a78bfa' : 'none',
              borderBottom: activeTab === '30day' ? '2px solid #a78bfa' : 'none',
              color: activeTab === '30day' ? '#a78bfa' : '#9ca3af',
              backgroundColor: activeTab === '30day' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
              transition: 'all 0.3s ease'
            }}
          >
            30-Day
          </button>
        </div>
      </div>

      {/* Matrix Tables */}
      {activeTab === '3day' && renderMatrix('totalPerf3day')}
      {activeTab === '7day' && renderMatrix('totalPerf7day')}
      {activeTab === '14day' && renderMatrix('totalPerf14day')}
      {activeTab === '30day' && renderMatrix('totalPerf30day')}
    </div>
  );
}
