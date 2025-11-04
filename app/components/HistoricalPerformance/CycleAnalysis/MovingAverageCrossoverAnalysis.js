import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ScatterChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
  Scatter,
  ZAxis
} from 'recharts';

const PERFORMANCE_METRICS = [3, 7, 14, 30];
const METRIC_COLORS = {
  3: '#22c55e',
  7: '#38bdf8',
  14: '#f97316',
  30: '#f472b6'
};

export function MovingAverageCrossoverAnalysis({ cycleAnalysis, maShort = 50, maLong = 200, loading = false, onSimulate = null }) {
  const [simulationResults, setSimulationResults] = useState(null);
  const [simulating, setSimulating] = useState(false);
  const [progressMessage, setProgressMessage] = useState('');

  const formatPerformance = (value) => {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return 'N/A';
    }

    const numericValue = Number.parseFloat(value);
    if (Number.isNaN(numericValue)) {
      return 'N/A';
    }

    const formatted = numericValue.toFixed(2);
    return `${numericValue >= 0 ? '+' : ''}${formatted}%`;
  };

  const chartTooltipContent = ({ active, payload }) => {
    if (!active || !payload || payload.length === 0) return null;

    const { short, long, metric, total } = payload[0].payload;

    return (
      <div className="rounded bg-slate-900/90 p-3 border border-blue-700">
        <div className="text-xs uppercase tracking-wide text-blue-200 mb-1">MA Combination</div>
        <div className="text-sm font-semibold text-blue-100">Short {short} / Long {long}</div>
        <div className="text-xs text-blue-200 mt-2">{metric}-Day Total Performance:</div>
        <div className="text-sm font-semibold" style={{ color: total >= 0 ? '#22c55e' : '#ef4444' }}>{formatPerformance(total)}</div>
      </div>
    );
  };

  const runSimulation = async () => {
    setSimulating(true);
    setProgressMessage('Initializing simulation...');

    // Simulate different MA combinations from 5 to 100 for short, 50 to 300 for long
    const shortMAs = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 70, 80, 90, 100];
    const longMAs = [50, 60, 70, 80, 100, 120, 150, 180, 200, 220, 250, 280, 300];

    const results = [];
    let totalCombinations = 0;
    let currentCombination = 0;

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
            `/api/cycle-analysis?symbol=${onSimulate?.stockCode}&years=5&mode=ma-crossover&maShort=${short}&maLong=${long}`
          );

          if (!response.ok) continue;

          const data = await response.json();

          if (data.crossovers) {
            const totals = {};
            const winRates = {};

            PERFORMANCE_METRICS.forEach(metric => {
              const perfKey = `perf${metric}day`;
              let totalPerf = 0;
              let wins = 0;
              let validSignals = 0;

              data.crossovers.forEach(cross => {
                const value = cross[perfKey];
                if (value !== null && value !== undefined) {
                  const perfValue = Number.parseFloat(value);
                  if (!Number.isNaN(perfValue)) {
                    totalPerf += perfValue;
                    validSignals++;
                    if (perfValue > 0) {
                      wins++;
                    }
                  }
                }
              });

              totals[metric] = Number.parseFloat(totalPerf.toFixed(2));
              winRates[metric] = validSignals > 0 ? Number.parseFloat(((wins / validSignals) * 100).toFixed(1)) : 0;
            });

            results.push({
              short,
              long,
              totals,
              winRates,
              crossoverCount: data.crossovers.length
            });
          }
        } catch (err) {
          console.error(`Error fetching MA crossover for ${short}/${long}:`, err);
        }
      }
    }

    const primaryMetric = 7;
    results.sort((a, b) => (b.totals?.[primaryMetric] ?? 0) - (a.totals?.[primaryMetric] ?? 0));

    const chartData = PERFORMANCE_METRICS.reduce((acc, metric) => {
      acc[metric] = results.map(result => ({
        x: result.long,
        y: result.short,
        z: Math.max(Math.abs(result.totals?.[metric] ?? 0), 1),
        total: result.totals?.[metric] ?? 0,
        metric,
        short: result.short,
        long: result.long
      }));
      return acc;
    }, {});

    setSimulationResults({
      topResults: results.slice(0, 20),
      allResults: results,
      metrics: PERFORMANCE_METRICS,
      primaryMetric,
      chartData
    });

    setProgressMessage('');
    setSimulating(false);
  };

  const applyParameters = (short, long) => {
    // This will be called when user clicks on a result
    if (onSimulate?.onParametersSelect) {
      onSimulate.onParametersSelect(short, long);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4 mb-6">
        <p className="italic" style={{ fontSize: '11px', color: '#fef08a' }}>
          <strong style={{ fontStyle: 'normal', color: '#fefce8' }}>Moving Average Crossover Analysis:</strong> This tracks the relationship between {maShort}-day and {maLong}-day moving averages.
          A <strong style={{ fontStyle: 'normal', color: '#22c55e' }}>Golden Cross</strong> (bullish signal) occurs when the {maShort}-day MA crosses above the {maLong}-day MA.
          A <strong style={{ fontStyle: 'normal', color: '#ef4444' }}>Death Cross</strong> (bearish signal) occurs when the {maShort}-day MA crosses below the {maLong}-day MA.
          These crossovers are widely used technical indicators for identifying potential trend changes in the market.
        </p>
      </div>

      <div className="rounded-lg p-6 border" style={{ backgroundColor: 'rgba(23, 37, 84, 0.5)', borderColor: '#1e3a8a' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold" style={{ color: '#dbeafe' }}>Current Moving Average Status</h3>
          {loading && (
            <div className="flex items-center gap-2 text-blue-400">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
              <span className="text-sm">Analyzing...</span>
            </div>
          )}
        </div>
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-sm" style={{ color: '#93c5fd' }}>Current Price</div>
            <div className="text-xl font-bold style={{ color: '#dbeafe' }}">${cycleAnalysis.currentPrice}</div>
          </div>
          <div className="text-center">
            <div className="text-sm" style={{ color: '#93c5fd' }}>{maShort}-Day MA</div>
            <div className="text-xl font-bold text-blue-400">${cycleAnalysis.currentMA50}</div>
          </div>
          <div className="text-center">
            <div className="text-sm" style={{ color: '#93c5fd' }}>{maLong}-Day MA</div>
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

        {/* Simulation Button Section */}
        <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: 'rgba(30, 58, 138, 0.3)', borderLeft: '3px solid #3b82f6' }}>
          <p className="text-sm mb-3" style={{ color: '#bfdbfe' }}>
            <strong>Optimize MA Strategy:</strong> Find the best Short/Long MA combination for maximum performance
          </p>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={runSimulation}
              disabled={simulating}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded transition-colors text-sm font-semibold"
            >
              {simulating ? 'Simulating...' : 'Find Best MA Performance'}
            </button>
          </div>

          {/* Progress Message */}
          {simulating && progressMessage && (
            <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)', borderLeft: '2px solid #60a5fa' }}>
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                <span style={{ color: '#bfdbfe' }} className="text-sm font-medium">{progressMessage}</span>
              </div>
            </div>
          )}
        </div>

        {/* Simulation Results */}
        {simulationResults && (
          <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', borderLeft: '3px solid #10b981' }}>
            <h4 className="text-base font-bold mb-3" style={{ color: '#86efac' }}>
              Top 20 MA Combinations (Ranked by Total {simulationResults.primaryMetric}-Day %)
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid #1d4ed8' }}>
                    <th className="text-left py-2 px-3" style={{ color: '#93c5fd' }}>Rank</th>
                    <th className="text-center py-2 px-3" style={{ color: '#93c5fd' }}>Short MA</th>
                    <th className="text-center py-2 px-3" style={{ color: '#93c5fd' }}>Long MA</th>
                    {simulationResults.metrics.map(metric => (
                      <th key={metric} className="text-right py-2 px-3" style={{ color: '#93c5fd' }}>
                        Total {metric}-Day %
                      </th>
                    ))}
                    <th className="text-center py-2 px-3" style={{ color: '#93c5fd' }}>Signals</th>
                    <th className="text-right py-2 px-3" style={{ color: '#93c5fd' }}>Win Rate ({simulationResults.primaryMetric}-Day)</th>
                  </tr>
                </thead>
                <tbody>
                  {simulationResults.topResults.map((result, idx) => (
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
                      {simulationResults.metrics.map(metric => {
                        const value = result.totals?.[metric] ?? 0;
                        return (
                          <td
                            key={metric}
                            className="text-right py-2 px-3 font-bold"
                            style={{ color: value >= 0 ? '#22c55e' : '#ef4444' }}
                          >
                            {formatPerformance(value)}
                          </td>
                        );
                      })}
                      <td className="text-center py-2 px-3" style={{ color: '#d1d5db' }}>{result.crossoverCount}</td>
                      <td className="text-right py-2 px-3" style={{ color: '#fbbf24' }}>
                        {result.winRates?.[simulationResults.primaryMetric]?.toFixed(1) ?? '0.0'}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              onClick={() => setSimulationResults(null)}
              className="mt-3 px-3 py-1 text-sm bg-gray-600 hover:bg-gray-700 text-gray-200 rounded transition-colors"
            >
              Close Results
            </button>
            <div className="mt-6">
              <h5 className="text-sm font-semibold mb-2" style={{ color: '#bfdbfe' }}>
                Performance Distribution by Moving Average Combination
              </h5>
              <div className="h-96">
                <ResponsiveContainer>
                  <ScatterChart margin={{ top: 20, right: 30, bottom: 40, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e3a8a" />
                    <XAxis
                      type="number"
                      dataKey="x"
                      name="Long MA"
                      tick={{ fill: '#bfdbfe', fontSize: 12 }}
                      label={{ value: 'Long MA Length', position: 'insideBottom', offset: -10, fill: '#93c5fd' }}
                    />
                    <YAxis
                      type="number"
                      dataKey="y"
                      name="Short MA"
                      tick={{ fill: '#bfdbfe', fontSize: 12 }}
                      label={{ value: 'Short MA Length', angle: -90, position: 'insideLeft', fill: '#93c5fd' }}
                    />
                    <ZAxis type="number" dataKey="z" range={[60, 200]} />
                    <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} content={chartTooltipContent} />
                    <Legend wrapperStyle={{ color: '#bfdbfe' }} />
                    {simulationResults.metrics.map(metric => (
                      <Scatter
                        key={metric}
                        name={`${metric}-Day Total`}
                        data={simulationResults.chartData?.[metric] ?? []}
                        fill={METRIC_COLORS[metric]}
                      />
                    ))}
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}


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
              {cycleAnalysis.crossovers?.sort((a, b) => new Date(b.date) - new Date(a.date)).map((cross, idx) => (
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
