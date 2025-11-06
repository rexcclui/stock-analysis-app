'use client';

import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { LoadingState } from './LoadingState';

/**
 * GoogleTrendsChart
 * Displays Google Trends interest over time for the past 3 months
 * Props:
 * - trendTimeSeries: array of { date, interest } objects
 * - symbol: stock symbol for display
 */
export function GoogleTrendsChart({ trendTimeSeries, symbol, loading = false }) {
  const [isExpanded, setIsExpanded] = useState(false); // Collapsed by default

  // Calculate the actual period from the data
  let periodLabel = "No Data";
  let dayCount = 0;

  if (trendTimeSeries && trendTimeSeries.length > 0) {
    const firstDate = new Date(trendTimeSeries[0].date);
    const lastDate = new Date(trendTimeSeries[trendTimeSeries.length - 1].date);
    dayCount = Math.round((lastDate - firstDate) / (1000 * 60 * 60 * 24)) + 1;

    if (dayCount <= 1) {
      periodLabel = "1 Day";
    } else if (dayCount <= 7) {
      periodLabel = `${dayCount} Days`;
    } else if (dayCount <= 14) {
      periodLabel = `${Math.round(dayCount / 7)} Week${dayCount > 10 ? 's' : ''}`;
    } else if (dayCount <= 60) {
      periodLabel = `${Math.round(dayCount / 7)} Weeks`;
    } else {
      periodLabel = `${Math.round(dayCount / 30)} Month${dayCount > 45 ? 's' : ''}`;
    }
  }

  if (!trendTimeSeries || trendTimeSeries.length === 0) {
    if (loading) {
      return <LoadingState message="Loading Google Trends data..." className="mb-6" />;
    }
    return (
      <div className="mb-6" style={{ marginTop: '1rem' }}>
        <h3
          className="text-xl font-bold text-white mb-4 flex items-center justify-between cursor-pointer hover:text-blue-400 transition"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span>Google Trends ({periodLabel})</span>
          {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
        </h3>
        {isExpanded && (
          <div className="bg-gray-800 rounded-xl p-4 shadow-xl border border-gray-700">
            <div className="text-center py-8 text-gray-400">
              No Google Trends data available
            </div>
          </div>
        )}
      </div>
    );
  }

  // Determine overall trend for color
  const firstInterest = trendTimeSeries[0]?.interest || 50;
  const lastInterest = trendTimeSeries[trendTimeSeries.length - 1]?.interest || 50;
  let strokeColor = '#8884d8'; // Neutral (blue)
  if (lastInterest > firstInterest + 5) {
    strokeColor = '#22c55e'; // Green for increasing trend
  } else if (lastInterest < firstInterest - 5) {
    strokeColor = '#ef4444'; // Red for decreasing trend
  }

  // Format data for display
  const chartData = trendTimeSeries.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    interest: item.interest,
    fullDate: item.date
  }));

  // Calculate average interest
  const avgInterest = Math.round(
    trendTimeSeries.reduce((acc, item) => acc + item.interest, 0) / trendTimeSeries.length
  );

  return (
    <div className="mb-6" style={{ marginTop: '1rem' }}>
      <h3
        className="text-xl font-bold text-white mb-4 flex items-center justify-between cursor-pointer hover:text-blue-400 transition"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span>Google Trends ({periodLabel})</span>
        {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
      </h3>
      {isExpanded && (
        <div className="bg-gray-800 rounded-xl p-4 shadow-xl border border-gray-700">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm text-gray-300">
              Search interest for &quot;{symbol}&quot; over the available period ({dayCount} day{dayCount !== 1 ? 's' : ''})
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Interest Scale: 0-100</span>
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
                ticks={[0, 25, 50, 75, 100]}
                tickFormatter={(value) => `${value}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px'
                }}
                labelStyle={{ color: '#F3F4F6' }}
                formatter={(value) => [`${value} / 100`, 'Search Interest']}
              />
              <Line
                type="monotone"
                dataKey="interest"
                stroke={strokeColor}
                strokeWidth={3}
                dot={{ fill: strokeColor, r: 3 }}
                activeDot={{ r: 5 }}
                name="Interest"
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
            <div>
              Start: <span className={`font-semibold ${firstInterest >= 75 ? 'text-green-400' : firstInterest < 25 ? 'text-red-400' : 'text-blue-400'}`}>
                {firstInterest}
              </span>
            </div>
            <div>
              Average: <span className={`font-semibold ${avgInterest >= 75 ? 'text-green-400' : avgInterest < 25 ? 'text-red-400' : 'text-blue-400'}`}>
                {avgInterest}
              </span>
            </div>
            <div>
              Latest: <span className={`font-semibold ${lastInterest >= 75 ? 'text-green-400' : lastInterest < 25 ? 'text-red-400' : 'text-blue-400'}`}>
                {lastInterest}
              </span>
            </div>
            <div>
              Change: <span className={`font-semibold ${lastInterest > firstInterest ? 'text-green-400' : lastInterest < firstInterest ? 'text-red-400' : 'text-gray-400'}`}>
                {lastInterest > firstInterest ? '+' : ''}{lastInterest - firstInterest}
              </span>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500 italic">
            * Google Trends shows relative search interest (0-100) where 100 is peak popularity for the time period
          </div>
        </div>
      )}
    </div>
  );
}
