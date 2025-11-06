"use client";

import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from "recharts";

export function LeadLagAnalysis({ symbol1, symbol2, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [years, setYears] = useState(5);
  const [maxLag, setMaxLag] = useState(10);

  useEffect(() => {
    if (!symbol1 || !symbol2) return;

    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/stock-correlation?symbol1=${symbol1}&symbol2=${symbol2}&years=${years}&maxLag=${maxLag}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch correlation data");
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error("Error fetching lead-lag data:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [symbol1, symbol2, years, maxLag]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-400">Analyzing lead-lag relationship...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <button
          onClick={onBack}
          className="text-blue-400 hover:text-blue-300 flex items-center gap-2"
        >
          ← Back to Correlation Table
        </button>
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
          <p className="text-red-400">Error loading analysis: {error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  // Validate data structure
  if (!data.leadLag || !data.correlation || !data.summary) {
    return (
      <div className="space-y-4">
        <button
          onClick={onBack}
          className="text-blue-400 hover:text-blue-300 flex items-center gap-2"
        >
          ← Back to Correlation Table
        </button>
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
          <p className="text-red-400">Invalid or incomplete correlation data received.</p>
        </div>
      </div>
    );
  }

  // Find the best correlation with null safety
  const bestCorr = data.leadLag?.bestCorrelation ?? 0;
  const bestLag = data.leadLag?.bestLag ?? 0;

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex justify-between items-center">
        <button
          onClick={onBack}
          className="text-blue-400 hover:text-blue-300 flex items-center gap-2 font-medium"
        >
          ← Back to Correlation Table
        </button>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-400">Time Period:</label>
            <select
              value={years}
              onChange={(e) => setYears(parseInt(e.target.value))}
              className="bg-gray-700 text-white px-3 py-1 rounded border border-gray-600 focus:outline-none focus:border-blue-500"
            >
              <option value={1}>1 Year</option>
              <option value={2}>2 Years</option>
              <option value={5}>5 Years</option>
              <option value={10}>10 Years</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-400">Max Lag:</label>
            <select
              value={maxLag}
              onChange={(e) => setMaxLag(parseInt(e.target.value))}
              className="bg-gray-700 text-white px-3 py-1 rounded border border-gray-600 focus:outline-none focus:border-blue-500"
            >
              <option value={5}>5 Days</option>
              <option value={10}>10 Days</option>
              <option value={20}>20 Days</option>
              <option value={30}>30 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Title */}
      <div>
        <h3 className="text-2xl font-bold text-white">
          Lead-Lag Analysis: {symbol1} vs {symbol2}
        </h3>
        <p className="text-gray-400 mt-1">
          Analyzing correlation at different time lags to detect leading/lagging relationships
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-400">Basic Correlation</div>
          <div className={`text-3xl font-bold mt-2 ${
            Math.abs(data.correlation?.value ?? 0) > 0.7 ? 'text-green-400' :
            Math.abs(data.correlation?.value ?? 0) > 0.3 ? 'text-yellow-400' :
            'text-gray-400'
          }`}>
            {(data.correlation?.value ?? 0).toFixed(3)}
          </div>
          <div className="text-sm text-gray-400 mt-1">
            {data.correlation?.strength ?? 'Unknown'} {data.correlation?.direction ?? ''}
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-400">Best Correlation</div>
          <div className={`text-3xl font-bold mt-2 ${
            Math.abs(bestCorr) > 0.7 ? 'text-green-400' :
            Math.abs(bestCorr) > 0.3 ? 'text-yellow-400' :
            'text-gray-400'
          }`}>
            {bestCorr.toFixed(3)}
          </div>
          <div className="text-sm text-gray-400 mt-1">
            at {bestLag === 0 ? 'no lag' : `${Math.abs(bestLag)} day lag`}
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-400">Leading Stock</div>
          <div className="text-3xl font-bold mt-2 text-blue-400">
            {(data.leadLag?.leader === 'None' || !data.leadLag?.leaderSymbol) ? 'Simultaneous' : data.leadLag.leaderSymbol}
          </div>
          <div className="text-sm text-gray-400 mt-1">
            {(data.leadLag?.leadDays ?? 0) > 0 ? `${data.leadLag.leadDays} day${data.leadLag.leadDays > 1 ? 's' : ''} ahead` : 'Moves together'}
          </div>
        </div>
      </div>

      {/* Interpretation */}
      <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-4">
        <h4 className="font-semibold text-blue-300 mb-2">Interpretation</h4>
        <p className="text-gray-300">{data.leadLag?.interpretation ?? 'No interpretation available.'}</p>
      </div>

      {/* Cross-Correlation Chart */}
      {data.crossCorrelation && data.crossCorrelation.length > 0 && (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-white mb-4">Cross-Correlation Function</h4>
        <p className="text-sm text-gray-400 mb-4">
          Shows correlation at different time lags. Negative lag means {symbol2} leads, positive lag means {symbol1} leads.
        </p>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={data.crossCorrelation}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="lag"
              stroke="#9CA3AF"
              label={{ value: 'Lag (days)', position: 'insideBottom', offset: -10, fill: '#9CA3AF' }}
            />
            <YAxis
              stroke="#9CA3AF"
              label={{ value: 'Correlation', angle: -90, position: 'insideLeft', fill: '#9CA3AF' }}
              domain={[-1, 1]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '0.5rem',
                color: '#F3F4F6'
              }}
              formatter={(value) => [value.toFixed(3), 'Correlation']}
              labelFormatter={(lag) => {
                if (lag === 0) return 'No lag';
                if (lag > 0) return `${symbol1} leads by ${lag} day${lag > 1 ? 's' : ''}`;
                return `${symbol2} leads by ${Math.abs(lag)} day${Math.abs(lag) > 1 ? 's' : ''}`;
              }}
            />
            <ReferenceLine y={0} stroke="#6B7280" strokeDasharray="3 3" />
            <ReferenceLine x={0} stroke="#6B7280" strokeDasharray="3 3" />
            <Bar
              dataKey="correlation"
              fill="#3B82F6"
              radius={[4, 4, 0, 0]}
              fillOpacity={0.8}
              onMouseEnter={(data, index) => {
                // Highlight the bar on hover
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      )}

      {/* Rolling Correlation Chart */}
      {data.rollingCorrelation && data.rollingCorrelation.length > 0 && (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-white mb-4">Rolling 30-Day Correlation</h4>
        <p className="text-sm text-gray-400 mb-4">
          Shows how correlation changes over time using a 30-day rolling window.
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={data.rollingCorrelation}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="date"
              stroke="#9CA3AF"
              tickFormatter={(date) => {
                const d = new Date(date);
                return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear().toString().slice(2)}`;
              }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              stroke="#9CA3AF"
              label={{ value: 'Correlation', angle: -90, position: 'insideLeft', fill: '#9CA3AF' }}
              domain={[-1, 1]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '0.5rem',
                color: '#F3F4F6'
              }}
              formatter={(value) => [value.toFixed(3), 'Correlation']}
            />
            <ReferenceLine y={0} stroke="#6B7280" strokeDasharray="3 3" />
            <Line
              type="monotone"
              dataKey="correlation"
              stroke="#10B981"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      )}

      {/* Statistics Summary */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-white mb-4">Statistical Summary</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-400">Avg Return ({symbol1})</div>
            <div className={`text-xl font-bold mt-1 ${
              (data.summary?.avgReturn1 ?? 0) > 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {((data.summary?.avgReturn1 ?? 0) * 100).toFixed(3)}%
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-400">Avg Return ({symbol2})</div>
            <div className={`text-xl font-bold mt-1 ${
              (data.summary?.avgReturn2 ?? 0) > 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {((data.summary?.avgReturn2 ?? 0) * 100).toFixed(3)}%
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-400">Volatility ({symbol1})</div>
            <div className="text-xl font-bold mt-1 text-yellow-400">
              {((data.summary?.volatility1 ?? 0) * 100).toFixed(3)}%
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-400">Volatility ({symbol2})</div>
            <div className="text-xl font-bold mt-1 text-yellow-400">
              {((data.summary?.volatility2 ?? 0) * 100).toFixed(3)}%
            </div>
          </div>
        </div>
      </div>

      {/* Data Points Info */}
      <div className="text-sm text-gray-400 text-center">
        Analysis based on {data.dataPoints ?? 0} trading days of overlapping data
      </div>
    </div>
  );
}
