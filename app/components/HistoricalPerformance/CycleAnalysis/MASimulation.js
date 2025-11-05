import React, { useState, useEffect } from 'react';
import { MAPerformanceMatrix } from './MAPerformanceMatrix';

// Cache key generator
const getCacheKey = (stockCode) => `ma-simulation-${stockCode}`;

// Load from cache
const loadFromCache = (stockCode) => {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem(getCacheKey(stockCode));
    if (cached) {
      const data = JSON.parse(cached);
      const ONE_DAY = 24 * 60 * 60 * 1000; // 1 day in milliseconds
      // Cache expires after 7 days
      if (Date.now() - data.timestamp < 7 * ONE_DAY) {
        return data.results;
      }
    }
  } catch (err) {
    console.error('Error loading cache:', err);
  }
  return null;
};

// Save to cache
const saveToCache = (stockCode, results) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getCacheKey(stockCode), JSON.stringify({
      timestamp: Date.now(),
      results
    }));
  } catch (err) {
    console.error('Error saving cache:', err);
  }
};

export function MASimulation({ stockCode, onParametersSelect }) {
  const [simulationResults, setSimulationResults] = useState(null);
  const [simulating, setSimulating] = useState(false);
  const [progressMessage, setProgressMessage] = useState('');

  // Try to load from cache on mount
  useEffect(() => {
    if (stockCode) {
      const cached = loadFromCache(stockCode);
      if (cached) {
        setSimulationResults(cached);
      }
    }
  }, [stockCode]);

  const runSimulation = async () => {
    // Check cache first
    const cached = loadFromCache(stockCode);
    if (cached) {
      setSimulationResults(cached);
      return;
    }

    setSimulating(true);
    setProgressMessage('Initializing simulation...');

    // Simulate different MA combinations from 5 to 100 for short, 50 to 300 for long
    const shortMAs = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 70, 80, 90, 100];
    const longMAs = [50, 60, 70, 80, 100, 120, 150, 180, 200, 220, 250, 280, 300];

    const results = [];
    let totalCombinations = 0;
    let currentCombination = 0;
    let marketReturn = null;

    // Calculate total combinations
    for (const short of shortMAs) {
      for (const long of longMAs) {
        if (short < long) totalCombinations++;
      }
    }

    for (const short of shortMAs) {
      for (const long of longMAs) {
        if (short >= long) continue; // Short MA must be less than Long MA

        currentCombination++;
        setProgressMessage(`Testing MA(${short}/${long})... ${currentCombination}/${totalCombinations}`);

        // Fetch crossover data for this combination
        try {
          const response = await fetch(
            `/api/cycle-analysis?symbol=${stockCode}&years=5&mode=ma-crossover&maShort=${short}&maLong=${long}`
          );

          if (!response.ok) continue;

          const data = await response.json();

          // Calculate market return on first successful response
          if (marketReturn === null && data.currentPrice && data.crossovers && data.crossovers.length > 0) {
            // Calculate buy-and-hold return from earliest to latest crossover in the dataset
            const sortedCrossovers = [...data.crossovers].sort((a, b) =>
              new Date(a.date) - new Date(b.date)
            );
            const firstPrice = parseFloat(sortedCrossovers[0].price);
            const currentPrice = parseFloat(data.currentPrice);
            marketReturn = parseFloat(((currentPrice - firstPrice) / firstPrice * 100).toFixed(2));
          }

          if (data.crossovers) {
            // Calculate performance for all 4 day types
            let totalPerf3day = 0;
            let totalPerf7day = 0;
            let totalPerf14day = 0;
            let totalPerf30day = 0;

            let count3day = 0;
            let count7day = 0;
            let count14day = 0;
            let count30day = 0;

            let wins3day = 0;
            let wins7day = 0;
            let wins14day = 0;
            let wins30day = 0;

            data.crossovers.forEach(cross => {
              // 3-day
              if (cross.perf3day !== null) {
                totalPerf3day += parseFloat(cross.perf3day);
                count3day++;
                if (parseFloat(cross.perf3day) > 0) wins3day++;
              }

              // 7-day
              if (cross.perf7day !== null) {
                totalPerf7day += parseFloat(cross.perf7day);
                count7day++;
                if (parseFloat(cross.perf7day) > 0) wins7day++;
              }

              // 14-day
              if (cross.perf14day !== null) {
                totalPerf14day += parseFloat(cross.perf14day);
                count14day++;
                if (parseFloat(cross.perf14day) > 0) wins14day++;
              }

              // 30-day
              if (cross.perf30day !== null) {
                totalPerf30day += parseFloat(cross.perf30day);
                count30day++;
                if (parseFloat(cross.perf30day) > 0) wins30day++;
              }
            });

            results.push({
              short,
              long,
              totalPerf3day: parseFloat(totalPerf3day.toFixed(2)),
              totalPerf7day: parseFloat(totalPerf7day.toFixed(2)),
              totalPerf14day: parseFloat(totalPerf14day.toFixed(2)),
              totalPerf30day: parseFloat(totalPerf30day.toFixed(2)),
              crossoverCount: data.crossovers.length,
              winRate3day: count3day > 0 ? ((wins3day / count3day) * 100).toFixed(1) : '0.0',
              winRate7day: count7day > 0 ? ((wins7day / count7day) * 100).toFixed(1) : '0.0',
              winRate14day: count14day > 0 ? ((wins14day / count14day) * 100).toFixed(1) : '0.0',
              winRate30day: count30day > 0 ? ((wins30day / count30day) * 100).toFixed(1) : '0.0',
            });
          }
        } catch (err) {
          console.error(`Error fetching MA crossover for ${short}/${long}:`, err);
        }
      }
    }

    // Sort by totalPerf7day descending (default sorting)
    results.sort((a, b) => b.totalPerf7day - a.totalPerf7day);

    const resultData = {
      topResults: results.slice(0, 20),
      allResults: results,
      marketReturn: marketReturn || 0
    };

    setSimulationResults(resultData);

    // Save to cache
    saveToCache(stockCode, resultData);

    setProgressMessage('');
    setSimulating(false);
  };

  const applyParameters = (short, long) => {
    if (onParametersSelect) {
      onParametersSelect(short, long);
    }
  };

  // Sort handler for the table
  const [sortBy, setSortBy] = useState('totalPerf7day');
  const [sortOrder, setSortOrder] = useState('desc');

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const getSortedResults = () => {
    if (!simulationResults) return [];
    const results = [...simulationResults.topResults];
    results.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });
    return results;
  };

  return (
    <div className="space-y-6">
      {/* Simulation Button */}
      <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(30, 58, 138, 0.3)', borderLeft: '3px solid #3b82f6' }}>
        <p className="text-sm mb-3" style={{ color: '#bfdbfe' }}>
          <strong>Optimize MA Strategy:</strong> Find the best Short/Long MA combination across all time periods (3, 7, 14, 30 days)
          {simulationResults && <span className="ml-2 text-green-400">(Using cached results)</span>}
        </p>
        <button
          onClick={runSimulation}
          disabled={simulating}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded transition-colors font-semibold"
        >
          {simulating ? 'Running Simulation...' : simulationResults ? 'Re-run Simulation' : 'Run MA Simulation'}
        </button>

        {/* Progress Message */}
        {simulating && progressMessage && (
          <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)', borderLeft: '2px solid #60a5fa' }}>
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-400"></div>
              <span style={{ color: '#22d3ee', fontStyle: 'italic' }} className="text-sm font-medium">{progressMessage}</span>
            </div>
          </div>
        )}
      </div>

      {/* Simulation Results Table */}
      {simulationResults && (
        <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', borderLeft: '3px solid #10b981' }}>
          <div className="flex items-center gap-3 mb-3">
            <h4 className="text-base font-bold" style={{ color: '#86efac' }}>
              Top 20 MA Combinations - All Time Periods
            </h4>
            <span className="text-xs" style={{ color: '#bfdbfe' }}>
              (Market Benchmark:
              <span className="ml-1 font-bold" style={{ color: simulationResults.marketReturn >= 0 ? '#22c55e' : '#ef4444' }}>
                {simulationResults.marketReturn >= 0 ? '+' : ''}{simulationResults.marketReturn}%
              </span>)
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid #1d4ed8' }}>
                  <th className="text-left py-2 px-3" style={{ color: '#93c5fd' }}>Rank</th>
                  <th
                    className="text-center py-2 px-3 cursor-pointer hover:bg-blue-900/30"
                    style={{ color: '#93c5fd' }}
                    onClick={() => handleSort('short')}
                  >
                    Short MA {sortBy === 'short' && (sortOrder === 'desc' ? '↓' : '↑')}
                  </th>
                  <th
                    className="text-center py-2 px-3 cursor-pointer hover:bg-blue-900/30"
                    style={{ color: '#93c5fd' }}
                    onClick={() => handleSort('long')}
                  >
                    Long MA {sortBy === 'long' && (sortOrder === 'desc' ? '↓' : '↑')}
                  </th>
                  <th
                    className="text-right py-2 px-3 cursor-pointer hover:bg-blue-900/30"
                    style={{ color: '#93c5fd' }}
                    onClick={() => handleSort('totalPerf3day')}
                  >
                    Total 3-Day % {sortBy === 'totalPerf3day' && (sortOrder === 'desc' ? '↓' : '↑')}
                  </th>
                  <th
                    className="text-right py-2 px-3 cursor-pointer hover:bg-blue-900/30"
                    style={{ color: '#93c5fd' }}
                    onClick={() => handleSort('totalPerf7day')}
                  >
                    Total 7-Day % {sortBy === 'totalPerf7day' && (sortOrder === 'desc' ? '↓' : '↑')}
                  </th>
                  <th
                    className="text-right py-2 px-3 cursor-pointer hover:bg-blue-900/30"
                    style={{ color: '#93c5fd' }}
                    onClick={() => handleSort('totalPerf14day')}
                  >
                    Total 14-Day % {sortBy === 'totalPerf14day' && (sortOrder === 'desc' ? '↓' : '↑')}
                  </th>
                  <th
                    className="text-right py-2 px-3 cursor-pointer hover:bg-blue-900/30"
                    style={{ color: '#93c5fd' }}
                    onClick={() => handleSort('totalPerf30day')}
                  >
                    Total 30-Day % {sortBy === 'totalPerf30day' && (sortOrder === 'desc' ? '↓' : '↑')}
                  </th>
                  <th
                    className="text-center py-2 px-3 cursor-pointer hover:bg-blue-900/30"
                    style={{ color: '#93c5fd' }}
                    onClick={() => handleSort('crossoverCount')}
                  >
                    Signals {sortBy === 'crossoverCount' && (sortOrder === 'desc' ? '↓' : '↑')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {getSortedResults().map((result, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #1e3a8a' }}>
                    <td
                      className="py-2 px-3 cursor-pointer hover:underline font-semibold"
                      style={{ color: '#60a5fa' }}
                      onClick={() => applyParameters(result.short, result.long)}
                      title="Click to apply these parameters"
                    >
                      {idx + 1}
                    </td>
                    <td className="text-center py-2 px-3 font-semibold" style={{ color: '#60a5fa' }}>{result.short}d</td>
                    <td className="text-center py-2 px-3 font-semibold" style={{ color: '#a78bfa' }}>{result.long}d</td>
                    <td className="text-right py-2 px-3 font-bold" style={{ color: result.totalPerf3day >= 0 ? '#22c55e' : '#ef4444' }}>
                      {result.totalPerf3day >= 0 ? '+' : ''}{result.totalPerf3day}%
                    </td>
                    <td className="text-right py-2 px-3 font-bold" style={{ color: result.totalPerf7day >= 0 ? '#22c55e' : '#ef4444' }}>
                      {result.totalPerf7day >= 0 ? '+' : ''}{result.totalPerf7day}%
                    </td>
                    <td className="text-right py-2 px-3 font-bold" style={{ color: result.totalPerf14day >= 0 ? '#22c55e' : '#ef4444' }}>
                      {result.totalPerf14day >= 0 ? '+' : ''}{result.totalPerf14day}%
                    </td>
                    <td className="text-right py-2 px-3 font-bold" style={{ color: result.totalPerf30day >= 0 ? '#22c55e' : '#ef4444' }}>
                      {result.totalPerf30day >= 0 ? '+' : ''}{result.totalPerf30day}%
                    </td>
                    <td className="text-center py-2 px-3" style={{ color: '#d1d5db' }}>{result.crossoverCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Performance Matrix */}
      <MAPerformanceMatrix
        simulationResults={simulationResults}
        onParametersSelect={onParametersSelect}
      />
    </div>
  );
}
