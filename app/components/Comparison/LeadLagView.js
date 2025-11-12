'use client';

import React, { useMemo, useState } from 'react';
import { analyzeLeadLag } from '@/app/utils/leadLagAnalysis';

/**
 * Get color for Beta value based on ranges
 */
const getBetaColor = (beta) => {
  if (beta === 'N/A') return '#9ca3af'; // gray
  const value = parseFloat(beta);

  if (value > 1.5) return '#8b5cf6'; // purple - very high sensitivity
  if (value > 1.2) return '#a78bfa'; // light purple
  if (value > 0.8) return '#10b981'; // green - moderate positive
  if (value > 0.5) return '#34d399'; // light green
  if (value > 0) return '#6ee7b7'; // very light green
  if (value > -0.5) return '#fbbf24'; // yellow - small negative
  if (value > -1) return '#f59e0b'; // orange
  return '#ef4444'; // red - strong inverse
};

/**
 * Get color for Correlation value based on strength
 */
const getCorrelationColor = (correlation) => {
  if (correlation === 'N/A') return '#9ca3af'; // gray
  const value = parseFloat(correlation);
  const absValue = Math.abs(value);

  // Strong correlation
  if (absValue >= 0.7) {
    return value > 0 ? '#10b981' : '#ef4444'; // Strong green/red
  }
  // Moderate correlation
  if (absValue >= 0.5) {
    return value > 0 ? '#34d399' : '#f87171'; // Moderate green/red
  }
  // Weak correlation
  if (absValue >= 0.3) {
    return value > 0 ? '#6ee7b7' : '#fca5a5'; // Weak green/red
  }
  // Very weak
  return '#9ca3af'; // gray
};

/**
 * LeadLagView Component
 * Displays lead/lag analysis with beta and correlation metrics
 */
