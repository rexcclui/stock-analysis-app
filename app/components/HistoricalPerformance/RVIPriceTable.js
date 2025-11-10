"use client";

import { useState, useEffect, useMemo } from "react";

export default function RVIPriceTable({ historicalData }) {
  const [nDays, setNDays] = useState(10);
  const [hoveredCell, setHoveredCell] = useState(null);

  // Process data into periods
  const processedData = useMemo(() => {
    if (!historicalData || historicalData.length === 0) return null;

    // Sort data by date (newest first)
    const sortedData = [...historicalData].sort((a, b) =>
      new Date(b.date) - new Date(a.date)
    );

    // Create periods - always show 20 periods
    const periods = [];
    const maxPeriodCount = 20;

    for (let i = 0; i < maxPeriodCount; i++) {
      const startIdx = i * nDays;
      const endIdx = Math.min(startIdx + nDays, sortedData.length);

      // Only create period if we have enough data
      if (startIdx < sortedData.length && endIdx > startIdx) {
        const periodData = sortedData.slice(startIdx, endIdx);

        if (periodData.length > 0) {
          const startPrice = periodData[periodData.length - 1].close;
          const endPrice = periodData[0].close;
          const priceChange = ((endPrice - startPrice) / startPrice) * 100;

          // Calculate average volume for current period
          const currentAvgVolume = periodData.reduce((sum, d) => sum + (d.volume || 0), 0) / periodData.length;

          // Calculate average volume for previous 5 periods (5N days before current)
          let rvi = 0;
          const prevStartIdx = (i + 1) * nDays;
          const prevEndIdx = Math.min(prevStartIdx + (5 * nDays), sortedData.length);

          if (prevStartIdx < sortedData.length && prevEndIdx > prevStartIdx) {
            const prevPeriodData = sortedData.slice(prevStartIdx, prevEndIdx);
            if (prevPeriodData.length > 0) {
              const prevAvgVolume = prevPeriodData.reduce((sum, d) => sum + (d.volume || 0), 0) / prevPeriodData.length;

              // RVI = (Average Volume in current slot) / (Average volume in last 5 slots)
              rvi = prevAvgVolume > 0 ? (currentAvgVolume / prevAvgVolume) : 1;
            } else {
              rvi = 1; // No previous data, neutral RVI
            }
          } else {
            rvi = 1; // Not enough previous data, neutral RVI
          }

          periods.push({
            periodNum: i,
            startDate: periodData[periodData.length - 1].date,
            endDate: periodData[0].date,
            priceChange: priceChange,
            rvi: rvi, // Now a ratio, typically 0.5 to 2.0
            startPrice: startPrice,
            endPrice: endPrice,
            avgVolume: currentAvgVolume
          });
        }
      }
    }

    return periods;
  }, [historicalData, nDays]);

  // Define RVI ranges for rows (RVI is now a ratio: current avg volume / previous 5 periods avg volume)
  const rviRanges = [
    { label: "> 3.0", min: 3.0, max: Infinity },
    { label: "2.5 - 3.0", min: 2.5, max: 3.0 },
    { label: "2.0 - 2.5", min: 2.0, max: 2.5 },
    { label: "1.5 - 2.0", min: 1.5, max: 2.0 },
    { label: "1.2 - 1.5", min: 1.2, max: 1.5 },
    { label: "0.8 - 1.2", min: 0.8, max: 1.2 },
    { label: "0.6 - 0.8", min: 0.6, max: 0.8 },
    { label: "0.4 - 0.6", min: 0.4, max: 0.6 },
    { label: "0.2 - 0.4", min: 0.2, max: 0.4 },
    { label: "< 0.2", min: 0, max: 0.2 }
  ];

  // Group periods by RVI range
  const groupedData = useMemo(() => {
    if (!processedData) return {};

    const grouped = {};
    rviRanges.forEach(range => {
      grouped[range.label] = {}; // Use object instead of array to preserve period numbers
    });

    processedData.forEach(period => {
      const range = rviRanges.find(r => period.rvi >= r.min && period.rvi < r.max)
                    || rviRanges[rviRanges.length - 1];
      grouped[range.label][period.periodNum] = period; // Use periodNum as key
    });

    return grouped;
  }, [processedData]);

  // Get color for price change value
  const getColorForValue = (value) => {
    // Calculate global min/max for consistent coloring
    const allChanges = processedData ? processedData.map(p => p.priceChange) : [];
    const min = Math.min(...allChanges, 0);
    const max = Math.max(...allChanges, 0);

    if (max === min) {
      return value >= 0 ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)";
    }

    if (value >= 0) {
      // Positive: light green to deep green
      const intensity = max > 0 ? value / max : 0;
      const r = Math.round(16 + (200 - 16) * (1 - intensity));
      const g = Math.round(185 + (255 - 185) * (1 - intensity));
      const b = Math.round(129 + (200 - 129) * (1 - intensity));
      const alpha = 0.2 + intensity * 0.6;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    } else {
      // Negative: light red to deep red
      const intensity = min < 0 ? Math.abs(value / min) : 0;
      const r = Math.round(239 + (180 - 239) * (1 - intensity));
      const g = Math.round(68 + (50 - 68) * (1 - intensity));
      const b = Math.round(68 + (50 - 68) * (1 - intensity));
      const alpha = 0.2 + intensity * 0.6;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
  };

  if (!processedData || processedData.length === 0) {
    return <div className="text-gray-400">No data available for analysis.</div>;
  }

  const maxPeriods = 20; // Always show 20 columns

  return (
    <div className="space-y-4">
      {/* Control for N days */}
      <div className="flex items-center gap-4">
        <label className="text-gray-300 font-medium">Period Length (N days):</label>
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <button
            onClick={() => setNDays(Math.max(3, nDays - 1))}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={nDays <= 3}
            title="Decrease by 1 day"
          >
            −
          </button>
          <span className="text-gray-400 text-sm">3</span>
          <input
            type="range"
            min="3"
            max="60"
            step="1"
            value={nDays}
            onChange={(e) => setNDays(parseInt(e.target.value))}
            className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            style={{
              background: `linear-gradient(to right, #10b981 0%, #10b981 ${((nDays - 3) / (60 - 3)) * 100}%, #374151 ${((nDays - 3) / (60 - 3)) * 100}%, #374151 100%)`
            }}
          />
          <span className="text-gray-400 text-sm">60</span>
          <button
            onClick={() => setNDays(Math.min(60, nDays + 1))}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={nDays >= 60}
            title="Increase by 1 day"
          >
            +
          </button>
          <span className="text-green-400 font-bold text-lg min-w-[3rem] text-center">
            {nDays}d
          </span>
        </div>
        <span className="text-gray-400 text-sm">
          ({processedData.length} periods available)
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse bg-gray-800 text-white text-sm">
          <thead>
            <tr className="bg-gray-700">
              <th className="border border-gray-600 px-4 py-3 text-left font-semibold sticky left-0 bg-gray-700 z-10">
                RVI Range
              </th>
              {[...Array(maxPeriods)].map((_, idx) => (
                <th key={idx} className="border border-gray-600 px-1 py-2 text-center font-semibold min-w-[45px]">
                  <div className="text-sm font-bold text-gray-200">
                    -{(idx + 1) * nDays}d
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rviRanges.map((range, rangeIdx) => (
              <tr key={rangeIdx} className="border-b border-gray-700">
                <td className="border border-gray-600 px-4 py-3 font-medium sticky left-0 bg-gray-800 z-10">
                  {range.label}
                </td>
                {[...Array(maxPeriods)].map((_, periodIdx) => {
                  const period = groupedData[range.label]?.[periodIdx];
                  const cellKey = `${rangeIdx}-${periodIdx}`;
                  const isHovered = hoveredCell === cellKey;

                  return (
                    <td
                      key={periodIdx}
                      className="border border-gray-600 px-1 py-2 text-center transition-colors cursor-pointer"
                      style={{
                        backgroundColor: isHovered
                          ? '#fde047'
                          : period
                            ? getColorForValue(period.priceChange)
                            : 'transparent',
                        color: isHovered ? '#2563eb' : 'white'
                      }}
                      onMouseEnter={() => setHoveredCell(cellKey)}
                      onMouseLeave={() => setHoveredCell(null)}
                    >
                      {period ? (
                        <div className="space-y-0.5">
                          <div className="font-bold text-xs">
                            {period.priceChange.toFixed(1)}%
                          </div>
                          <div className="text-[10px] opacity-75">
                            {period.rvi.toFixed(2)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-4 p-4 bg-gray-800 rounded border border-gray-700">
        <h3 className="text-white font-semibold mb-2">Understanding the Table:</h3>
        <ul className="text-gray-300 text-sm space-y-1">
          <li>• <strong>Columns:</strong> Time offset showing N-day periods (e.g., -10d = 10 days ago, -20d = 20 days ago)</li>
          <li>• <strong>Rows:</strong> RVI ranges indicate relative volume strength (High RVI = increased volume vs recent periods, Low RVI = decreased volume)</li>
          <li>• <strong>Cells:</strong> Show price % change during that period, colored from deep red (large decline) to deep green (large gain)</li>
          <li>• <strong>RVI (Relative Volume Index):</strong> Ratio of average volume in current period divided by average volume in previous 5 periods (RVI = 1.0 means neutral, &gt;1.0 means higher volume, &lt;1.0 means lower volume)</li>
        </ul>
      </div>
    </div>
  );
}
