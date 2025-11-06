"use client";

import { useState, useEffect } from "react";

export function CorrelationTable({ symbol, relatedStocks, onSelectStock }) {
  const [correlations, setCorrelations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [years, setYears] = useState(5);

  useEffect(() => {
    if (!symbol || !relatedStocks || relatedStocks.length === 0) {
      return;
    }

    async function fetchCorrelations() {
      setLoading(true);
      setError(null);

      try {
        // Calculate correlation for up to 20 related stocks (to avoid too many API calls)
        const stocksToAnalyze = relatedStocks.slice(0, 20);

        const results = await Promise.allSettled(
          stocksToAnalyze.map(async (relatedStock) => {
            try {
              const response = await fetch(
                `/api/stock-correlation?symbol1=${symbol}&symbol2=${relatedStock.symbol}&years=${years}`
              );

              if (!response.ok) {
                throw new Error(`Failed to fetch correlation with ${relatedStock.symbol}`);
              }

              const data = await response.json();
              return {
                ...relatedStock,
                correlation: data.correlation.value,
                strength: data.correlation.strength,
                direction: data.correlation.direction,
                dataPoints: data.dataPoints,
                leadLag: data.leadLag
              };
            } catch (err) {
              console.error(`Error fetching correlation for ${relatedStock.symbol}:`, err);
              return null;
            }
          })
        );

        // Filter successful results and sort by absolute correlation
        const validResults = results
          .filter(result => result.status === 'fulfilled' && result.value !== null)
          .map(result => result.value)
          .sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));

        setCorrelations(validResults);
      } catch (err) {
        console.error("Error fetching correlations:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchCorrelations();
  }, [symbol, relatedStocks, years]);

  const getColorForCorrelation = (correlation) => {
    if (correlation === null || correlation === undefined) {
      return 'rgba(107, 114, 128, 0.3)'; // gray for null/undefined
    }

    const absCorr = Math.abs(correlation);

    if (correlation >= 0) {
      // Positive: green gradient
      const intensity = absCorr;
      const alpha = 0.2 + intensity * 0.6;
      return `rgba(16, 185, 129, ${alpha})`;
    } else {
      // Negative: red gradient
      const intensity = absCorr;
      const alpha = 0.2 + intensity * 0.6;
      return `rgba(239, 68, 68, ${alpha})`;
    }
  };

  const formatLeadLag = (leadLag) => {
    if (!leadLag) return "N/A";

    if (leadLag.bestLag === 0) {
      return "Simultaneous";
    } else if (leadLag.bestLag > 0) {
      return `${symbol} leads by ${leadLag.leadDays ?? 0}d`;
    } else {
      return `${leadLag.leaderSymbol ?? 'Stock'} leads by ${leadLag.leadDays ?? 0}d`;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-400">Calculating correlations...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
        <p className="text-red-400">Error loading correlations: {error}</p>
      </div>
    );
  }

  if (correlations.length === 0) {
    return (
      <div className="text-gray-400 text-center py-8">
        No correlation data available for related stocks.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-white">
            Correlation with Related Stocks
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            Click a stock to see detailed lead-lag analysis
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-400">Time Period:</label>
          <select
            value={years}
            onChange={(e) => setYears(parseInt(e.target.value))}
            className="bg-gray-700 text-white px-3 py-1 rounded border border-gray-600 focus:outline-none focus:border-blue-500"
          >
            <option value={1}>1 Year</option>
            <option value={2}>2 Years</option>
            <option value={5}>5 Years</option>
            <option value={10}>10 Years</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-700">
              <th className="px-4 py-3 text-gray-300 font-semibold border-b border-gray-600">
                Rank
              </th>
              <th className="px-4 py-3 text-gray-300 font-semibold border-b border-gray-600">
                Symbol
              </th>
              <th className="px-4 py-3 text-gray-300 font-semibold border-b border-gray-600">
                Company Name
              </th>
              <th className="px-4 py-3 text-gray-300 font-semibold border-b border-gray-600">
                Relationship
              </th>
              <th className="px-4 py-3 text-gray-300 font-semibold border-b border-gray-600 text-center">
                Correlation
              </th>
              <th className="px-4 py-3 text-gray-300 font-semibold border-b border-gray-600">
                Strength
              </th>
              <th className="px-4 py-3 text-gray-300 font-semibold border-b border-gray-600">
                Lead-Lag
              </th>
              <th className="px-4 py-3 text-gray-300 font-semibold border-b border-gray-600 text-center">
                Data Points
              </th>
              <th className="px-4 py-3 text-gray-300 font-semibold border-b border-gray-600">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {correlations.map((item, index) => (
              <tr
                key={item.symbol}
                className="border-b border-gray-700 hover:bg-gray-700/30 transition-colors"
              >
                <td className="px-4 py-3 text-white font-medium">
                  #{index + 1}
                </td>
                <td className="px-4 py-3 text-blue-400 font-semibold">
                  {item.symbol}
                </td>
                <td className="px-4 py-3 text-gray-300">
                  {item.name}
                </td>
                <td className="px-4 py-3 text-gray-400 text-sm">
                  {item.relationshipType}
                </td>
                <td
                  className="px-4 py-3 font-bold text-white text-center"
                  style={{ backgroundColor: getColorForCorrelation(item.correlation) }}
                >
                  {(item.correlation ?? 0).toFixed(3)}
                </td>
                <td className="px-4 py-3 text-gray-300">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    item.strength === 'Very Strong' ? 'bg-green-900/50 text-green-300' :
                    item.strength === 'Strong' ? 'bg-green-800/50 text-green-300' :
                    item.strength === 'Moderate' ? 'bg-yellow-800/50 text-yellow-300' :
                    'bg-gray-700 text-gray-400'
                  }`}>
                    {item.strength ?? 'Unknown'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-300 text-sm">
                  {formatLeadLag(item.leadLag)}
                </td>
                <td className="px-4 py-3 text-gray-400 text-center text-sm">
                  {item.dataPoints ?? 0}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => onSelectStock(item)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                  >
                    Analyze
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-sm">
        <h4 className="font-semibold text-white mb-2">Understanding Correlation</h4>
        <ul className="space-y-1 text-gray-300">
          <li><strong>+1.0:</strong> Perfect positive correlation (stocks move together)</li>
          <li><strong>0.0:</strong> No correlation (stocks move independently)</li>
          <li><strong>-1.0:</strong> Perfect negative correlation (stocks move opposite)</li>
          <li><strong>Lead-Lag:</strong> Indicates if one stock's movements predict the other's</li>
        </ul>
      </div>
    </div>
  );
}
