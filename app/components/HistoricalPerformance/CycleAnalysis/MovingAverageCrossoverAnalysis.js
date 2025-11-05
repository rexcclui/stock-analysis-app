import React, { useState } from 'react';
import { BarChart3, ArrowUp, ArrowDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceDot } from 'recharts';
import { MASimulation } from './MASimulation';

export function MovingAverageCrossoverAnalysis({ cycleAnalysis, maShort = 50, maLong = 200, loading = false, onSimulate = null }) {
  const [showChart, setShowChart] = useState(false);

  // Custom dot for crossover markers
  const CrossoverDot = (props) => {
    const { cx, cy, payload } = props;
    if (!payload.crossover) return null;

    const isBullish = payload.crossover === 'Bullish';
    const color = isBullish ? '#22c55e' : '#ef4444';
    const label = isBullish ? 'B' : 'S';

    return (
      <g>
        <circle cx={cx} cy={cy} r={8} fill={color} stroke="#fff" strokeWidth={2} />
        <text
          x={cx}
          y={cy + 1}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#fff"
          fontSize={10}
          fontWeight="bold"
        >
          {label}
        </text>
        {isBullish ? (
          <path
            d={`M ${cx} ${cy - 18} L ${cx - 4} ${cy - 12} L ${cx + 4} ${cy - 12} Z`}
            fill={color}
          />
        ) : (
          <path
            d={`M ${cx} ${cy + 18} L ${cx - 4} ${cy + 12} L ${cx + 4} ${cy + 12} Z`}
            fill={color}
          />
        )}
      </g>
    );
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
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold" style={{ color: '#dbeafe' }}>Current Moving Average Status</h3>
            <button
              onClick={() => setShowChart(!showChart)}
              className="p-1.5 rounded hover:bg-blue-900/50 transition-colors"
              title={showChart ? "Show table view" : "Show chart view"}
            >
              <BarChart3 size={20} style={{ color: '#60a5fa' }} />
            </button>
          </div>
          {loading && (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-400"></div>
              <span className="text-sm" style={{ color: '#22d3ee', fontStyle: 'italic' }}>Analyzing...</span>
            </div>
          )}
        </div>

        {!showChart ? (
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
        ) : (
          <div style={{ width: '100%', height: '400px' }}>
            {(() => {
              if (!cycleAnalysis.chartData || cycleAnalysis.chartData.length === 0) {
                return (
                  <div className="flex items-center justify-center h-full">
                    <span style={{ color: '#9ca3af' }}>No chart data available</span>
                  </div>
                );
              }

              // Mark crossover points on chart data
              const crossoverDates = new Set();
              const crossoverMap = {};
              if (cycleAnalysis.crossovers) {
                cycleAnalysis.crossovers.forEach(cross => {
                  crossoverDates.add(cross.date);
                  crossoverMap[cross.date] = cross.signal;
                });
              }

              // Enrich chart data with crossover markers
              const enrichedData = cycleAnalysis.chartData.map(point => ({
                ...point,
                crossover: crossoverMap[point.date] || null,
                displayDate: new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              }));

              return (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={enrichedData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e3a8a" />
                    <XAxis
                      dataKey="displayDate"
                      stroke="#93c5fd"
                      tick={{ fill: '#93c5fd', fontSize: 11 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      stroke="#93c5fd"
                      tick={{ fill: '#93c5fd', fontSize: 11 }}
                      domain={['auto', 'auto']}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e3a8a', border: '1px solid #60a5fa', borderRadius: '4px' }}
                      labelStyle={{ color: '#dbeafe' }}
                      itemStyle={{ color: '#dbeafe' }}
                    />
                    <Legend
                      wrapperStyle={{ color: '#dbeafe' }}
                      iconType="line"
                    />
                    <Line
                      type="monotone"
                      dataKey="price"
                      stroke="#ffffff"
                      strokeWidth={2}
                      name="Price"
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="maShort"
                      stroke="#fbbf24"
                      strokeWidth={2}
                      name={`${maShort}-Day MA`}
                      dot={false}
                      connectNulls
                    />
                    <Line
                      type="monotone"
                      dataKey="maLong"
                      stroke="#1e40af"
                      strokeWidth={2}
                      name={`${maLong}-Day MA`}
                      dot={false}
                      connectNulls
                    />
                    <Line
                      type="monotone"
                      dataKey="price"
                      stroke="transparent"
                      dot={<CrossoverDot />}
                      activeDot={false}
                      legendType="none"
                    />
                  </LineChart>
                </ResponsiveContainer>
              );
            })()}
          </div>
        )}
      </div>

      {!showChart && (
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
      )}

      {/* MA Simulation Component at the bottom */}
      {onSimulate?.stockCode && (
        <MASimulation
          stockCode={onSimulate.stockCode}
          onParametersSelect={onSimulate.onParametersSelect}
        />
      )}
    </div>
  );
}
