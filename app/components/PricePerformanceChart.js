import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

/**
 * PricePerformanceChart
 * Displays either raw price chart for single stock or normalized percentage comparison lines.
 * Props:
 * - selectedStock: primary stock object with chartData
 * - chartPeriod: current period key
 * - setChartPeriod: function to update period
 * - periods: array of period keys
 * - chartCompareStocks: [{ code, series, __stockRef }]
 * - addChartCompareStock: function to add a comparison stock
 * - removeChartCompareStock: function to remove comparison stock by code
 * - chartCompareInput: current input string for adding comparison stock
 * - setChartCompareInput: setter for input
 * - buildNormalizedSeries: helper to build normalized series
 * - buildMultiStockDataset: helper to merge multiple series
 */
export function PricePerformanceChart({
  selectedStock,
  chartPeriod,
  setChartPeriod,
  periods,
  chartCompareStocks,
  addChartCompareStock,
  removeChartCompareStock,
  chartCompareInput,
  setChartCompareInput,
  buildNormalizedSeries,
  buildMultiStockDataset
}) {
  const chartData = selectedStock?.chartData?.[chartPeriod] || [];

  return (
    <div className="mb-6" style={{ marginTop: '1rem' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white">Price Performance</h3>
        <div className="flex gap-2">
          {periods.map(period => (
            <button
              key={period}
              onClick={() => {
                setChartPeriod(period);
                if (typeof window !== 'undefined') {
                  localStorage.setItem('chartPeriod', period);
                }
              }}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                chartPeriod === period
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>
      <div className="bg-gray-800 rounded-xl p-4 shadow-xl border border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <div className="flex gap-2 flex-1">
            <input
              type="text"
              placeholder="Add stock to chart (e.g. MSFT)"
              value={chartCompareInput}
              onChange={(e)=> setChartCompareInput(e.target.value)}
              onKeyDown={(e)=> e.key==='Enter' && addChartCompareStock()}
              className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 placeholder-gray-400"
            />
            <button
              onClick={addChartCompareStock}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition"
            >Add</button>
          </div>
        </div>
        {chartCompareStocks.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {chartCompareStocks.map(s => (
              <span key={s.code} className="flex items-center gap-1 bg-gray-700 px-2 py-1 rounded text-xs text-gray-200">
                {s.code}
                <button onClick={()=> removeChartCompareStock(s.code)} className="text-red-400 hover:text-red-300">×</button>
              </span>
            ))}
          </div>
        )}
        <ResponsiveContainer width="100%" height={320}>
          {(() => {
            const primarySeries = buildNormalizedSeries(selectedStock, chartPeriod);
            const multiData = chartCompareStocks.length === 0
              ? chartData
              : buildMultiStockDataset(primarySeries, chartCompareStocks);
            return (
              <LineChart data={multiData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9CA3AF" />
                {chartCompareStocks.length === 0 ? (
                  (() => {
                    const hasData = chartData.length > 0;
                    const rawMin = hasData ? Math.min(...chartData.map(d => d.price)) * 0.95 : 0;
                    const rawMax = hasData ? Math.max(...chartData.map(d => d.price)) * 1.05 : 10;
                    const intMin = Math.floor(rawMin);
                    const intMax = Math.ceil(rawMax);
                    return (
                      <YAxis
                        stroke="#9CA3AF"
                        allowDecimals={false}
                        domain={[intMin, intMax]}
                        tickFormatter={(v) => Math.round(v)}
                      />
                    );
                  })()
                ) : (
                  <YAxis
                    stroke="#9CA3AF"
                    tickFormatter={(v)=> `${Math.round(v)}%`}
                    domain={['auto','auto']}
                    allowDecimals={false}
                  />
                )}
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                  labelStyle={{ color: '#F3F4F6' }}
                  formatter={(value, name) => [chartCompareStocks.length === 0 ? `$${value.toFixed(2)}` : `${value.toFixed(2)}%`, name]}
                />
                <Legend />
                {chartCompareStocks.length === 0 ? (
                  <Line type="monotone" dataKey="price" stroke="#3B82F6" strokeWidth={2} dot={false} />
                ) : (
                  <>
                    <Line type="monotone" dataKey={selectedStock.code} name={selectedStock.code} stroke="#3B82F6" strokeWidth={2} dot={false} />
                    {chartCompareStocks.map((s, idx) => (
                      <Line
                        key={s.code}
                        type="monotone"
                        dataKey={s.code}
                        name={s.code}
                        strokeWidth={2}
                        dot={false}
                        stroke={['#10B981','#F59E0B','#EF4444','#8B5CF6','#0EA5E9','#84CC16','#D946EF'][idx % 7]}
                      />
                    ))}
                  </>
                )}
              </LineChart>
            );
          })()}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