export default function LeadLagView({
  selectedStock,
  comparisonStocks,
  comparisonRowSize,
  relationshipTypeFilter,
  onStockCodeClick
}) {
  const [sortBy, setSortBy] = useState('correlation'); // correlation, beta, lag, code
  const [sortDirection, setSortDirection] = useState('desc'); // asc, desc
  const [viewType, setViewType] = useState('table'); // table, heatmap

  // Calculate lead/lag analysis for all stocks
  const analysisData = useMemo(() => {
    if (!selectedStock || !comparisonStocks) return [];

    const results = comparisonStocks.map(stock =>
      analyzeLeadLag(selectedStock, stock)
    ).filter(result => result !== null);

    return results;
  }, [selectedStock, comparisonStocks]);

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    let filtered = [...analysisData];

    // Filter by relationship type
    if (relationshipTypeFilter && relationshipTypeFilter !== 'all' && relationshipTypeFilter !== 'recent') {
      filtered = filtered.filter(item => {
        const stock = comparisonStocks.find(s => s.code === item.code);
        return stock && stock.relationshipType === relationshipTypeFilter;
      });
    }

    // Apply row limit (excluding benchmarks)
    const benchmarks = ['SPY', 'QQQ'];
    const benchmarkData = filtered.filter(item => benchmarks.includes(item.code));
    const nonBenchmarkData = filtered.filter(item => !benchmarks.includes(item.code));

    if (comparisonRowSize && comparisonRowSize !== 'all') {
      filtered = [
        ...benchmarkData,
        ...nonBenchmarkData.slice(0, parseInt(comparisonRowSize) - benchmarkData.length)
      ];
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal, bVal;

      switch (sortBy) {
        case 'correlation':
          aVal = parseFloat(a.correlation) || 0;
          bVal = parseFloat(b.correlation) || 0;
          // Sort by absolute value for correlation
          return sortDirection === 'desc'
            ? Math.abs(bVal) - Math.abs(aVal)
            : Math.abs(aVal) - Math.abs(bVal);

        case 'beta':
          aVal = parseFloat(a.beta) || 0;
          bVal = parseFloat(b.beta) || 0;
          break;

        case 'lag':
          aVal = typeof a.lag === 'number' ? a.lag : 0;
          bVal = typeof b.lag === 'number' ? b.lag : 0;
          break;

        case 'code':
          return sortDirection === 'desc'
            ? b.code.localeCompare(a.code)
            : a.code.localeCompare(b.code);

        default:
          aVal = 0;
          bVal = 0;
      }

      return sortDirection === 'desc' ? bVal - aVal : aVal - bVal;
    });

    return filtered;
  }, [analysisData, sortBy, sortDirection, relationshipTypeFilter, comparisonStocks, comparisonRowSize]);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(column);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (column) => {
    if (sortBy !== column) return '⇅';
    return sortDirection === 'desc' ? '↓' : '↑';
  };

  if (!selectedStock) {
    return (
      <div className="text-center py-8 text-gray-500">
        Select a stock to view lead/lag analysis
      </div>
    );
  }

  if (filteredAndSortedData.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No comparison stocks available for analysis
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Lead/Lag Analysis: {selectedStock.code}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Beta, correlation, and lead/lag relationships with comparison stocks
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setViewType('table')}
            className={`px-3 py-1 rounded text-sm ${
              viewType === 'table'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Table
          </button>
          <button
            onClick={() => setViewType('heatmap')}
            className={`px-3 py-1 rounded text-sm ${
              viewType === 'heatmap'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Heatmap
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-gray-50 p-3 rounded-lg text-sm">
        <div className="font-semibold mb-2">Understanding the Metrics:</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <span className="font-medium">Beta:</span> Sensitivity to the selected stock's movements (slope of regression)
          </div>
          <div>
            <span className="font-medium">Correlation:</span> Strength and direction of relationship (-1 to +1)
          </div>
          <div>
            <span className="font-medium">Lead/Lag:</span> Timing relationship (positive = stock leads, negative = stock lags)
          </div>
        </div>
      </div>

      {/* Table View */}
      {viewType === 'table' && (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  onClick={() => handleSort('code')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  Code {getSortIcon('code')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Name
                </th>
                <th
                  onClick={() => handleSort('beta')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  Beta {getSortIcon('beta')}
                </th>
                <th
                  onClick={() => handleSort('correlation')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  Correlation {getSortIcon('correlation')}
                </th>
                <th
                  onClick={() => handleSort('lag')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  Lead/Lag {getSortIcon('lag')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Relationship
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Data Points
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAndSortedData.map((item, index) => {
                const isBenchmark = ['SPY', 'QQQ'].includes(item.code);
                const corrValue = parseFloat(item.correlation) || 0;
                const absCorr = Math.abs(corrValue);

                return (
                  <tr
                    key={item.code}
                    className={`hover:bg-gray-50 ${isBenchmark ? 'bg-blue-50' : ''}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => onStockCodeClick && onStockCodeClick(item.code)}
                        className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-semibold transition-colors"
                        title={`Search for ${item.code}`}
                      >
                        {item.code}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {item.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className="font-semibold px-2 py-1 rounded"
                        style={{
                          color: getBetaColor(item.beta),
                          backgroundColor: getBetaColor(item.beta) + '20'
                        }}
                      >
                        {item.beta}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getCorrelationColor(item.correlation) }}
                        />
                        <span
                          className="font-semibold px-2 py-1 rounded"
                          style={{
                            color: getCorrelationColor(item.correlation),
                            backgroundColor: getCorrelationColor(item.correlation) + '20'
                          }}
                        >
                          {item.correlation}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`font-medium ${
                        item.lag === 'N/A' ? 'text-gray-400' :
                        item.lag > 0 ? 'text-green-600' :
                        item.lag < 0 ? 'text-red-600' :
                        'text-gray-600'
                      }`}>
                        {item.lag === 'N/A' ? 'N/A' :
                         item.lag > 0 ? `+${item.lag}d` :
                         item.lag === 0 ? '0d' :
                         `${item.lag}d`}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {item.relationship}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.dataPoints || 'N/A'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Heatmap View */}
      {viewType === 'heatmap' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAndSortedData.map((item) => {
            const isBenchmark = ['SPY', 'QQQ'].includes(item.code);
            const corrValue = parseFloat(item.correlation) || 0;
            const absCorr = Math.abs(corrValue);
            const betaValue = parseFloat(item.beta) || 0;

            return (
              <div
                key={item.code}
                className={`rounded-lg p-4 border-2 ${
                  isBenchmark ? 'border-blue-400' : 'border-gray-200'
                }`}
                style={{
                  backgroundColor: getCorrelationColor(item.correlation) + '15',
                  borderColor: getCorrelationColor(item.correlation)
                }}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <button
                      onClick={() => onStockCodeClick && onStockCodeClick(item.code)}
                      className="text-lg font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition-colors"
                      title={`Search for ${item.code}`}
                    >
                      {item.code}
                    </button>
                    <div className="text-xs text-gray-600 truncate max-w-[150px]">
                      {item.name}
                    </div>
                  </div>
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: getCorrelationColor(item.correlation) }}
                  />
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Beta:</span>
                    <span
                      className="font-semibold px-2 py-0.5 rounded text-xs"
                      style={{
                        color: getBetaColor(item.beta),
                        backgroundColor: getBetaColor(item.beta) + '25'
                      }}
                    >
                      {item.beta}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Corr:</span>
                    <span
                      className="font-semibold px-2 py-0.5 rounded text-xs"
                      style={{
                        color: getCorrelationColor(item.correlation),
                        backgroundColor: getCorrelationColor(item.correlation) + '25'
                      }}
                    >
                      {item.correlation}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600">Lag:</span>
                    <span className={`font-semibold ${
                      item.lag === 'N/A' ? 'text-gray-400' :
                      item.lag > 0 ? 'text-green-600' :
                      item.lag < 0 ? 'text-red-600' :
                      'text-gray-600'
                    }`}>
                      {item.lag === 'N/A' ? 'N/A' :
                       item.lag > 0 ? `+${item.lag}d` :
                       item.lag === 0 ? '0d' :
                       `${item.lag}d`}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-gray-300">
                    <div className="text-xs text-gray-700 font-medium">
                      {item.relationship}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer Note */}
      <div className="text-xs text-gray-500 text-center">
        Analysis based on historical price data.
        Positive lag indicates the comparison stock leads the selected stock.
      </div>
    </div>
  );
}
