'use client';
import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const SentimentChart = ({ data }) => {
  if (!data || data.length === 0) {
    return <div className="text-xs text-gray-500">No data</div>;
  }

  // Determine line color based on the trend
  const firstScore = data[0].score;
  const lastScore = data[data.length - 1].score;
  let strokeColor = '#8884d8'; // Neutral
  if (lastScore > firstScore) {
    strokeColor = '#22c55e'; // Green for positive trend
  } else if (lastScore < firstScore) {
    strokeColor = '#ef4444'; // Red for negative trend
  }

  return (
    <div style={{ width: '100%', height: 40 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 5, right: 5, left: -30, bottom: 5 }}>
          <YAxis domain={[0, 1]} hide />
          <XAxis dataKey="date" hide />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'rgba(30, 41, 59, 0.9)', 
              borderColor: '#4b5563',
              fontSize: '12px',
              borderRadius: '0.5rem'
            }}
            labelStyle={{ color: '#cbd5e1' }}
            itemStyle={{ color: strokeColor }}
          />
          <Line 
            type="monotone" 
            dataKey="score" 
            stroke={strokeColor} 
            strokeWidth={2} 
            dot={false} 
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SentimentChart;
