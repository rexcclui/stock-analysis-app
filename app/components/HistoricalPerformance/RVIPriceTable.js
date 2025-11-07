"use client";

import { useState, useEffect, useMemo } from "react";

export default function RVIPriceTable({ historicalData }) {
  const [nDays, setNDays] = useState(10);
  const [hoveredCell, setHoveredCell] = useState(null);

  // Calculate Relative Volume Index (RVI)
  // RVI is similar to RSI but uses volume: measures volume strength on up vs down days
  const calculateRVI = (data, period = 14) => {
    if (!data || data.length < period + 1) return [];

    const rviValues = [];

    for (let i = period; i < data.length; i++) {
      let upVolume = 0;
      let downVolume = 0;

      // Look back over the period
      for (let j = 0; j < period; j++) {
        const idx = i - j;
        if (idx > 0) {
          const priceChange = data[idx].close - data[idx - 1].close;
          if (priceChange > 0) {
            upVolume += data[idx].volume || 0;
          } else if (priceChange < 0) {
            downVolume += data[idx].volume || 0;
          }
        }
      }

      // Calculate RVI (0-100 scale)
      const totalVolume = upVolume + downVolume;
      const rvi = totalVolume > 0 ? (upVolume / totalVolume) * 100 : 50;

      rviValues.push({
        date: data[i].date,
        rvi: rvi,
        close: data[i].close,
        volume: data[i].volume
      });
    }

    return rviValues;
  };

  // Process data into periods
  const processedData = useMemo(() => {
    if (!historicalData || historicalData.length === 0) return null;

    // Sort data by date (newest first)
    const sortedData = [...historicalData].sort((a, b) =>
      new Date(b.date) - new Date(a.date)
    );

    // Calculate RVI for all data points
    const rviData = calculateRVI(sortedData.reverse(), 14);
    rviData.reverse(); // Back to newest first

    // Create periods
    const periods = [];
    const numPeriods = Math.floor(rviData.length / nDays);

    for (let i = 0; i < numPeriods; i++) {
      const startIdx = i * nDays;
      const endIdx = Math.min(startIdx + nDays, rviData.length);

      if (endIdx - startIdx < nDays && i > 0) break; // Skip incomplete periods except the first

      const periodData = rviData.slice(startIdx, endIdx);

      if (periodData.length > 0) {
        const startPrice = periodData[periodData.length - 1].close;
        const endPrice = periodData[0].close;
        const priceChange = ((endPrice - startPrice) / startPrice) * 100;

        // Average RVI for the period
        const avgRVI = periodData.reduce((sum, d) => sum + d.rvi, 0) / periodData.length;

        periods.push({
          periodNum: i,
          startDate: periodData[periodData.length - 1].date,
          endDate: periodData[0].date,
          priceChange: priceChange,
          rvi: avgRVI,
          startPrice: startPrice,
          endPrice: endPrice
        });
      }
    }

    return periods;
  }, [historicalData, nDays]);

  // Define RVI ranges for rows
  const rviRanges = [
    { label: "80-100 (Very High)", min: 80, max: 100 },
    { label: "60-80 (High)", min: 60, max: 80 },
    { label: "40-60 (Neutral)", min: 40, max: 60 },
    { label: "20-40 (Low)", min: 20, max: 40 },
    { label: "0-20 (Very Low)", min: 0, max: 20 }
  ];

  // Group periods by RVI range
  const groupedData = useMemo(() => {
    if (!processedData) return {};

    const grouped = {};
    rviRanges.forEach(range => {
      grouped[range.label] = [];
    });

    processedData.forEach(period => {
      const range = rviRanges.find(r => period.rvi >= r.min && period.rvi < r.max)
                    || rviRanges[rviRanges.length - 1];
      grouped[range.label].push(period);
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

  const maxPeriods = Math.max(...Object.values(groupedData).map(arr => arr.length));

  return (
    <div className="space-y-4">
      {/* Control for N days */}
      <div className="flex items-center gap-4">
        <label className="text-gray-300 font-medium">Period Length (N days):</label>
        <input
          type="number"
          min="1"
          max="60"
          value={nDays}
          onChange={(e) => setNDays(Math.max(1, parseInt(e.target.value) || 1))}
          className="bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 w-24"
        />
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
                <th key={idx} className="border border-gray-600 px-4 py-3 text-center font-semibold min-w-[200px]">
                  <div className="text-xs text-gray-300 mb-1">Period {idx + 1}</div>
                  <div className="text-xs text-gray-400">
                    {idx === 0
                      ? `Today - ${nDays}d ago`
                      : `${idx * nDays}d - ${(idx + 1) * nDays}d ago`
                    }
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
                      className="border border-gray-600 px-4 py-3 text-center transition-colors cursor-pointer"
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
                        <div className="space-y-1">
                          <div className="font-bold text-base">
                            {period.priceChange.toFixed(2)}%
                          </div>
                          <div className="text-xs opacity-75">
                            RVI: {period.rvi.toFixed(1)}
                          </div>
                          <div className="text-xs opacity-60">
                            {new Date(period.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                            {' → '}
                            {new Date(period.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                          </div>
                          <div className="text-xs opacity-60">
                            ${period.startPrice.toFixed(2)} → ${period.endPrice.toFixed(2)}
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
          <li>• <strong>Columns:</strong> Each column represents an N-day period (Period 1 = most recent, Period 2 = N days before, etc.)</li>
          <li>• <strong>Rows:</strong> RVI ranges indicate volume strength (High RVI = strong buying volume, Low RVI = strong selling volume)</li>
          <li>• <strong>Cells:</strong> Show price % change during that period, colored from deep red (large decline) to deep green (large gain)</li>
          <li>• <strong>RVI (Relative Volume Index):</strong> Measures the ratio of up-volume to total volume over 14 days (0-100 scale)</li>
        </ul>
      </div>
    </div>
  );
}
