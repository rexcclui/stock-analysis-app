"use client";
import { useState } from "react";
import { TrendingUp, TrendingDown, ChevronDown, ChevronUp, BarChart3 } from "lucide-react";

export function HistoricalPerformanceCheck({ stockCode }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedOption, setSelectedOption] = useState("top10");
  const [trendType, setTrendType] = useState("up");
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const analyzeTrends = async () => {
    if (!stockCode) {
      setError("No stock selected");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Track API call
      const apiCounts = { historicalTrends: 1 };

      // Fetch 5 years of historical data
      const response = await fetch(
        `/api/historical-trends?symbol=${stockCode}&years=5&type=${trendType}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch trend data");
      }

      const data = await response.json();
      setTrends(data.trends || []);

      // Log API call to tracking endpoint
      fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ counts: apiCounts })
      }).catch(err => console.error('Failed to send tracking data:', err));

    } catch (err) {
      setError(err.message);
      console.error("Error analyzing trends:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg mt-4 border border-gray-700">
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-750 transition-colors"
      >
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <BarChart3 className="text-blue-400" size={24} />
          Historical Performance Check
        </h2>
        <div className="text-gray-400">
          {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
        </div>
      </button>

      {/* Collapsible Content */}
      {isExpanded && (
        <div className="p-6 pt-0">
          {/* Option Selection */}
          <div className="mb-6">
        <label className="block text-gray-300 text-sm font-medium mb-2">
          Analysis Type
        </label>
        <select
          value={selectedOption}
          onChange={(e) => setSelectedOption(e.target.value)}
          className="w-full md:w-auto px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="top10">
            Show me the top 10 up or down trends
          </option>
        </select>
      </div>

      {/* Trend Direction Selection */}
      <div className="mb-6 flex gap-4">
        <button
          onClick={() => setTrendType("up")}
          className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all"
          style={{
            backgroundColor: trendType === "up" ? "#10b981" : "#374151",
            color: trendType === "up" ? "#ffffff" : "#d1d5db",
          }}
        >
          <TrendingUp size={20} />
          Upward Trends
        </button>
        <button
          onClick={() => setTrendType("down")}
          className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all"
          style={{
            backgroundColor: trendType === "down" ? "#10b981" : "#374151",
            color: trendType === "down" ? "#ffffff" : "#d1d5db",
          }}
        >
          <TrendingDown size={20} />
          Downward Trends
        </button>
      </div>

      {/* Analyze Button */}
      <button
        onClick={analyzeTrends}
        disabled={loading || !stockCode}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all mb-6"
      >
        {loading ? "Analyzing..." : "Analyze Trends"}
      </button>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/30 border border-red-500 text-red-300 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Results Table */}
      {trends.length > 0 && (() => {
        // Calculate min/max for conditional formatting
        const totalChanges = trends.map(t => t.totalChange);
        const days = trends.map(t => t.days);

        const maxChange = Math.max(...totalChanges);
        const minChange = Math.min(...totalChanges);
        const maxDays = Math.max(...days);
        const minDays = Math.min(...days);

        // Color interpolation function
        const getColorForValue = (value, min, max) => {
          if (max === min) return value >= 0 ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)";

          if (value >= 0) {
            // Positive: pale green to deep green
            const intensity = (value - Math.max(0, min)) / (max - Math.max(0, min));
            const r = Math.round(16 + (200 - 16) * (1 - intensity));
            const g = Math.round(185 + (255 - 185) * (1 - intensity));
            const b = Math.round(129 + (200 - 129) * (1 - intensity));
            const alpha = 0.2 + intensity * 0.6; // 0.2 to 0.8
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
          } else {
            // Negative: pale red to deep red
            const intensity = Math.abs(value) / Math.abs(min);
            const r = Math.round(239 + (180 - 239) * (1 - intensity));
            const g = Math.round(68 + (50 - 68) * (1 - intensity));
            const b = Math.round(68 + (50 - 68) * (1 - intensity));
            const alpha = 0.2 + intensity * 0.6; // 0.2 to 0.8
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
          }
        };

        const getColorForDays = (value, min, max) => {
          if (max === min) return "rgba(59, 130, 246, 0.3)";

          // Days: pale blue to deep blue
          const intensity = (value - min) / (max - min);
          const r = Math.round(59 + (30 - 59) * intensity);
          const g = Math.round(130 + (80 - 130) * intensity);
          const b = Math.round(246 + (200 - 246) * intensity);
          const alpha = 0.2 + intensity * 0.6;
          return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        };

        return (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-700">
                  <th className="px-4 py-3 text-gray-300 font-semibold border-b border-gray-600">
                    Rank
                  </th>
                  <th className="px-4 py-3 text-gray-300 font-semibold border-b border-gray-600">
                    Start Date
                  </th>
                  <th className="px-4 py-3 text-gray-300 font-semibold border-b border-gray-600">
                    End Date
                  </th>
                  <th className="px-4 py-3 text-gray-300 font-semibold border-b border-gray-600">
                    Days
                  </th>
                  <th className="px-4 py-3 text-gray-300 font-semibold border-b border-gray-600">
                    Total Change
                  </th>
                  <th className="px-4 py-3 text-gray-300 font-semibold border-b border-gray-600">
                    First Day Change
                  </th>
                  <th className="px-4 py-3 text-gray-300 font-semibold border-b border-gray-600">
                    Start Price
                  </th>
                  <th className="px-4 py-3 text-gray-300 font-semibold border-b border-gray-600">
                    End Price
                  </th>
                </tr>
              </thead>
              <tbody>
                {trends.map((trend, index) => (
                  <tr
                    key={index}
                    className="border-b border-gray-700 hover:bg-gray-700/30 transition-colors"
                  >
                    <td className="px-4 py-3 text-white font-medium">
                      #{index + 1}
                    </td>
                    <td className="px-4 py-3 text-gray-300">
                      {trend.startDate}
                    </td>
                    <td className="px-4 py-3 text-gray-300">{trend.endDate}</td>
                    <td
                      className="px-4 py-3 text-white font-medium"
                      style={{ backgroundColor: getColorForDays(trend.days, minDays, maxDays) }}
                    >
                      {trend.days}
                    </td>
                    <td
                      className="px-4 py-3 font-bold text-white"
                      style={{ backgroundColor: getColorForValue(trend.totalChange, minChange, maxChange) }}
                    >
                      {trend.totalChange >= 0 ? "+" : ""}
                      {trend.totalChange.toFixed(2)}%
                    </td>
                  <td
                    className={`px-4 py-3 font-medium ${
                      trend.firstDayChange >= 0
                        ? "text-green-400"
                        : "text-red-400"
                    }`}
                  >
                    {trend.firstDayChange >= 0 ? "+" : ""}
                    {trend.firstDayChange.toFixed(2)}%
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    ${trend.startPrice.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    ${trend.endPrice.toFixed(2)}
                  </td>
                </tr>
              ))}
              </tbody>
            </table>
          </div>
        );
      })()}

      {/* No Results */}
          {!loading && trends.length === 0 && !error && stockCode && (
            <div className="text-gray-400 text-center py-8">
              Click "Analyze Trends" to see historical performance data
            </div>
          )}

          {!stockCode && (
            <div className="text-gray-400 text-center py-8">
              Search for a stock to analyze historical trends
            </div>
          )}
        </div>
      )}
    </div>
  );
}
