"use client";
import React, { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, ChevronDown, ChevronUp, BarChart3 } from "lucide-react";
import { TrendsTable } from "./TrendsTable";
import { BigMovesTable } from "./BigMovesTable";
import { SpyCorrelationTable } from "./SpyCorrelationTable";

export function HistoricalPerformanceCheck({ stockCode }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedOption, setSelectedOption] = useState("top10");
  const [trendType, setTrendType] = useState("up");
  const [trends, setTrends] = useState([]);
  const [bigMoves, setBigMoves] = useState([]);
  const [spyCorrelations, setSpyCorrelations] = useState([]);
  const [cycleAnalysis, setCycleAnalysis] = useState(null);
  const [spyDirection, setSpyDirection] = useState("up");
  const [bigMovesDirection, setBigMovesDirection] = useState("up");
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
        `/api/historical-trends?symbol=${stockCode}&years=5&type=bigmoves&direction=${bigMovesDirection}`
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

  const analyzeSpyCorrelation = async () => {
    if (!stockCode) {
      setError("No stock selected");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Track API call
      const apiCounts = { historicalTrends: 1 };

      // Fetch SPY correlation data
      const response = await fetch(
        `/api/spy-correlation?symbol=${stockCode}&years=5&direction=${spyDirection}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch SPY correlation data");
      }

      const data = await response.json();
      setSpyCorrelations(data.correlations || []);

      // Log API call to tracking endpoint
      fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ counts: apiCounts })
      }).catch(err => console.error('Failed to send tracking data:', err));

    } catch (err) {
      setError(err.message);
      console.error("Error analyzing SPY correlation:", err);
    } finally {
      setLoading(false);
    }
  };

  const analyzeCycles = async (mode) => {
    if (!stockCode) {
      setError("No stock selected");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/cycle-analysis?symbol=${stockCode}&years=5&mode=${mode}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch cycle analysis data");
      }

      const data = await response.json();
      setCycleAnalysis(data);

      // Log API call
      const apiCounts = { cycleAnalysis: 1 };
      fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ counts: apiCounts })
      }).catch(err => console.error('Failed to send tracking data:', err));

    } catch (err) {
      setError(err.message);
      console.error("Error analyzing cycles:", err);
    } finally {
      setLoading(false);
    }
  };

  // Auto-trigger cycle analysis when a cycle mode is selected
  useEffect(() => {
    const cycleAnalysisModes = ["seasonal", "peak-trough", "ma-crossover", "fourier", "support-resistance"];
    if (cycleAnalysisModes.includes(selectedOption) && stockCode) {
      analyzeCycles(selectedOption);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOption, stockCode]);

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700" style={{ marginTop: '1rem' }}>
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
            setSpyCorrelations([]);
            setCycleAnalysis(null);
            setError(null);
          }}
          className="w-full md:w-auto px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="top10">
            Show me the top 20 up or down trends
          </option>
          <option value="bigmoves">
            Big Drop/Rise - Single day movements
          </option>
          <option value="spycorr">
            Show me top 20 up or down day change on SPY
          </option>
          <option value="seasonal">
            Seasonal/Calendar Patterns
          </option>
          <option value="peak-trough">
            Peak-to-Trough Cycles
          </option>
          <option value="ma-crossover">
            Moving Average Crossovers
          </option>
          <option value="fourier">
            Fourier/Spectral Analysis
          </option>
          <option value="support-resistance">
            Support/Resistance Levels
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

      {/* Big Moves Direction Selection - Only for bigmoves */}
      {selectedOption === "bigmoves" && (
        <div className="mb-6">
          <div className="flex gap-4 mb-4">
            <button
              onClick={() => setBigMovesDirection("up")}
              className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all"
              style={{
                backgroundColor: bigMovesDirection === "up" ? "#10b981" : "#374151",
                color: bigMovesDirection === "up" ? "#ffffff" : "#d1d5db",
              }}
            >
              <TrendingUp size={20} />
              Top 20 Upward Days
            </button>
            <button
              onClick={() => setBigMovesDirection("down")}
              className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all"
              style={{
                backgroundColor: bigMovesDirection === "down" ? "#10b981" : "#374151",
                color: bigMovesDirection === "down" ? "#ffffff" : "#d1d5db",
              }}
            >
              <TrendingDown size={20} />
              Top 20 Downward Days
            </button>
          </div>
          <button
            onClick={analyzeBigMoves}
            disabled={loading || !stockCode}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all"
          >
            {loading ? "Analyzing..." : "Analyze Big Moves"}
          </button>
        </div>
      )}

      {/* SPY Direction Selection - Only for spycorr */}
      {selectedOption === "spycorr" && (
        <div className="mb-6">
          <div className="flex gap-4 mb-4">
            <button
              onClick={() => setSpyDirection("up")}
              className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all"
              style={{
                backgroundColor: spyDirection === "up" ? "#10b981" : "#374151",
                color: spyDirection === "up" ? "#ffffff" : "#d1d5db",
              }}
            >
              <TrendingUp size={20} />
              SPY Upward Days
            </button>
            <button
              onClick={() => setSpyDirection("down")}
              className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all"
              style={{
                backgroundColor: spyDirection === "down" ? "#10b981" : "#374151",
                color: spyDirection === "down" ? "#ffffff" : "#d1d5db",
              }}
            >
              <TrendingDown size={20} />
              SPY Downward Days
            </button>
          </div>
          <button
            onClick={analyzeSpyCorrelation}
            disabled={loading || !stockCode}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all"
          >
            {loading ? "Analyzing..." : "Analyze SPY Correlation"}
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

      {/* Loading indicator for cycle analysis modes */}
      {["seasonal", "peak-trough", "ma-crossover", "fourier", "support-resistance"].includes(selectedOption) && loading && (
        <div className="flex items-center gap-2 text-blue-400 mb-6">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
          <span>Analyzing {selectedOption.replace('-', ' ')}...</span>
        </div>
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

      {/* SPY Correlation Table */}
      <SpyCorrelationTable correlations={spyCorrelations} />

      {/* Cycle Analysis Results */}
      {cycleAnalysis && selectedOption === "seasonal" && (
        <div className="space-y-6">
          <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4 mb-6">
            <p className="italic" style={{ fontSize: '11px', color: '#fef08a' }}>
              <strong style={{ fontStyle: 'normal', color: '#fefce8' }}>Seasonal/Calendar Patterns Analysis:</strong> This analysis examines historical performance patterns across different time periods.
              <strong style={{ fontStyle: 'normal', color: '#fde047' }}> Avg Return</strong> shows the average daily price change for that period.
              <strong style={{ fontStyle: 'normal', color: '#fde047' }}> Win Rate</strong> shows the percentage of days with positive returns.
              Higher win rates indicate more consistent positive performance during those periods.
            </p>
          </div>

          <div className="bg-gray-900/50 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-bold text-white mb-4">Monthly Performance</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left text-gray-400 py-2 px-3">Month</th>
                    <th className="text-center text-gray-400 py-2 px-3" colSpan="2">{stockCode}</th>
                    {cycleAnalysis.benchmarks?.map((benchmark, idx) => (
                      <th key={idx} className="text-center text-gray-400 py-2 px-3" colSpan="2">{benchmark}</th>
                    ))}
                  </tr>
                  <tr className="border-b border-gray-700">
                    <th className="text-left text-gray-400 py-2 px-3"></th>
                    <th className="text-right text-gray-400 py-2 px-2 text-xs">Avg Return</th>
                    <th className="text-right text-gray-400 py-2 px-2 text-xs">Win Rate</th>
                    {cycleAnalysis.benchmarks?.map((benchmark, idx) => (
                      <React.Fragment key={idx}>
                        <th className="text-right text-gray-400 py-2 px-2 text-xs">Avg Return</th>
                        <th className="text-right text-gray-400 py-2 px-2 text-xs">Win Rate</th>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cycleAnalysis.monthly?.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-800">
                      <td className="text-white py-2 px-3 font-medium">{item.month}</td>
                      <td className={`text-right py-2 px-2 text-sm ${parseFloat(item.avgReturn) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {item.avgReturn}%
                      </td>
                      <td className="text-right text-gray-300 py-2 px-2 text-sm">{item.winRate}%</td>
                      {cycleAnalysis.benchmarks?.map((benchmark, bIdx) => (
                        <React.Fragment key={bIdx}>
                          <td className={`text-right py-2 px-2 text-sm ${parseFloat(item[`${benchmark}_avgReturn`]) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {item[`${benchmark}_avgReturn`]}%
                          </td>
                          <td className="text-right text-gray-300 py-2 px-2 text-sm">{item[`${benchmark}_winRate`]}%</td>
                        </React.Fragment>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-gray-900/50 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-bold text-white mb-4">Quarterly Performance</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left text-gray-400 py-2 px-3">Quarter</th>
                    <th className="text-center text-gray-400 py-2 px-3" colSpan="2">{stockCode}</th>
                    {cycleAnalysis.benchmarks?.map((benchmark, idx) => (
                      <th key={idx} className="text-center text-gray-400 py-2 px-3" colSpan="2">{benchmark}</th>
                    ))}
                  </tr>
                  <tr className="border-b border-gray-700">
                    <th className="text-left text-gray-400 py-2 px-3"></th>
                    <th className="text-right text-gray-400 py-2 px-2 text-xs">Avg Return</th>
                    <th className="text-right text-gray-400 py-2 px-2 text-xs">Win Rate</th>
                    {cycleAnalysis.benchmarks?.map((benchmark, idx) => (
                      <React.Fragment key={idx}>
                        <th className="text-right text-gray-400 py-2 px-2 text-xs">Avg Return</th>
                        <th className="text-right text-gray-400 py-2 px-2 text-xs">Win Rate</th>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cycleAnalysis.quarterly?.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-800">
                      <td className="text-white py-2 px-3 font-medium">{item.quarter}</td>
                      <td className={`text-right py-2 px-2 text-sm ${parseFloat(item.avgReturn) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {item.avgReturn}%
                      </td>
                      <td className="text-right text-gray-300 py-2 px-2 text-sm">{item.winRate}%</td>
                      {cycleAnalysis.benchmarks?.map((benchmark, bIdx) => (
                        <React.Fragment key={bIdx}>
                          <td className={`text-right py-2 px-2 text-sm ${parseFloat(item[`${benchmark}_avgReturn`]) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {item[`${benchmark}_avgReturn`]}%
                          </td>
                          <td className="text-right text-gray-300 py-2 px-2 text-sm">{item[`${benchmark}_winRate`]}%</td>
                        </React.Fragment>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-gray-900/50 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-bold text-white mb-4">Day of Week Performance</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left text-gray-400 py-2 px-3">Day</th>
                    <th className="text-center text-gray-400 py-2 px-3" colSpan="2">{stockCode}</th>
                    {cycleAnalysis.benchmarks?.map((benchmark, idx) => (
                      <th key={idx} className="text-center text-gray-400 py-2 px-3" colSpan="2">{benchmark}</th>
                    ))}
                  </tr>
                  <tr className="border-b border-gray-700">
                    <th className="text-left text-gray-400 py-2 px-3"></th>
                    <th className="text-right text-gray-400 py-2 px-2 text-xs">Avg Return</th>
                    <th className="text-right text-gray-400 py-2 px-2 text-xs">Win Rate</th>
                    {cycleAnalysis.benchmarks?.map((benchmark, idx) => (
                      <React.Fragment key={idx}>
                        <th className="text-right text-gray-400 py-2 px-2 text-xs">Avg Return</th>
                        <th className="text-right text-gray-400 py-2 px-2 text-xs">Win Rate</th>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cycleAnalysis.dayOfWeek?.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-800">
                      <td className="text-white py-2 px-3 font-medium">{item.day}</td>
                      <td className={`text-right py-2 px-2 text-sm ${parseFloat(item.avgReturn) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {item.avgReturn}%
                      </td>
                      <td className="text-right text-gray-300 py-2 px-2 text-sm">{item.winRate}%</td>
                      {cycleAnalysis.benchmarks?.map((benchmark, bIdx) => (
                        <React.Fragment key={bIdx}>
                          <td className={`text-right py-2 px-2 text-sm ${parseFloat(item[`${benchmark}_avgReturn`]) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {item[`${benchmark}_avgReturn`]}%
                          </td>
                          <td className="text-right text-gray-300 py-2 px-2 text-sm">{item[`${benchmark}_winRate`]}%</td>
                        </React.Fragment>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {cycleAnalysis && selectedOption === "peak-trough" && (
        <div className="space-y-6">
          <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4 mb-6">
            <p className="italic" style={{ fontSize: '11px', color: '#fef08a' }}>
              <strong style={{ fontStyle: 'normal', color: '#fefce8' }}>Peak-to-Trough Cycle Analysis:</strong> This analysis identifies local peaks (highs) and troughs (lows) in the price history.
              A peak occurs when the price is higher than surrounding days, and a trough occurs when it's lower.
              <strong style={{ fontStyle: 'normal', color: '#fde047' }}> Avg Cycle Length</strong> shows the average number of days between consecutive peaks, helping identify recurring price patterns.
              The cycles table shows the duration and price change between each pair of peaks.
            </p>
          </div>

          <div className="bg-gray-900/50 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-bold text-white mb-4">
              Cycle Statistics
            </h3>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="text-gray-400 text-sm">Total Peaks</div>
                <div className="text-2xl font-bold text-white">{cycleAnalysis.totalPeaks}</div>
              </div>
              <div className="text-center">
                <div className="text-gray-400 text-sm">Total Troughs</div>
                <div className="text-2xl font-bold text-white">{cycleAnalysis.totalTroughs}</div>
              </div>
              <div className="text-center">
                <div className="text-gray-400 text-sm">Avg Cycle Length</div>
                <div className="text-2xl font-bold text-white">{cycleAnalysis.avgCycleLength} days</div>
              </div>
            </div>
          </div>

          <div className="bg-gray-900/50 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-bold text-white mb-4">Recent Peak-to-Peak Cycles</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left text-gray-400 py-2 px-4">From</th>
                    <th className="text-left text-gray-400 py-2 px-4">To</th>
                    <th className="text-right text-gray-400 py-2 px-4">Days</th>
                    <th className="text-right text-gray-400 py-2 px-4">Price Change</th>
                  </tr>
                </thead>
                <tbody>
                  {cycleAnalysis.cycles?.map((cycle, idx) => (
                    <tr key={idx} className="border-b border-gray-800">
                      <td className="text-gray-300 py-2 px-4">{cycle.from}</td>
                      <td className="text-gray-300 py-2 px-4">{cycle.to}</td>
                      <td className="text-right text-white py-2 px-4">{cycle.days}</td>
                      <td className={`text-right py-2 px-4 ${parseFloat(cycle.priceChange) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {cycle.priceChange}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {cycleAnalysis && selectedOption === "ma-crossover" && (
        <div className="space-y-6">
          <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4 mb-6">
            <p className="italic" style={{ fontSize: '11px', color: '#fef08a' }}>
              <strong style={{ fontStyle: 'normal', color: '#fefce8' }}>Moving Average Crossover Analysis:</strong> This tracks the relationship between 50-day and 200-day moving averages.
              A <strong style={{ fontStyle: 'normal', color: '#22c55e' }}>Golden Cross</strong> (bullish signal) occurs when the 50-day MA crosses above the 200-day MA.
              A <strong style={{ fontStyle: 'normal', color: '#ef4444' }}>Death Cross</strong> (bearish signal) occurs when the 50-day MA crosses below the 200-day MA.
              These crossovers are widely used technical indicators for identifying potential trend changes in the market.
            </p>
          </div>

          <div className="bg-gray-900/50 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-bold text-white mb-4">Current Moving Average Status</h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-gray-400 text-sm">Current Price</div>
                <div className="text-xl font-bold text-white">${cycleAnalysis.currentPrice}</div>
              </div>
              <div className="text-center">
                <div className="text-gray-400 text-sm">50-Day MA</div>
                <div className="text-xl font-bold text-blue-400">${cycleAnalysis.currentMA50}</div>
              </div>
              <div className="text-center">
                <div className="text-gray-400 text-sm">200-Day MA</div>
                <div className="text-xl font-bold text-purple-400">${cycleAnalysis.currentMA200}</div>
              </div>
              <div className="text-center">
                <div className="text-gray-400 text-sm">Signal</div>
                <div className={`text-xl font-bold ${cycleAnalysis.currentSignal === 'Bullish' ? 'text-green-400' : 'text-red-400'}`}>
                  {cycleAnalysis.currentSignal}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-900/50 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-bold text-white mb-4">
              Recent Crossovers (Total: {cycleAnalysis.totalCrossovers})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left text-gray-400 py-2 px-4">Date</th>
                    <th className="text-left text-gray-400 py-2 px-4">Type</th>
                    <th className="text-right text-gray-400 py-2 px-4">Price</th>
                    <th className="text-center text-gray-400 py-2 px-4">Signal</th>
                  </tr>
                </thead>
                <tbody>
                  {cycleAnalysis.crossovers?.map((cross, idx) => (
                    <tr key={idx} className="border-b border-gray-800">
                      <td className="text-gray-300 py-2 px-4">{cross.date}</td>
                      <td className="text-white py-2 px-4">{cross.type}</td>
                      <td className="text-right text-gray-300 py-2 px-4">${cross.price}</td>
                      <td className="text-center py-2 px-4">
                        <span className={`px-2 py-1 rounded text-sm ${cross.signal === 'Bullish' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                          {cross.signal}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {cycleAnalysis && selectedOption === "fourier" && (
        <div className="space-y-6">
          <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4 mb-6">
            <p className="italic" style={{ fontSize: '11px', color: '#fef08a' }}>
              <strong style={{ fontStyle: 'normal', color: '#fefce8' }}>Fourier/Spectral Analysis:</strong> This uses autocorrelation to identify recurring price patterns and cycles.
              The analysis finds periods (measured in days) where historical price movements tend to repeat.
              <strong style={{ fontStyle: 'normal', color: '#fde047' }}> Strength</strong> indicates how reliably each cycle appears in the data.
              Higher strength values suggest more consistent cyclical patterns that may help predict future price movements.
            </p>
          </div>

          <div className="bg-gray-900/50 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-bold text-white mb-4">Dominant Cycles Detected</h3>
            <p className="text-gray-300 mb-4">{cycleAnalysis.interpretation}</p>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left text-gray-400 py-2 px-4">Period (Days)</th>
                    <th className="text-right text-gray-400 py-2 px-4">Strength</th>
                  </tr>
                </thead>
                <tbody>
                  {cycleAnalysis.dominantCycles?.map((cycle, idx) => (
                    <tr key={idx} className="border-b border-gray-800">
                      <td className="text-white py-2 px-4">{cycle.period}</td>
                      <td className="text-right text-gray-300 py-2 px-4">{cycle.strength}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {cycleAnalysis && selectedOption === "support-resistance" && (
        <div className="space-y-6">
          <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4 mb-6">
            <p className="italic" style={{ fontSize: '11px', color: '#fef08a' }}>
              <strong style={{ fontStyle: 'normal', color: '#fefce8' }}>Support & Resistance Levels:</strong> This identifies key price levels where the stock has repeatedly traded.
              <strong style={{ fontStyle: 'normal', color: '#22c55e' }}> Support</strong> levels are prices below the current price where buying pressure has historically prevented further decline.
              <strong style={{ fontStyle: 'normal', color: '#ef4444' }}> Resistance</strong> levels are prices above the current price where selling pressure has historically prevented further gains.
              <strong style={{ fontStyle: 'normal', color: '#fde047' }}> Touches</strong> shows how many times the price has tested that level, with more touches indicating stronger levels.
              <strong style={{ fontStyle: 'normal', color: '#fde047' }}> Distance</strong> shows how far each level is from the current price.
            </p>
          </div>

          <div className="bg-gray-900/50 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-bold text-white mb-4">Current Price & Key Levels</h3>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="text-gray-400 text-sm">Current Price</div>
                <div className="text-2xl font-bold text-white">${cycleAnalysis.currentPrice}</div>
              </div>
              <div className="text-center">
                <div className="text-gray-400 text-sm">Nearest Support</div>
                <div className="text-2xl font-bold text-green-400">${cycleAnalysis.nearestSupport}</div>
              </div>
              <div className="text-center">
                <div className="text-gray-400 text-sm">Nearest Resistance</div>
                <div className="text-2xl font-bold text-red-400">${cycleAnalysis.nearestResistance}</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-gray-900/50 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-bold text-green-400 mb-4">Support Levels</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left text-gray-400 py-2 px-4">Price</th>
                      <th className="text-right text-gray-400 py-2 px-4">Touches</th>
                      <th className="text-right text-gray-400 py-2 px-4">Distance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cycleAnalysis.support?.map((level, idx) => (
                      <tr key={idx} className="border-b border-gray-800">
                        <td className="text-white py-2 px-4">${level.price}</td>
                        <td className="text-right text-gray-300 py-2 px-4">{level.touches}</td>
                        <td className="text-right text-gray-400 py-2 px-4">{level.distance}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-gray-900/50 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-bold text-red-400 mb-4">Resistance Levels</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left text-gray-400 py-2 px-4">Price</th>
                      <th className="text-right text-gray-400 py-2 px-4">Touches</th>
                      <th className="text-right text-gray-400 py-2 px-4">Distance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cycleAnalysis.resistance?.map((level, idx) => (
                      <tr key={idx} className="border-b border-gray-800">
                        <td className="text-white py-2 px-4">${level.price}</td>
                        <td className="text-right text-gray-300 py-2 px-4">{level.touches}</td>
                        <td className="text-right text-gray-400 py-2 px-4">{level.distance}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* No Results */}
      {!loading && trends.length === 0 && bigMoves.length === 0 && spyCorrelations.length === 0 && !cycleAnalysis && !error && stockCode && (
        <div className="text-gray-400 text-center py-8">
          Click &quot;Analyze {
            selectedOption === "top10" ? "Trends" :
            selectedOption === "bigmoves" ? "Big Moves" :
            selectedOption === "spycorr" ? "SPY Correlation" :
            "Cycles"
          }&quot; to see historical performance data
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
