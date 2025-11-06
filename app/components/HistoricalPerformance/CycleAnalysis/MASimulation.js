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

  const runSimulation = async (forceRefresh = false) => {
    // Check cache first (unless forcing refresh)
    if (!forceRefresh) {
      const cached = loadFromCache(stockCode);
      if (cached) {
        setSimulationResults(cached);
        return;
      }
    }

    setSimulating(true);
    setProgressMessage('Initializing simulation...');

    // Simulate different MA combinations from 3 to 100 for short, 20 to 300 for long
    const shortMAs = [3, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 70, 80, 90, 100];
    const longMAs = [20, 25, 30, 50, 60, 70, 80, 100, 120, 150, 180, 200, 220, 250, 280, 300];

    const results = [];
    let totalCombinations = 0;
    let currentCombination = 0;
    let marketReturn = null;

    // Calculate total combinations (rough estimate, will be adjusted by filters)
    for (const short of shortMAs) {
      for (const long of longMAs) {
        // Skip if ratio of short MA / long MA > 0.6
        if (short / long > 0.6) continue;
        if (short < long) totalCombinations++;
      }
    }

    // Reorganized: iterate by long MA (outer) and short MA (inner) for efficient pruning
    for (const long of longMAs) {
      let lastCrossoverCountValid = true; // Track if last short MA met criteria
      
      for (const short of shortMAs) {
        if (short >= long) continue; // Short MA must be less than Long MA

        // Skip if ratio of short MA / long MA > 0.6
        if (short / long > 0.6) continue;

        // Skip remaining short MAs if previous one didn't meet minimum crossover criteria
        const minimumCrossovers = Math.ceil(long / short);
        if (!lastCrossoverCountValid && short > 3) {
          // Mark as skipped (skip further testing for this long MA with larger short MAs)
          results.push({
            short,
            long,
            skipped: true, // Mark as skipped during pruning
            totalPerf3day: 0,
            totalPerf7day: 0,
            totalPerf14day: 0,
            totalPerf30day: 0,
            crossoverCount: 0,
          });
          continue;
        }

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
              let perf3 = cross.perf3day;
              if (perf3 === null && cross.perfAvailableDay && cross.perfAvailableDay >= 1) {
                perf3 = cross[`perf${cross.perfAvailableDay}day`];
              }
              if (perf3 !== null && perf3 !== undefined) {
                totalPerf3day += parseFloat(perf3);
                count3day++;
                if (parseFloat(perf3) > 0) wins3day++;
              }

              // 7-day
              let perf7 = cross.perf7day;
              if (perf7 === null && cross.perfAvailableDay && cross.perfAvailableDay >= 1) {
                perf7 = cross[`perf${cross.perfAvailableDay}day`];
              }
              if (perf7 !== null && perf7 !== undefined) {
                totalPerf7day += parseFloat(perf7);
                count7day++;
                if (parseFloat(perf7) > 0) wins7day++;
              }

              // 14-day
              let perf14 = cross.perf14day;
              if (perf14 === null && cross.perfAvailableDay && cross.perfAvailableDay >= 1) {
                perf14 = cross[`perf${cross.perfAvailableDay}day`];
              }
              if (perf14 !== null && perf14 !== undefined) {
                totalPerf14day += parseFloat(perf14);
                count14day++;
                if (parseFloat(perf14) > 0) wins14day++;
              }

              // 30-day
              let perf30 = cross.perf30day;
              if (perf30 === null && cross.perfAvailableDay && cross.perfAvailableDay >= 1) {
                perf30 = cross[`perf${cross.perfAvailableDay}day`];
              }
              if (perf30 !== null && perf30 !== undefined) {
                totalPerf30day += parseFloat(perf30);
                count30day++;
                if (parseFloat(perf30) > 0) wins30day++;
              }
            });

            results.push({
              short,
              long,
              totalPerf3day: parseFloat((count3day > 0 ? (totalPerf3day / count3day) : 0).toFixed(2)),
              totalPerf7day: parseFloat((count7day > 0 ? (totalPerf7day / count7day) : 0).toFixed(2)),
              totalPerf14day: parseFloat((count14day > 0 ? (totalPerf14day / count14day) : 0).toFixed(2)),
              totalPerf30day: parseFloat((count30day > 0 ? (totalPerf30day / count30day) : 0).toFixed(2)),
              crossoverCount: data.crossovers.length,
              winRate3day: count3day > 0 ? ((wins3day / count3day) * 100).toFixed(1) : '0.0',
              winRate7day: count7day > 0 ? ((wins7day / count7day) * 100).toFixed(1) : '0.0',
              winRate14day: count14day > 0 ? ((wins14day / count14day) * 100).toFixed(1) : '0.0',
              winRate30day: count30day > 0 ? ((wins30day / count30day) * 100).toFixed(1) : '0.0',
            });

            // Check if this result meets minimum crossover criteria for future pruning
            if (data.crossovers.length >= 3) {
              lastCrossoverCountValid = true;
            } else {
              lastCrossoverCountValid = false;
            }
          }
        } catch (err) {
          console.error(`Error fetching MA crossover for ${short}/${long}:`, err);
        }
      }
    }

    // Sort by totalPerf7day descending (default sorting) - now using averages
    results.sort((a, b) => b.totalPerf7day - a.totalPerf7day);

    // Filter results: buy count should be more than long MA / short MA ratio, or if count >= 5 is fine
    const filteredResults = results.filter(result => {
      // Always include if B count >= 3 (lowered threshold for combinations like 3/30 and 3/50)
      if (result.crossoverCount >= 3) return true;
      
      // Otherwise, check the MA ratio requirement
      const minimumCrossovers = Math.ceil(result.long / result.short);
      return result.crossoverCount > minimumCrossovers;
    });

    const resultData = {
      topResults: filteredResults.slice(0, 20),
      allResults: filteredResults,
      allResultsUnfiltered: results, // Include all results (both filtered and unfiltered)
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
      <div className="p-4 rounded-lg mt-12" style={{ backgroundColor: 'rgba(250, 204, 21, 0.2)', borderLeft: '3px solid #facc15' }}>
        <p className="text-sm mb-3" style={{ color: '#bfdbfe' }}>
          <strong>Optimize MA Strategy:</strong> Find the best Short/Long MA combination across all time periods (3, 7, 14, 30 days)
          {simulationResults && <span className="ml-2 text-green-400">(Using cached results)</span>}
        </p>
        <button
          onClick={() => runSimulation(simulationResults ? true : false)}
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
        <div className="p-4 rounded-lg mt-8" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', borderLeft: '3px solid #10b981' }}>
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
                    Avg 3-Day % {sortBy === 'totalPerf3day' && (sortOrder === 'desc' ? '↓' : '↑')}
                  </th>
                  <th
                    className="text-right py-2 px-3 cursor-pointer hover:bg-blue-900/30"
                    style={{ color: '#93c5fd' }}
                    onClick={() => handleSort('totalPerf7day')}
                  >
                    Avg 7-Day % {sortBy === 'totalPerf7day' && (sortOrder === 'desc' ? '↓' : '↑')}
                  </th>
                  <th
                    className="text-right py-2 px-3 cursor-pointer hover:bg-blue-900/30"
                    style={{ color: '#93c5fd' }}
                    onClick={() => handleSort('totalPerf14day')}
                  >
                    Avg 14-Day % {sortBy === 'totalPerf14day' && (sortOrder === 'desc' ? '↓' : '↑')}
                  </th>
                  <th
                    className="text-right py-2 px-3 cursor-pointer hover:bg-blue-900/30"
                    style={{ color: '#93c5fd' }}
                    onClick={() => handleSort('totalPerf30day')}
                  >
                    Avg 30-Day % {sortBy === 'totalPerf30day' && (sortOrder === 'desc' ? '↓' : '↑')}
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
                  <tr
                    key={idx}
                    style={{ borderBottom: '1px solid #1e3a8a', cursor: 'pointer' }}
                    onMouseEnter={e => {
                      Array.from(e.currentTarget.children).forEach(td => {
                        td.style.backgroundColor = '#fde047';
                        td.style.color = '#2563eb';
                      });
                    }}
                    onMouseLeave={e => {
                      Array.from(e.currentTarget.children).forEach((td, i) => {
                        td.style.backgroundColor = '';
                        if (i === 0) td.style.color = '#60a5fa';
                        else if (i === 1) td.style.color = '#60a5fa';
                        else if (i === 2) td.style.color = '#a78bfa';
                        else if (i >= 3 && i <= 6) td.style.color = result[['totalPerf3day','totalPerf7day','totalPerf14day','totalPerf30day'][i-3]] >= 0 ? '#22c55e' : '#ef4444';
                        else td.style.color = '#d1d5db';
                      });
                    }}
                  >
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

      {/* Recent Crossovers Table */}
      {simulationResults && simulationResults.recentCrossovers && simulationResults.recentCrossovers.length > 0 && (
        <div className="p-4 rounded-lg mt-8" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', borderLeft: '3px solid #f59e42' }}>
          <h4 className="text-base font-bold mb-3" style={{ color: '#f59e42' }}>
            Recent Crossovers
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid #f59e42' }}>
                  <th className="text-left py-2 px-3" style={{ color: '#f59e42' }}>Date</th>
                  <th className="text-center py-2 px-3" style={{ color: '#f59e42' }}>Short MA</th>
                  <th className="text-center py-2 px-3" style={{ color: '#f59e42' }}>Long MA</th>
                  <th className="text-right py-2 px-3" style={{ color: '#f59e42' }}>Perf 3-Day</th>
                  <th className="text-right py-2 px-3" style={{ color: '#f59e42' }}>Perf 7-Day</th>
                  <th className="text-right py-2 px-3" style={{ color: '#f59e42' }}>Perf 14-Day</th>
                  <th className="text-right py-2 px-3" style={{ color: '#f59e42' }}>Perf 30-Day</th>
                </tr>
              </thead>
              <tbody>
                {simulationResults.recentCrossovers.map((cross, idx) => (
                  <tr
                    key={idx}
                    style={{ borderBottom: '1px solid #f59e42', cursor: 'pointer' }}
                    onMouseEnter={e => {
                      Array.from(e.currentTarget.children).forEach(td => {
                        td.style.backgroundColor = '#fde047';
                        td.style.color = '#2563eb';
                      });
                    }}
                    onMouseLeave={e => {
                      Array.from(e.currentTarget.children).forEach((td, i) => {
                        td.style.backgroundColor = '';
                        td.style.color = '#f59e42';
                      });
                    }}
                  >
                    <td className="py-2 px-3 font-semibold" style={{ color: '#f59e42' }}>{cross.date}</td>
                    <td className="text-center py-2 px-3 font-semibold" style={{ color: '#f59e42' }}>{cross.short}d</td>
                    <td className="text-center py-2 px-3 font-semibold" style={{ color: '#f59e42' }}>{cross.long}d</td>
                    <td className="text-right py-2 px-3 font-bold" style={{ color: cross.perf3day >= 0 ? '#22c55e' : '#ef4444' }}>{cross.perf3day >= 0 ? '+' : ''}{cross.perf3day}%</td>
                    <td className="text-right py-2 px-3 font-bold" style={{ color: cross.perf7day >= 0 ? '#22c55e' : '#ef4444' }}>{cross.perf7day >= 0 ? '+' : ''}{cross.perf7day}%</td>
                    <td className="text-right py-2 px-3 font-bold" style={{ color: cross.perf14day >= 0 ? '#22c55e' : '#ef4444' }}>{cross.perf14day >= 0 ? '+' : ''}{cross.perf14day}%</td>
                    <td className="text-right py-2 px-3 font-bold" style={{ color: cross.perf30day >= 0 ? '#22c55e' : '#ef4444' }}>{cross.perf30day >= 0 ? '+' : ''}{cross.perf30day}%</td>
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
