"use client";
import React, { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, ChevronDown, ChevronUp, BarChart3, X } from "lucide-react";
import { TrendsTable } from "./HistoricalPerformance/TrendsTable";
import { BigMovesTable } from "./HistoricalPerformance/BigMovesTable";
import { SpyCorrelationTable } from "./HistoricalPerformance/SpyCorrelationTable";
import { GapOpenTable } from "./HistoricalPerformance/GapOpenTable";
import { StatisticsTable } from "./HistoricalPerformance/StatisticsTable";
import { SeasonalAnalysis } from "./HistoricalPerformance/CycleAnalysis/SeasonalAnalysis";
import { PeakTroughAnalysis } from "./HistoricalPerformance/CycleAnalysis/PeakTroughAnalysis";
import { MovingAverageCrossoverAnalysis } from "./HistoricalPerformance/CycleAnalysis/MovingAverageCrossoverAnalysis";
import { FourierAnalysis } from "./HistoricalPerformance/CycleAnalysis/FourierAnalysis";
import { SupportResistanceAnalysis } from "./HistoricalPerformance/CycleAnalysis/SupportResistanceAnalysis";
import { StockCorrelationSection } from "./HistoricalPerformance/StockCorrelation/StockCorrelationSection";
import RVIPriceTable from "./HistoricalPerformance/RVIPriceTable";

