"use client";

import React, { useState, useEffect } from "react";
import { LineChart, Line, ResponsiveContainer } from "recharts";

export default function RelativeVolumeMatrix({ symbol }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (symbol) {
      fetchRelativeVolumeData();
    }
  }, [symbol]);

  const fetchRelativeVolumeData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/relative-volume-matrix?symbol=${symbol}&years=2`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch relative volume data");
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Calculate color intensity based on relative volume
  const getColorIntensity = (avgRelativeVolume, minValue, maxValue) => {
    if (maxValue === minValue) return 0.5;

    const normalized = (avgRelativeVolume - minValue) / (maxValue - minValue);
    return normalized;
  };

  // Generate blue color based on intensity
  const getBlueColor = (intensity) => {
    // Light blue to dark blue gradient
    const lightness = 85 - intensity * 50; // From 85% to 35%
    return `hsl(210, 100%, ${lightness}%)`;
  };

  if (loading) {
    return (
      <div className="p-4 text-gray-500">
        Loading relative volume matrix...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500">
        Error: {error}
      </div>
    );
  }

  if (!data || !data.periods || data.periods.length === 0) {
    return (
      <div className="p-4 text-gray-500">
        No relative volume data available.
      </div>
    );
  }

  // Calculate min and max for color scaling
  const allAvgVolumes = data.periods.map(p => p.avgRelativeVolume);
  const minVolume = Math.min(...allAvgVolumes);
  const maxVolume = Math.max(...allAvgVolumes);

  // Group periods into rows (e.g., 8 cells per row)
  const cellsPerRow = 8;
  const rows = [];
  for (let i = 0; i < data.periods.length; i += cellsPerRow) {
    rows.push(data.periods.slice(i, i + cellsPerRow));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Relative Volume Matrix</h3>
        <div className="text-sm text-gray-500">
          Each cell represents a 7-day period
        </div>
      </div>

      <div className="space-y-2">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="flex gap-2">
            {row.map((period, cellIndex) => {
              const intensity = getColorIntensity(
                period.avgRelativeVolume,
                minVolume,
                maxVolume
              );
              const bgColor = getBlueColor(intensity);

              // Prepare chart data
              const chartData = period.relativeVolumes.map((rv, idx) => ({
                index: idx,
                value: rv,
              }));

              return (
                <div
                  key={cellIndex}
                  className="relative flex-1 min-w-0 rounded border border-gray-200 overflow-hidden"
                  style={{
                    backgroundColor: bgColor,
                    minHeight: "120px",
                  }}
                >
                  {/* Mini Chart */}
                  <div className="h-16 -mx-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#1e40af"
                          strokeWidth={2}
                          dot={false}
                          isAnimationActive={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Period Info */}
                  <div className="px-2 pb-2 space-y-1">
                    <div className="text-xs font-medium text-gray-700">
                      {new Date(period.endDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>

                    {/* Percentage Change */}
                    <div
                      className={`text-sm font-bold ${
                        period.percentageChange >= 0
                          ? "text-green-700"
                          : "text-red-700"
                      }`}
                    >
                      {period.percentageChange >= 0 ? "+" : ""}
                      {period.percentageChange.toFixed(2)}%
                    </div>

                    {/* Relative Volume */}
                    <div className="text-xs text-gray-600">
                      RV: {period.avgRelativeVolume.toFixed(2)}x
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <div className="text-sm font-medium mb-2">Legend:</div>
        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <span className="font-medium">RV:</span> Relative Volume (volume / 20-day avg)
          </div>
          <div>
            <span className="font-medium">Color:</span> Lighter blue = lower volume, Darker blue = higher volume
          </div>
          <div>
            <span className="font-medium">Percentage:</span> Price change over the 7-day period
          </div>
          <div>
            <span className="font-medium">Chart:</span> Relative volume trend over 7 days
          </div>
        </div>
      </div>
    </div>
  );
}
