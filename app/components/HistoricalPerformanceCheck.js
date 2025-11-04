"use client";
import React, { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, ChevronDown, ChevronUp, BarChart3 } from "lucide-react";
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

export function HistoricalPerformanceCheck({ stockCode }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedOption, setSelectedOption] = useState("top10");
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

  // Auto-trigger analysis when mode is selected
  useEffect(() => {
    if (selectedOption === "top10" && stockCode) {
      analyzeTrends();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOption, trendType, stockCode]);

  useEffect(() => {
    if (selectedOption === "bigmoves" && stockCode) {
      analyzeBigMoves();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOption, bigMovesDirection, stockCode]);

  useEffect(() => {
    if (selectedOption === "spycorr" && stockCode) {
      analyzeSpyCorrelation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOption, spyDirection, stockCode]);

  useEffect(() => {
    if (selectedOption === "gapopen" && stockCode) {
      analyzeGapOpens();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOption, gapOpenDirection, stockCode]);

  // Auto-trigger cycle analysis when a cycle mode is selected
  useEffect(() => {
    const cycleAnalysisModes = ["seasonal", "peak-trough", "ma-crossover", "fourier", "support-resistance"];
    if (cycleAnalysisModes.includes(selectedOption) && stockCode) {
      analyzeCycles(selectedOption);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOption, stockCode]);

  // Auto-trigger statistics analysis when a statistics mode is selected
  useEffect(() => {
    if (selectedOption === "gapopenstat" && stockCode) {
      analyzeGapOpenStats();
    } else if (selectedOption === "intradaystat" && stockCode) {
      analyzeIntradayStats();
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
        <select
          value={selectedOption}
          onChange={(e) => {
            setSelectedOption(e.target.value);
            setTrends([]);
            setBigMoves([]);
            setSpyCorrelations([]);
            setGapOpens([]);
            setGapOpenStats(null);
            setIntradayStats(null);
            setCycleAnalysis(null);
            setError(null);
          }}
          className="w-full md:w-auto px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="top10">
            Top 30 up/down consecutive daily change
          </option>
          <option value="bigmoves">
            Big Single Day Up/Down
          </option>
          <option value="spycorr">
            Top 30 up/down daily SPY change
          </option>
          <option value="gapopen">
            Up/Down Gap Open
          </option>
          <option value="gapopenstat">
            Market Open Statistic
          </option>
          <option value="intradaystat">
            Intraday Statistic
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
      {selectedOption === "gapopen" && (
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

      {/* Loading indicator for cycle analysis modes */}
      {["seasonal", "peak-trough", "ma-crossover", "fourier", "support-resistance"].includes(selectedOption) && loading && (
        <div className="flex items-center gap-2 text-blue-400 mb-6">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
          <span>Analyzing {selectedOption.replace('-', ' ')}...</span>
        </div>
      )}

      {/* Loading indicator for statistics modes */}
      {["gapopenstat", "intradaystat"].includes(selectedOption) && loading && (
        <div className="flex items-center gap-2 text-blue-400 mb-6">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
          <span>Analyzing {selectedOption === "gapopenstat" ? "Market Open Statistics" : "Intraday Statistics"}...</span>
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

      {/* Gap Open Table */}
      <GapOpenTable gapOpens={gapOpens} />

      {/* Gap Open Statistics */}
      {gapOpenStats && selectedOption === "gapopenstat" && (
        <StatisticsTable statistics={gapOpenStats} title="Market Open %" />
      )}

      {/* Intraday Statistics */}
      {intradayStats && selectedOption === "intradaystat" && (
        <StatisticsTable statistics={intradayStats} title="Intraday Change %" />
      )}

      {/* Cycle Analysis Results */}
      {cycleAnalysis && selectedOption === "seasonal" && (
        <SeasonalAnalysis cycleAnalysis={cycleAnalysis} stockCode={stockCode} />
      )}

      {cycleAnalysis && selectedOption === "peak-trough" && (
        <PeakTroughAnalysis cycleAnalysis={cycleAnalysis} />
      )}

      {cycleAnalysis && selectedOption === "ma-crossover" && (
        <MovingAverageCrossoverAnalysis cycleAnalysis={cycleAnalysis} />
      )}

      {cycleAnalysis && selectedOption === "fourier" && (
        <FourierAnalysis cycleAnalysis={cycleAnalysis} />
      )}

      {cycleAnalysis && selectedOption === "support-resistance" && (
        <SupportResistanceAnalysis cycleAnalysis={cycleAnalysis} />
      )}

      {/* No Results */}
      {!loading && trends.length === 0 && bigMoves.length === 0 && spyCorrelations.length === 0 && gapOpens.length === 0 && !gapOpenStats && !intradayStats && !cycleAnalysis && !error && stockCode && (
        <div className="style={{ color: '#93c5fd' }} text-center py-8">
          Click &quot;Analyze {
            selectedOption === "top10" ? "Trends" :
            selectedOption === "bigmoves" ? "Big Moves" :
            selectedOption === "spycorr" ? "SPY Correlation" :
            selectedOption === "gapopen" ? "Gap Opens" :
            selectedOption === "gapopenstat" ? "" :
            selectedOption === "intradaystat" ? "" :
            "Cycles"
          }&quot; to see historical performance data
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
  );
}