export function HistoricalPerformanceCheck({ stockCode }) {
  // Default expanded so the Historical Data Analysis section is open on initial render
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedOptions, setSelectedOptions] = useState(new Set(["top10"]));

  // Color mapping for each analysis type
  const modeColors = {
    "top10": { text: "text-orange-400", border: "border-l-orange-500", bg: "bg-orange-500/10" },
    "bigmoves": { text: "text-red-400", border: "border-l-red-500", bg: "bg-red-500/10" },
    "spycorr": { text: "text-purple-400", border: "border-l-purple-500", bg: "bg-purple-500/10" },
    "gapopen": { text: "text-cyan-400", border: "border-l-cyan-500", bg: "bg-cyan-500/10" },
    "gapopenstat": { text: "text-teal-400", border: "border-l-teal-500", bg: "bg-teal-500/10" },
    "intradaystat": { text: "text-lime-400", border: "border-l-lime-500", bg: "bg-lime-500/10" },
    "rvi-price": { text: "text-pink-400", border: "border-l-pink-500", bg: "bg-pink-500/10" },
    "stock-correlation": { text: "text-indigo-400", border: "border-l-indigo-500", bg: "bg-indigo-500/10" },
    "seasonal": { text: "text-yellow-400", border: "border-l-yellow-500", bg: "bg-yellow-500/10" },
    "peak-trough": { text: "text-green-400", border: "border-l-green-500", bg: "bg-green-500/10" },
    "ma-crossover": { text: "text-blue-400", border: "border-l-blue-500", bg: "bg-blue-500/10" },
    "fourier": { text: "text-violet-400", border: "border-l-violet-500", bg: "bg-violet-500/10" },
    "support-resistance": { text: "text-rose-400", border: "border-l-rose-500", bg: "bg-rose-500/10" }
  };
  const [trendType, setTrendType] = useState("up");
  const [trends, setTrends] = useState([]);
  const [bigMoves, setBigMoves] = useState([]);
  const [spyCorrelations, setSpyCorrelations] = useState([]);
  const [gapOpens, setGapOpens] = useState([]);
  const [gapOpenStats, setGapOpenStats] = useState(null);
  const [intradayStats, setIntradayStats] = useState(null);
  const [cycleAnalysis, setCycleAnalysis] = useState(null);
  const [spyDirection, setSpyDirection] = useState("up");
  const [bigMovesDirection, setBigMovesDirection] = useState("up");
  const [gapOpenDirection, setGapOpenDirection] = useState("up");
  const [maShort, setMaShort] = useState(50);
  const [maLong, setMaLong] = useState(200);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [relatedStocks, setRelatedStocks] = useState([]);
  const [relatedStocksExpanded, setRelatedStocksExpanded] = useState(false);
  const [loadingRelatedStocks, setLoadingRelatedStocks] = useState(false);
  const [historicalData, setHistoricalData] = useState([]);

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

  const analyzeGapOpens = async () => {
    if (!stockCode) {
      setError("No stock selected");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Track API call
      const apiCounts = { historicalTrends: 1 };

      // Fetch gap open data
      const response = await fetch(
        `/api/historical-trends?symbol=${stockCode}&years=5&type=gapopen&direction=${gapOpenDirection}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch gap open data");
      }

      const data = await response.json();
      setGapOpens(data.gapOpens || []);

      // Log API call to tracking endpoint
      fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ counts: apiCounts })
      }).catch(err => console.error('Failed to send tracking data:', err));

    } catch (err) {
      setError(err.message);
      console.error("Error analyzing gap opens:", err);
    } finally {
      setLoading(false);
    }
  };

  const analyzeGapOpenStats = async () => {
    if (!stockCode) {
      setError("No stock selected");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Track API call
      const apiCounts = { historicalTrends: 1 };

      // Fetch gap open statistics
      const response = await fetch(
        `/api/historical-trends?symbol=${stockCode}&years=5&type=gapopenstat`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch gap open statistics");
      }

      const data = await response.json();
      setGapOpenStats(data.statistics || null);

      // Log API call to tracking endpoint
      fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ counts: apiCounts })
      }).catch(err => console.error('Failed to send tracking data:', err));

    } catch (err) {
      setError(err.message);
      console.error("Error analyzing gap open statistics:", err);
    } finally {
      setLoading(false);
    }
  };

  const analyzeIntradayStats = async () => {
    if (!stockCode) {
      setError("No stock selected");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Track API call
      const apiCounts = { historicalTrends: 1 };

      // Fetch intraday statistics
      const response = await fetch(
        `/api/historical-trends?symbol=${stockCode}&years=5&type=intradaystat`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch intraday statistics");
      }

      const data = await response.json();
      setIntradayStats(data.statistics || null);

      // Log API call to tracking endpoint
      fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ counts: apiCounts })
      }).catch(err => console.error('Failed to send tracking data:', err));

    } catch (err) {
      setError(err.message);
      console.error("Error analyzing intraday statistics:", err);
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
      let url = `/api/cycle-analysis?symbol=${stockCode}&years=5&mode=${mode}`;

      // Add MA parameters for ma-crossover mode
      if (mode === 'ma-crossover') {
        url += `&maShort=${maShort}&maLong=${maLong}`;
      }

      const response = await fetch(url);

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

  const applySimulationParameters = (short, long) => {
    setMaShort(short);
    setMaLong(long);
    // The useEffect will automatically trigger analyzeCycles when maShort/maLong change
  };

  const analyzeRviPrice = async () => {
    if (!stockCode) {
      setError("No stock selected");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Track API call
      const apiCounts = { historicalTrends: 1 };

      // Fetch historical data with volume for RVI calculation
      const response = await fetch(
        `/api/historical-trends?symbol=${stockCode}&years=5&type=raw`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch historical data");
      }

      const data = await response.json();
      setHistoricalData(data.historicalData || []);

      // Log API call to tracking endpoint
      fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ counts: apiCounts })
      }).catch(err => console.error('Failed to send tracking data:', err));

    } catch (err) {
      setError(err.message);
      console.error("Error analyzing RVI vs Price:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRelatedStocks = async () => {
    if (!stockCode) {
      return;
    }

    setLoadingRelatedStocks(true);

    try {
      const response = await fetch(`/api/related-stocks?symbol=${stockCode}`);

      if (!response.ok) {
        throw new Error("Failed to fetch related stocks");
      }

      const data = await response.json();
      setRelatedStocks(data.relatedStocks || []);

    } catch (err) {
      console.error("Error fetching related stocks:", err);
      setRelatedStocks([]);
    } finally {
      setLoadingRelatedStocks(false);
    }
  };

  // Helper function to hide a mode (uncheck and hide results)
  const hideMode = (modeValue) => {
    const newSelectedOptions = new Set(selectedOptions);
    newSelectedOptions.delete(modeValue);
    setSelectedOptions(newSelectedOptions);
  };

  // Auto-fetch related stocks when stock changes
  useEffect(() => {
    if (stockCode && relatedStocksExpanded) {
      fetchRelatedStocks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stockCode, relatedStocksExpanded]);

  // Auto-trigger analysis when mode is selected
  useEffect(() => {
    if (selectedOptions.has("top10") && stockCode) {
      analyzeTrends();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOptions, trendType, stockCode]);

  useEffect(() => {
    if (selectedOptions.has("bigmoves") && stockCode) {
      analyzeBigMoves();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOptions, bigMovesDirection, stockCode]);

  useEffect(() => {
    if (selectedOptions.has("spycorr") && stockCode) {
      analyzeSpyCorrelation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOptions, spyDirection, stockCode]);

  useEffect(() => {
    if (selectedOptions.has("gapopen") && stockCode) {
      analyzeGapOpens();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOptions, gapOpenDirection, stockCode]);

  // Auto-trigger cycle analysis when a cycle mode is selected
  useEffect(() => {
    const cycleAnalysisModes = ["seasonal", "peak-trough", "ma-crossover", "fourier", "support-resistance"];
    cycleAnalysisModes.forEach(mode => {
      if (selectedOptions.has(mode) && stockCode) {
        analyzeCycles(mode);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOptions, stockCode, maShort, maLong]);

  // Auto-trigger statistics analysis when a statistics mode is selected
  useEffect(() => {
    if (selectedOptions.has("gapopenstat") && stockCode) {
      analyzeGapOpenStats();
    }
    if (selectedOptions.has("intradaystat") && stockCode) {
      analyzeIntradayStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOptions, stockCode]);

  // Auto-trigger RVI price analysis when selected
  useEffect(() => {
    if (selectedOptions.has("rvi-price") && stockCode) {
      analyzeRviPrice();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOptions, stockCode]);

  return (
    <>
      {/* Related Stocks Section */}
      <div className="bg-gray-800 rounded-lg border border-gray-700" style={{ marginTop: '1rem' }}>
        {/* Collapsible Header */}
        <button
          onClick={() => setRelatedStocksExpanded(!relatedStocksExpanded)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-750 transition-colors"
        >
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="text-green-400" size={24} />
            Related Stocks
          </h2>
          <div className="style={{ color: '#93c5fd' }}">
            {relatedStocksExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
          </div>
        </button>

        {/* Collapsible Content */}
        {relatedStocksExpanded && (
          <div className="p-6 pt-0">
            {loadingRelatedStocks ? (
              <div className="flex items-center justify-center py-8 text-blue-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mr-3"></div>
                <span>Loading related stocks...</span>
              </div>
            ) : relatedStocks.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr>
                      <th className="px-3 py-2 text-gray-300 font-semibold border-b border-gray-600 text-sm" style={{ backgroundColor: 'rgba(30, 58, 138, 0.3)' }}>Stock Code</th>
                      <th className="px-3 py-2 text-gray-300 font-semibold border-b border-gray-600 text-sm" style={{ backgroundColor: 'rgba(30, 58, 138, 0.3)' }}>Stock Name</th>
                      <th className="px-3 py-2 text-gray-300 font-semibold border-b border-gray-600 text-sm" style={{ backgroundColor: 'rgba(30, 58, 138, 0.3)' }}>Relationship</th>
                      <th className="px-3 py-2 text-gray-300 font-semibold border-b border-gray-600 text-sm" style={{ backgroundColor: 'rgba(20, 83, 45, 0.3)' }}>Stock Code</th>
                      <th className="px-3 py-2 text-gray-300 font-semibold border-b border-gray-600 text-sm" style={{ backgroundColor: 'rgba(20, 83, 45, 0.3)' }}>Stock Name</th>
                      <th className="px-3 py-2 text-gray-300 font-semibold border-b border-gray-600 text-sm" style={{ backgroundColor: 'rgba(20, 83, 45, 0.3)' }}>Relationship</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relatedStocks.reduce((rows, stock, index) => {
                      if (index % 2 === 0) {
                        rows.push([stock]);
                      } else {
                        rows[rows.length - 1].push(stock);
                      }
                      return rows;
                    }, []).map((row, rowIndex) => (
                      <tr key={rowIndex} className="border-b border-gray-700 hover:bg-gray-700/30 transition-colors">
                        <td className="px-3 py-2 font-medium text-sm" style={{ backgroundColor: 'rgba(30, 58, 138, 0.15)', color: '#60a5fa' }}>{row[0].symbol}</td>
                        <td className="px-3 py-2 text-sm" style={{ backgroundColor: 'rgba(30, 58, 138, 0.15)', color: '#d1d5db' }}>{row[0].name}</td>
                        <td className="px-3 py-2 text-sm" style={{ backgroundColor: 'rgba(30, 58, 138, 0.15)', color: '#9ca3af' }}>{row[0].relationshipType}</td>
                        {row[1] ? (
                          <>
                            <td className="px-3 py-2 font-medium text-sm" style={{ backgroundColor: 'rgba(20, 83, 45, 0.15)', color: '#4ade80' }}>{row[1].symbol}</td>
                            <td className="px-3 py-2 text-sm" style={{ backgroundColor: 'rgba(20, 83, 45, 0.15)', color: '#d1d5db' }}>{row[1].name}</td>
                            <td className="px-3 py-2 text-sm" style={{ backgroundColor: 'rgba(20, 83, 45, 0.15)', color: '#9ca3af' }}>{row[1].relationshipType}</td>
                          </>
                        ) : (
                          <>
                            <td className="px-3 py-2 text-sm" style={{ backgroundColor: 'rgba(20, 83, 45, 0.15)' }}></td>
                            <td className="px-3 py-2 text-sm" style={{ backgroundColor: 'rgba(20, 83, 45, 0.15)' }}></td>
                            <td className="px-3 py-2 text-sm" style={{ backgroundColor: 'rgba(20, 83, 45, 0.15)' }}></td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                {stockCode ? "No related stocks found" : "Search for a stock to see related companies"}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Historical Data Analysis Section */}
      <div className="bg-gray-800 rounded-lg border border-gray-700" style={{ marginTop: '1rem' }}>
        {/* Collapsible Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-750 transition-colors"
        >
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="text-blue-400" size={24} />
            Historical Data Analysis
          </h2>
          <div className="style={{ color: '#93c5fd' }}">
            {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
          </div>
        </button>

      {/* Collapsible Content */}
      {isExpanded && (
        <div className="p-6 pt-0">
          {/* Option Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2" style={{ color: '#bfdbfe' }}>
              Analysis Type
            </label>
            <div className="grid grid-cols-3 gap-4">
              {[
                { value: "top10", label: "Top 30 up/down consecutive daily change" },
                { value: "bigmoves", label: "Big Single Day Up/Down" },
                { value: "spycorr", label: "Top 30 up/down daily SPY change" },
                { value: "gapopen", label: "Up/Down Gap Open" },
                { value: "gapopenstat", label: "Market Open Statistic" },
                { value: "intradaystat", label: "Intraday Statistic" },
                { value: "rvi-price", label: "Relative Volume Index vs Price Change" },
                { value: "stock-correlation", label: "Stock Correlation & Lead-Lag" },
                { value: "seasonal", label: "Seasonal/Calendar Patterns" },
                { value: "peak-trough", label: "Peak-to-Trough Cycles" },
                { value: "ma-crossover", label: "Moving Average Crossovers" },
                { value: "fourier", label: "Fourier/Spectral Analysis" },
                { value: "support-resistance", label: "Support/Resistance Levels" }
              ].map(option => (
                <label
                  key={option.value}
                  className={`flex items-center gap-2 px-4 py-3 rounded-lg cursor-pointer border-2 border-l-4 transition-all ${selectedOptions.has(option.value) ? `${modeColors[option.value].border} ${modeColors[option.value].bg} border-gray-500` : 'border-gray-600 bg-gray-700'}`}
                  style={{ width: '100%' }}
                >
                  <input
                    type="checkbox"
                    name="analysisType"
                    value={option.value}
                    checked={selectedOptions.has(option.value)}
                    onChange={(e) => {
                      const newSelectedOptions = new Set(selectedOptions);
                      if (e.target.checked) {
                        newSelectedOptions.add(option.value);
                      } else {
                        newSelectedOptions.delete(option.value);
                      }
                      setSelectedOptions(newSelectedOptions);
                    }}
                    className="form-checkbox accent-blue-500 mr-2"
                  />
                  <span className={`${modeColors[option.value].text} font-semibold`}>{option.label}</span>
                </label>
              ))}
            </div>
            {/* Subject Headings for selected analysis types - removed since multiple can be selected */}
          </div>

      {/* Trend Direction Selection - Only for top10 */}
      {selectedOptions.has("top10") && (
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
          <button
            onClick={() => setTrendType("mixed")}
            className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all"
            style={{
              backgroundColor: trendType === "mixed" ? "#10b981" : "#374151",
              color: trendType === "mixed" ? "#ffffff" : "#d1d5db",
            }}
          >
            <TrendingUp size={20} />
            <TrendingDown size={20} />
            Mixed (60 records)
          </button>
        </div>
      )}
      {selectedOptions.has("bigmoves") && (
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
              Top 30 Upward Days
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
              Top 30 Downward Days
            </button>
            <button
              onClick={() => setBigMovesDirection("mixed")}
              className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all"
              style={{
                backgroundColor: bigMovesDirection === "mixed" ? "#10b981" : "#374151",
                color: bigMovesDirection === "mixed" ? "#ffffff" : "#d1d5db",
              }}
            >
              <TrendingUp size={20} />
              <TrendingDown size={20} />
              Mixed (60 records)
            </button>
          </div>
        </div>
      )}

      {/* SPY Direction Selection - Only for spycorr */}
      {selectedOptions.has("spycorr") && (
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
            <button
              onClick={() => setSpyDirection("mixed")}
              className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all"
              style={{
                backgroundColor: spyDirection === "mixed" ? "#10b981" : "#374151",
                color: spyDirection === "mixed" ? "#ffffff" : "#d1d5db",
              }}
            >
              <TrendingUp size={20} />
              <TrendingDown size={20} />
              Mixed (60 records)
            </button>
          </div>
        </div>
      )}

      {/* Gap Open Direction Selection - Only for gapopen */}
      {selectedOptions.has("gapopen") && (
        <div className="mb-6">
          <div className="flex gap-4 mb-4">
            <button
              onClick={() => setGapOpenDirection("up")}
              className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all"
              style={{
                backgroundColor: gapOpenDirection === "up" ? "#10b981" : "#374151",
                color: gapOpenDirection === "up" ? "#ffffff" : "#d1d5db",
              }}
            >
              <TrendingUp size={20} />
              {loading && gapOpenDirection === "up" ? "Analyzing..." : "Top 30 Gap Up"}
            </button>
            <button
              onClick={() => setGapOpenDirection("down")}
              className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all"
              style={{
                backgroundColor: gapOpenDirection === "down" ? "#10b981" : "#374151",
                color: gapOpenDirection === "down" ? "#ffffff" : "#d1d5db",
              }}
            >
              <TrendingDown size={20} />
              {loading && gapOpenDirection === "down" ? "Analyzing..." : "Top 30 Gap Down"}
            </button>
            <button
              onClick={() => setGapOpenDirection("mixed")}
              className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all"
              style={{
                backgroundColor: gapOpenDirection === "mixed" ? "#10b981" : "#374151",
                color: gapOpenDirection === "mixed" ? "#ffffff" : "#d1d5db",
              }}
            >
              <TrendingUp size={20} />
              <TrendingDown size={20} />
              {loading && gapOpenDirection === "mixed" ? "Analyzing..." : "Mixed (60 records)"}
            </button>
          </div>
        </div>
      )}

      {/* Loading indicator for cycle analysis modes (except ma-crossover) */}
      {["seasonal", "peak-trough", "fourier", "support-resistance"].some(mode => selectedOptions.has(mode)) && loading && (
        <div className="flex items-center gap-2 text-blue-400 mb-6">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
          <span>Analyzing cycle data...</span>
        </div>
      )}

      {/* Loading indicator for statistics modes */}
      {["gapopenstat", "intradaystat"].some(mode => selectedOptions.has(mode)) && loading && (
        <div className="flex items-center gap-2 text-blue-400 mb-6">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
          <span>Analyzing statistics...</span>
        </div>
      )}

      {/* Loading indicator for RVI mode */}
      {selectedOptions.has("rvi-price") && loading && (
        <div className="flex items-center gap-2 text-blue-400 mb-6">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
          <span>Analyzing Relative Volume Index vs Price Change...</span>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/30 border border-red-500 text-red-300 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Trends Table */}
      {selectedOptions.has("top10") && trends.length > 0 && (
        <div className={`mb-6 bg-gray-750 rounded-lg border-2 border-l-4 overflow-hidden ${modeColors["top10"].border} ${modeColors["top10"].bg}`}>
          <div className="flex items-center justify-between px-4 py-5 bg-gray-700/50 border-b border-gray-600">
            <h3 className={`text-2xl font-bold ${modeColors["top10"].text}`}>Top 30 Up/Down Consecutive Daily Change</h3>
            <button
              onClick={() => hideMode("top10")}
              className="text-gray-400 hover:text-red-400 transition-colors"
              title="Hide this section"
            >
              <X size={20} />
            </button>
          </div>
          <div className="p-4">
            <TrendsTable trends={trends} />
          </div>
        </div>
      )}

      {/* Big Moves Table */}
      {selectedOptions.has("bigmoves") && bigMoves.length > 0 && (
        <div className={`mb-6 bg-gray-750 rounded-lg border-2 border-l-4 overflow-hidden ${modeColors["bigmoves"].border} ${modeColors["bigmoves"].bg}`}>
          <div className="flex items-center justify-between px-4 py-5 bg-gray-700/50 border-b border-gray-600">
            <h3 className={`text-2xl font-bold ${modeColors["bigmoves"].text}`}>Big Single Day Up/Down</h3>
            <button
              onClick={() => hideMode("bigmoves")}
              className="text-gray-400 hover:text-red-400 transition-colors"
              title="Hide this section"
            >
              <X size={20} />
            </button>
          </div>
          <div className="p-4">
            <BigMovesTable bigMoves={bigMoves} />
          </div>
        </div>
      )}

      {/* SPY Correlation Table */}
      {selectedOptions.has("spycorr") && spyCorrelations.length > 0 && (
        <div className={`mb-6 bg-gray-750 rounded-lg border-2 border-l-4 overflow-hidden ${modeColors["spycorr"].border} ${modeColors["spycorr"].bg}`}>
          <div className="flex items-center justify-between px-4 py-5 bg-gray-700/50 border-b border-gray-600">
            <h3 className={`text-2xl font-bold ${modeColors["spycorr"].text}`}>Top 30 Up/Down Daily SPY Change</h3>
            <button
              onClick={() => hideMode("spycorr")}
              className="text-gray-400 hover:text-red-400 transition-colors"
              title="Hide this section"
            >
              <X size={20} />
            </button>
          </div>
          <div className="p-4">
            <SpyCorrelationTable correlations={spyCorrelations} />
          </div>
        </div>
      )}

      {/* Gap Open Table */}
      {selectedOptions.has("gapopen") && gapOpens.length > 0 && (
        <div className={`mb-6 bg-gray-750 rounded-lg border-2 border-l-4 overflow-hidden ${modeColors["gapopen"].border} ${modeColors["gapopen"].bg}`}>
          <div className="flex items-center justify-between px-4 py-5 bg-gray-700/50 border-b border-gray-600">
            <h3 className={`text-2xl font-bold ${modeColors["gapopen"].text}`}>Up/Down Gap Open</h3>
            <button
              onClick={() => hideMode("gapopen")}
              className="text-gray-400 hover:text-red-400 transition-colors"
              title="Hide this section"
            >
              <X size={20} />
            </button>
          </div>
          <div className="p-4">
            <GapOpenTable gapOpens={gapOpens} />
          </div>
        </div>
      )}

      {/* Gap Open Statistics */}
      {gapOpenStats && selectedOptions.has("gapopenstat") && (
        <div className={`mb-6 bg-gray-750 rounded-lg border-2 border-l-4 overflow-hidden ${modeColors["gapopenstat"].border} ${modeColors["gapopenstat"].bg}`}>
          <div className="flex items-center justify-between px-4 py-5 bg-gray-700/50 border-b border-gray-600">
            <h3 className={`text-2xl font-bold ${modeColors["gapopenstat"].text}`}>Market Open Statistic</h3>
            <button
              onClick={() => hideMode("gapopenstat")}
              className="text-gray-400 hover:text-red-400 transition-colors"
              title="Hide this section"
            >
              <X size={20} />
            </button>
          </div>
          <div className="p-4">
            <StatisticsTable statistics={gapOpenStats} title="Market Open %" />
          </div>
        </div>
      )}

      {/* Intraday Statistics */}
      {intradayStats && selectedOptions.has("intradaystat") && (
        <div className={`mb-6 bg-gray-750 rounded-lg border-2 border-l-4 overflow-hidden ${modeColors["intradaystat"].border} ${modeColors["intradaystat"].bg}`}>
          <div className="flex items-center justify-between px-4 py-5 bg-gray-700/50 border-b border-gray-600">
            <h3 className={`text-2xl font-bold ${modeColors["intradaystat"].text}`}>Intraday Statistic</h3>
            <button
              onClick={() => hideMode("intradaystat")}
              className="text-gray-400 hover:text-red-400 transition-colors"
              title="Hide this section"
            >
              <X size={20} />
            </button>
          </div>
          <div className="p-4">
            <StatisticsTable statistics={intradayStats} title="Intraday Change %" />
          </div>
        </div>
      )}

      {/* Moving Average Controls & Analysis - Only for ma-crossover */}
      {selectedOptions.has("ma-crossover") && (
        <div className={`mb-6 bg-gray-750 rounded-lg border-2 border-l-4 overflow-hidden ${modeColors["ma-crossover"].border} ${modeColors["ma-crossover"].bg}`}>
          <div className="flex items-center justify-between px-4 py-5 bg-gray-700/50 border-b border-gray-600">
            <h3 className={`text-2xl font-bold ${modeColors["ma-crossover"].text}`}>Moving Average Crossovers</h3>
            <button
              onClick={() => hideMode("ma-crossover")}
              className="text-gray-400 hover:text-red-400 transition-colors"
              title="Hide this section"
            >
              <X size={20} />
            </button>
          </div>
          <div className="p-4">
            <div className="mb-6 p-4 rounded-lg border" style={{ backgroundColor: 'rgba(250, 204, 21, 0.2)', borderColor: '#facc15' }}>
              <div className="flex items-center">
                <div className="flex-1" style={{ marginRight: '0.3rem' }}>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-gray-300">Short MA</label>
                    <span className="text-base font-bold" style={{ color: '#22c55e' }}>{maShort}D</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    step="5"
                    value={maShort}
                    onChange={(e) => setMaShort(parseInt(e.target.value))}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer ma-range"
                    style={{ backgroundColor: '#facc15', accentColor: '#facc15' }}
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>5</span>
                    <span>100</span>
                  </div>
                </div>
                <div className="flex-1" style={{ marginLeft: '0.3rem' }}>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-gray-300">Long MA</label>
                    <span className="text-base font-bold" style={{ color: '#22c55e' }}>{maLong}D</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="300"
                    step="10"
                    value={maLong}
                    onChange={(e) => setMaLong(parseInt(e.target.value))}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer ma-range"
                    style={{ backgroundColor: '#facc15', accentColor: '#facc15' }}
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>50</span>
                    <span>300</span>
                  </div>
                </div>
              </div>
            </div>

      {/* Cycle Analysis Results */}
      {cycleAnalysis && selectedOptions.has("seasonal") && (
        <div className={`mb-6 bg-gray-750 rounded-lg border-2 border-l-4 overflow-hidden ${modeColors["seasonal"].border} ${modeColors["seasonal"].bg}`}>
          <div className="flex items-center justify-between px-4 py-5 bg-gray-700/50 border-b border-gray-600">
            <h3 className={`text-2xl font-bold ${modeColors["seasonal"].text}`}>Seasonal/Calendar Patterns</h3>
            <button
              onClick={() => hideMode("seasonal")}
              className="text-gray-400 hover:text-red-400 transition-colors"
              title="Hide this section"
            >
              <X size={20} />
            </button>
          </div>
          <div className="p-4">
            <SeasonalAnalysis cycleAnalysis={cycleAnalysis} stockCode={stockCode} />
          </div>
        </div>
      )}

      {cycleAnalysis && selectedOptions.has("peak-trough") && (
        <div className={`mb-6 bg-gray-750 rounded-lg border-2 border-l-4 overflow-hidden ${modeColors["peak-trough"].border} ${modeColors["peak-trough"].bg}`}>
          <div className="flex items-center justify-between px-4 py-5 bg-gray-700/50 border-b border-gray-600">
            <h3 className={`text-2xl font-bold ${modeColors["peak-trough"].text}`}>Peak-to-Trough Cycles</h3>
            <button
              onClick={() => hideMode("peak-trough")}
              className="text-gray-400 hover:text-red-400 transition-colors"
              title="Hide this section"
            >
              <X size={20} />
            </button>
          </div>
          <div className="p-4">
            <PeakTroughAnalysis cycleAnalysis={cycleAnalysis} />
          </div>
        </div>
      )}

            {cycleAnalysis && (
              <MovingAverageCrossoverAnalysis
                cycleAnalysis={cycleAnalysis}
                maShort={maShort}
                maLong={maLong}
                loading={loading}
                onSimulate={{
                  stockCode,
                  onParametersSelect: applySimulationParameters
                }}
              />
            )}
          </div>
        </div>
      )}

      {cycleAnalysis && selectedOptions.has("fourier") && (
        <div className={`mb-6 bg-gray-750 rounded-lg border-2 border-l-4 overflow-hidden ${modeColors["fourier"].border} ${modeColors["fourier"].bg}`}>
          <div className="flex items-center justify-between px-4 py-5 bg-gray-700/50 border-b border-gray-600">
            <h3 className={`text-2xl font-bold ${modeColors["fourier"].text}`}>Fourier/Spectral Analysis</h3>
            <button
              onClick={() => hideMode("fourier")}
              className="text-gray-400 hover:text-red-400 transition-colors"
              title="Hide this section"
            >
              <X size={20} />
            </button>
          </div>
          <div className="p-4">
            <FourierAnalysis cycleAnalysis={cycleAnalysis} />
          </div>
        </div>
      )}

      {cycleAnalysis && selectedOptions.has("support-resistance") && (
        <div className={`mb-6 bg-gray-750 rounded-lg border-2 border-l-4 overflow-hidden ${modeColors["support-resistance"].border} ${modeColors["support-resistance"].bg}`}>
          <div className="flex items-center justify-between px-4 py-5 bg-gray-700/50 border-b border-gray-600">
            <h3 className={`text-2xl font-bold ${modeColors["support-resistance"].text}`}>Support/Resistance Levels</h3>
            <button
              onClick={() => hideMode("support-resistance")}
              className="text-gray-400 hover:text-red-400 transition-colors"
              title="Hide this section"
            >
              <X size={20} />
            </button>
          </div>
          <div className="p-4">
            <SupportResistanceAnalysis cycleAnalysis={cycleAnalysis} />
          </div>
        </div>
      )}

      {/* Stock Correlation Analysis */}
      {selectedOptions.has("stock-correlation") && stockCode && (
        <div className={`mb-6 bg-gray-750 rounded-lg border-2 border-l-4 overflow-hidden ${modeColors["stock-correlation"].border} ${modeColors["stock-correlation"].bg}`}>
          <div className="flex items-center justify-between px-4 py-5 bg-gray-700/50 border-b border-gray-600">
            <h3 className={`text-2xl font-bold ${modeColors["stock-correlation"].text}`}>Stock Correlation & Lead-Lag</h3>
            <button
              onClick={() => hideMode("stock-correlation")}
              className="text-gray-400 hover:text-red-400 transition-colors"
              title="Hide this section"
            >
              <X size={20} />
            </button>
          </div>
          <div className="p-4">
            <StockCorrelationSection symbol={stockCode} />
          </div>
        </div>
      )}

      {/* RVI vs Price Change Analysis */}
      {selectedOptions.has("rvi-price") && historicalData.length > 0 && (
        <div className={`mb-6 bg-gray-750 rounded-lg border-2 border-l-4 overflow-hidden ${modeColors["rvi-price"].border} ${modeColors["rvi-price"].bg}`}>
          <div className="flex items-center justify-between px-4 py-5 bg-gray-700/50 border-b border-gray-600">
            <h3 className={`text-2xl font-bold ${modeColors["rvi-price"].text}`}>Relative Volume Index vs Price Change</h3>
            <button
              onClick={() => hideMode("rvi-price")}
              className="text-gray-400 hover:text-red-400 transition-colors"
              title="Hide this section"
            >
              <X size={20} />
            </button>
          </div>
          <div className="p-4">
            <RVIPriceTable historicalData={historicalData} />
          </div>
        </div>
      )}

      {/* No Results */}
      {!loading && trends.length === 0 && bigMoves.length === 0 && spyCorrelations.length === 0 && gapOpens.length === 0 && !gapOpenStats && !intradayStats && !cycleAnalysis && !error && stockCode && selectedOptions.size > 0 && (
        <div className="style={{ color: '#93c5fd' }} text-center py-8">
          Select one or more analysis types above to see historical performance data
        </div>
      )}

      {!stockCode && (
        <div className="style={{ color: '#93c5fd' }} text-center py-8">
          Search for a stock to analyze historical trends
        </div>
      )}
        </div>
      )}
    </div>
    </>
  );
}
