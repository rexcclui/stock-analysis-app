'use client';

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

/**
 * SentimentTimeSeriesChart
 * Displays sentiment score over time for the past month
 * Props:
 * - sentimentTimeSeries: array of { date, score } objects
 */
export function SentimentTimeSeriesChart({ sentimentTimeSeries }) {
  if (!sentimentTimeSeries || sentimentTimeSeries.length === 0) {
    return (
      <div className="mb-6" style={{ marginTop: '1rem' }}>
        <h3 className="text-xl font-bold text-white mb-4">Sentiment Trend (1 Month)</h3>
        <div className="bg-gray-800 rounded-xl p-4 shadow-xl border border-gray-700">
          <div className="text-center py-8 text-gray-400">
            No sentiment data available for the past month
          </div>
        </div>
      </div>
    );
  }

  // Determine overall trend for color
  const firstScore = sentimentTimeSeries[0]?.score || 0.5;
  const lastScore = sentimentTimeSeries[sentimentTimeSeries.length - 1]?.score || 0.5;
  let strokeColor = '#8884d8'; // Neutral
  if (lastScore > firstScore + 0.05) {
    strokeColor = '#22c55e'; // Green for positive trend
  } else if (lastScore < firstScore - 0.05) {
    strokeColor = '#ef4444'; // Red for negative trend
  }

  // Format data for display - convert score to percentage
  const chartData = sentimentTimeSeries.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    score: (item.score * 100).toFixed(1),
    rawScore: item.score
  }));

  return (
    <div className="mb-6" style={{ marginTop: '1rem' }}>
      <h3 className="text-xl font-bold text-white mb-4">Sentiment Trend (1 Month)</h3>
      <div className="bg-gray-800 rounded-xl p-4 shadow-xl border border-gray-700">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm text-gray-300">
            Social media sentiment score over the past 30 days
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-gray-400">Positive (&gt;60%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span className="text-gray-400">Neutral (30-60%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-gray-400">Negative (&lt;30%)</span>
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="date"
              stroke="#9CA3AF"
              tick={{ fontSize: 12 }}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="#9CA3AF"
              domain={[0, 100]}
              ticks={[0, 30, 60, 100]}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '8px'
              }}
              labelStyle={{ color: '#F3F4F6' }}
              formatter={(value, name) => {
                const numValue = parseFloat(value);
                let sentiment = 'Neutral';
                if (numValue >= 60) sentiment = 'Positive';
                else if (numValue < 30) sentiment = 'Negative';
                return [`${value}% (${sentiment})`, 'Sentiment Score'];
              }}
            />
            {/* Reference lines for sentiment thresholds */}
            <ReferenceLine y={60} stroke="#22c55e" strokeDasharray="3 3" strokeOpacity={0.3} />
            <ReferenceLine y={30} stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.3} />
            <Line
              type="monotone"
              dataKey="score"
              stroke={strokeColor}
              strokeWidth={3}
              dot={{ fill: strokeColor, r: 3 }}
              activeDot={{ r: 5 }}
              name="Sentiment Score"
            />
          </LineChart>
        </ResponsiveContainer>
        <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
          <div>
            Start: <span className={`font-semibold ${firstScore >= 0.6 ? 'text-green-400' : firstScore < 0.3 ? 'text-red-400' : 'text-yellow-400'}`}>
              {(firstScore * 100).toFixed(1)}%
            </span>
          </div>
          <div>
            Latest: <span className={`font-semibold ${lastScore >= 0.6 ? 'text-green-400' : lastScore < 0.3 ? 'text-red-400' : 'text-yellow-400'}`}>
              {(lastScore * 100).toFixed(1)}%
            </span>
          </div>
          <div>
            Change: <span className={`font-semibold ${lastScore > firstScore ? 'text-green-400' : lastScore < firstScore ? 'text-red-400' : 'text-gray-400'}`}>
              {lastScore > firstScore ? '+' : ''}{((lastScore - firstScore) * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
