"use client";
import { useState } from "react";
import { TrendingUp, TrendingDown, ChevronDown, ChevronUp, BarChart3 } from "lucide-react";
import { TrendsTable } from "./TrendsTable";
import { BigMovesTable } from "./BigMovesTable";

export function HistoricalPerformanceCheck({ stockCode }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedOption, setSelectedOption] = useState("top10");
  const [trendType, setTrendType] = useState("up");
  const [trends, setTrends] = useState([]);
  const [bigMoves, setBigMoves] = useState([]);
  const [thresholdPercent, setThresholdPercent] = useState(5);
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

  const analyzeBigMoves = async () => {
    if (!stockCode) {
      setError("No stock selected");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Track API call
      const apiCounts = { historicalTrends: 1 };

      // Fetch big moves data
      const response = await fetch(
        `/api/historical-trends?symbol=${stockCode}&years=5&type=bigmoves&threshold=${thresholdPercent}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch big moves data");
      }

      const data = await response.json();
      setBigMoves(data.bigMoves || []);

      // Log API call to tracking endpoint
      fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ counts: apiCounts })
      }).catch(err => console.error('Failed to send tracking data:', err));

    } catch (err) {
      setError(err.message);
      console.error("Error analyzing big moves:", err);
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
          onChange={(e) => {
            setSelectedOption(e.target.value);
            setTrends([]);
            setBigMoves([]);
            setError(null);
          }}
          className="w-full md:w-auto px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="top10">
            Show me the top 10 up or down trends
          </option>
          <option value="bigmoves">
            Big Drop/Rise - Single day movements
          </option>
        </select>
      </div>

      {/* Trend Direction Selection - Only for top10 */}
      {selectedOption === "top10" && (
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
      )}

      {/* Threshold Input - Only for bigmoves */}
      {selectedOption === "bigmoves" && (
        <div className="mb-6 flex items-center gap-4">
          <label className="text-gray-300 text-sm font-medium">
            Minimum % Change Threshold:
          </label>
          <input
            type="number"
            min="1"
            max="50"
            step="0.5"
            value={thresholdPercent}
            onChange={(e) => setThresholdPercent(parseFloat(e.target.value))}
            className="w-24 px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-gray-400 text-sm">%</span>
          <button
            onClick={analyzeBigMoves}
            disabled={loading || !stockCode}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all"
          >
            {loading ? "Analyzing..." : "Analyze Big Moves"}
          </button>
        </div>
      )}

      {/* Analyze Button - Only for top10 */}
      {selectedOption === "top10" && (
        <button
          onClick={analyzeTrends}
          disabled={loading || !stockCode}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all mb-6"
        >
          {loading ? "Analyzing..." : "Analyze Trends"}
        </button>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/30 border border-red-500 text-red-300 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Trends Table */}
      <TrendsTable trends={trends} />

      {/* Big Moves Table */}
      <BigMovesTable bigMoves={bigMoves} />

      {/* No Results */}
      {!loading && trends.length === 0 && bigMoves.length === 0 && !error && stockCode && (
        <div className="text-gray-400 text-center py-8">
          Click &quot;Analyze {selectedOption === "top10" ? "Trends" : "Big Moves"}&quot; to see historical performance data
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
