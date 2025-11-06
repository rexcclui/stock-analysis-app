import React, { useState, useEffect } from 'react';
import { X, ArrowUp, ArrowDown, LineChart, ChevronLeft, ChevronRight } from 'lucide-react';
import SentimentChart from '../SentimentChart';
import { HeatmapView } from './HeatmapView';
import { LoadingState } from '../LoadingState';

const getColorForPerformance = (value) => {
  const numValue = parseFloat(value);
  if (isNaN(numValue)) return { backgroundColor: '#4B5563', color: 'white' };
  if (numValue >= 20) return { backgroundColor: '#10B981', color: 'white' };
  if (numValue >= 10) return { backgroundColor: '#059669', color: 'white' };
  if (numValue >= 5) return { backgroundColor: '#047857', color: 'white' };
  if (numValue >= 0) return { backgroundColor: '#065F46', color: 'white' };
  if (numValue >= -5) return { backgroundColor: '#7F1D1D', color: 'white' };
  if (numValue >= -10) return { backgroundColor: '#B91C1C', color: 'white' };
  if (numValue >= -20) return { backgroundColor: '#DC2626', color: 'white' };
  return { backgroundColor: '#EF4444', color: 'white' };
};

const getRatingStyle = (rating) => {
  const baseStyle = { padding: '0.25rem 0.5rem', borderRadius: '9999px', fontSize: '0.875rem', fontWeight: '500', border: '1px solid' };
  if (!rating) {
    return { ...baseStyle, backgroundColor: '#4B5563', color: '#D1D5DB', borderColor: '#6B7280' };
  }
  const lowerRating = rating.toLowerCase();
  if (lowerRating.includes('buy')) {
    return { ...baseStyle, backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#6EE7B7', borderColor: '#059669' };
  }
  if (lowerRating.includes('sell')) {
    return { ...baseStyle, backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#F87171', borderColor: '#B91C1C' };
  }
  if (lowerRating.includes('hold')) {
    return { ...baseStyle, backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#FBBF24', borderColor: '#D97706' };
  }
  return { ...baseStyle, backgroundColor: '#4B5563', color: '#D1D5DB', borderColor: '#6B7280' };
};

const getMarketCapValue = (marketCap) => {
  if (!marketCap || marketCap === 'N/A') return 0;
  const value = parseFloat(marketCap.replace(/[^0-9.]/g, ''));
  if (marketCap.includes('T')) return value * 1000;
  return value;
};

// Helper function to convert relationshipType to abbreviation
const getRelationshipTypeAbbr = (relationshipType) => {
  if (!relationshipType) return '-';
  const type = relationshipType.toLowerCase();
  if (type.includes('industry')) return 'I';
  if (type.includes('sector')) return 'S';
  if (type.includes('competitor')) return 'C';
  if (type.includes('co-held') || type.includes('etf')) return 'E';
  return '-';
};

export function ComparisonTable({
  selectedStock,
  comparisonStocks,
  comparisonType = 'industry',
  relationshipTypeFilter = 'all',
  comparisonRowSize = 30,
  periods,
  onRemoveComparison,
  viewMode,
  onViewModeChange,
  heatmapColorBy,
  heatmapSizeBy,
  onHeatmapColorByChange,
  onHeatmapSizeByChange,
  onStockCodeClick,
  onAddToChart,
  chartCompareStocks,
  loading = false
}) {
  const [colorMode, setColorMode] = useState('historical'); // 'historical' | 'relative'
  const [sentimentExpanded, setSentimentExpanded] = useState(false); // Start collapsed
  const [periodMode, setPeriodMode] = useState('accumulated'); // 'accumulated' | 'non-accumulated'
  const [nDays, setNDays] = useState(7); // Default N days for non-accumulated mode

  if (!comparisonStocks || comparisonStocks.length === 0) {
    if (loading) {
      return <LoadingState message="Loading comparison data..." className="mb-6" />;
    }
    return (
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 text-center text-gray-300" style={{ marginTop: '1rem' }}>
        No comparison data available.
      </div>
    );
  }

  // Filter comparison stocks based on relationship type
  let filteredComparisonStocks = comparisonStocks.filter(stock => {
    // SPY and QQQ are always shown (benchmarks)
    if (stock.code === 'SPY' || stock.code === 'QQQ') return true;

    // Filter based on relationshipTypeFilter
    if (relationshipTypeFilter === 'all') return true;

    if (!stock.relationshipType) return false;

    const type = stock.relationshipType.toLowerCase();
    if (relationshipTypeFilter === 'industry' && type.includes('industry')) return true;
    if (relationshipTypeFilter === 'sector' && type.includes('sector')) return true;
    if (relationshipTypeFilter === 'competitor' && type.includes('competitor')) return true;
    if (relationshipTypeFilter === 'etf' && (type.includes('co-held') || type.includes('etf'))) return true;

    return false;
  });

  // Separate benchmarks from other stocks for row size limiting
  const benchmarks = filteredComparisonStocks.filter(s => s.code === 'SPY' || s.code === 'QQQ');
  const nonBenchmarks = filteredComparisonStocks.filter(s => s.code !== 'SPY' && s.code !== 'QQQ');

  // Sort non-benchmarks by market cap (descending) and limit to comparisonRowSize
  const sortedLimitedNonBenchmarks = nonBenchmarks
    .sort((a, b) => getMarketCapValue(b.marketCap) - getMarketCapValue(a.marketCap))
    .slice(0, comparisonRowSize);

  // Combine benchmarks + limited sorted stocks
  filteredComparisonStocks = [...benchmarks, ...sortedLimitedNonBenchmarks];

  // Generate heading based on comparison type
  const comparisonHeading = 'Related Stocks Comparison';

  return (
    <div className="bg-gray-800 rounded-xl shadow-xl overflow-hidden border border-gray-700">
      <div className="flex items-center justify-between flex-wrap gap-4 px-6 py-4 bg-gray-900 border-b border-gray-700">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-lg font-semibold text-white">{comparisonHeading}</span>
          {viewMode === 'table' && (
            <div className="flex items-center gap-3">
              <div className="flex bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setPeriodMode('accumulated')}
                  className={`px-3 py-1 rounded-md text-sm font-semibold transition ${
                    periodMode === 'accumulated' ? 'bg-green-600 text-white shadow-lg' : 'text-gray-300 hover:text-white hover:bg-gray-600'
                  }`}
                  style={periodMode === 'accumulated' ? { backgroundColor: '#FBBF24', color: '#0ea5ff', boxShadow: '0 6px 12px rgba(0,0,0,0.06)' } : undefined}
                >Accumulated</button>
                <button
                  onClick={() => setPeriodMode('non-accumulated')}
                  className={`px-3 py-1 rounded-md text-sm font-semibold transition ${
                    periodMode === 'non-accumulated' ? 'bg-green-600 text-white shadow-lg' : 'text-gray-300 hover:text-white hover:bg-gray-600'
                  }`}
                  style={periodMode === 'non-accumulated' ? { backgroundColor: '#FBBF24', color: '#0ea5ff', boxShadow: '0 6px 12px rgba(0,0,0,0.06)' } : undefined}
                >Non-accumulated</button>
              </div>
              {periodMode === 'non-accumulated' && (
                <div className="flex items-center gap-2">
                  <label className="text-gray-300 text-sm">N days:</label>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={nDays}
                    onChange={(e) => setNDays(Math.max(1, Math.min(90, parseInt(e.target.value) || 7)))}
                    className="bg-gray-700 text-gray-200 text-sm rounded px-3 py-1 w-16 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-gray-300 text-sm">View:</span>
              <div className="flex bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => onViewModeChange('table')}
                  className={`px-3 py-1 rounded-md text-sm font-semibold transition ${
                    viewMode === 'table' ? 'bg-green-600 text-white shadow-lg' : 'text-gray-300 hover:text-white hover:bg-gray-600'
                  }`}
                  style={viewMode === 'table' ? { backgroundColor: '#FBBF24', color: '#0ea5ff', boxShadow: '0 6px 12px rgba(0,0,0,0.06)' } : undefined}
                >Table</button>
                <button
                  onClick={() => onViewModeChange('heatmap')}
                  className={`px-3 py-1 rounded-md text-sm font-semibold transition ${
                    viewMode === 'heatmap' ? 'bg-green-600 text-white shadow-lg' : 'text-gray-300 hover:text-white hover:bg-gray-600'
                  }`}
                  style={viewMode === 'heatmap' ? { backgroundColor: '#FBBF24', color: '#0ea5ff', boxShadow: '0 6px 12px rgba(0,0,0,0.06)' } : undefined}
                >Heatmap</button>
              </div>
          </div>
          {viewMode === 'table' && (
            <div className="flex items-center gap-2">
              <span className="text-gray-300 text-sm">Colorize:</span>
              <div className="flex bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setColorMode('historical')}
                  className={`px-3 py-1 rounded-md text-sm font-semibold transition ${colorMode === 'historical' ? 'bg-green-600 text-white shadow-lg' : 'text-gray-300 hover:text-white hover:bg-gray-600'}`}
                  style={colorMode === 'historical' ? { backgroundColor: '#FBBF24', color: '#0ea5ff', boxShadow: '0 6px 12px rgba(0,0,0,0.06)' } : undefined}
                  title="Historical: Colors based on absolute performance thresholds (green for gains, red for losses)"
                >Historical</button>
                <button
                  onClick={() => setColorMode('relative')}
                  className={`px-3 py-1 rounded-md text-sm font-semibold transition ${colorMode === 'relative' ? 'bg-green-600 text-white shadow-lg' : 'text-gray-300 hover:text-white hover:bg-gray-600'}`}
                  style={colorMode === 'relative' ? { backgroundColor: '#FBBF24', color: '#0ea5ff', boxShadow: '0 6px 12px rgba(0,0,0,0.06)' } : undefined}
                  title="Relative: Colors based on relative performance within the comparison group (green for best, red for worst)"
                >Relative</button>
              </div>
            </div>
          )}
          {viewMode === 'heatmap' && (
            <div className="flex items-center gap-6 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-gray-300 text-sm">Color by:</span>
                <select
                  value={heatmapColorBy}
                  onChange={(e) => onHeatmapColorByChange && onHeatmapColorByChange(e.target.value)}
                  className="bg-gray-700 text-gray-200 text-sm rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {periods.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-300 text-sm">Size by:</span>
                <select
                  value={heatmapSizeBy}
                  onChange={(e) => onHeatmapSizeByChange && onHeatmapSizeByChange(e.target.value)}
                  className="bg-gray-700 text-gray-200 text-sm rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {/* size options: performance periods OR fundamentals */}
                  <option value="marketCap">Market Cap</option>
                  <option value="pe">P/E</option>
                  {periods.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>
      {viewMode === 'table' ? (
        <>
          <div className="px-6 py-3 bg-gray-800/50 border-b border-gray-700">
            <p style={{ fontSize: '11px', fontStyle: 'italic', color: '#9CA3AF' }}>
              <strong style={{ fontStyle: 'normal' }}>Type:</strong> I = Industry, S = Sector, C = Competitor, E = ETF (Co-held)
            </p>
          </div>
          <TableView
            selectedStock={selectedStock}
            comparisonStocks={filteredComparisonStocks}
            periods={periods}
            onRemoveComparison={onRemoveComparison}
            onStockCodeClick={onStockCodeClick}
            onAddToChart={onAddToChart}
            chartCompareStocks={chartCompareStocks}
            colorMode={colorMode}
            setColorMode={setColorMode}
            sentimentExpanded={sentimentExpanded}
            setSentimentExpanded={setSentimentExpanded}
            periodMode={periodMode}
            nDays={nDays}
          />
        </>
      ) : (
        <HeatmapView
          selectedStock={selectedStock}
          comparisonStocks={comparisonStocks}
          heatmapColorBy={heatmapColorBy}
          heatmapSizeBy={heatmapSizeBy}
          onRemoveComparison={onRemoveComparison}
          onStockCodeClick={onStockCodeClick}
          onAddToChart={onAddToChart}
          chartCompareStocks={chartCompareStocks}
          loading={!selectedStock || !selectedStock.performance}
        />
      )}
      
      {/* Controls moved to header; heatmap-specific controls could be repositioned later if needed */}
    </div>
  );
}

// Lifted out to avoid recreation warnings
const SortIcon = ({ active, direction }) => {
  if (!active) return null;
  return direction === 'asc'
    ? <ArrowUp size={14} className="inline ml-1" />
    : <ArrowDown size={14} className="inline ml-1" />;
};

function TableView({ selectedStock, comparisonStocks, periods, onRemoveComparison, onStockCodeClick, onAddToChart, chartCompareStocks, colorMode, sentimentExpanded, setSentimentExpanded, periodMode, nDays }) {
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');

  // Helper function to calculate N-day period performance
  const calculateNDayPeriods = (stock, n) => {
    const historical = stock?.chartData?.fullHistorical;
    if (!historical || !Array.isArray(historical) || historical.length === 0) {
      return Array(8).fill(0);
    }

    const periods = [];
    for (let i = 0; i < 8; i++) {
      const startIdx = i * n;
      const endIdx = (i + 1) * n;

      if (startIdx >= historical.length) {
        periods.push(0);
        continue;
      }

      // Get prices at the boundaries
      // Note: fullHistorical is ordered oldest to newest (already reversed in API)
      // We need to look from the end (most recent)
      const recentIdx = historical.length - 1 - startIdx;
      const pastIdx = historical.length - 1 - endIdx;

      if (recentIdx < 0 || pastIdx < 0 || recentIdx >= historical.length) {
        periods.push(0);
        continue;
      }

      const recentPrice = historical[recentIdx]?.price;
      const pastPrice = pastIdx >= 0 ? historical[pastIdx]?.price : null;

      if (recentPrice && pastPrice && pastPrice !== 0) {
        const change = ((recentPrice - pastPrice) / pastPrice) * 100;
        periods.push(parseFloat(change.toFixed(2)));
      } else {
        periods.push(0);
      }
    }

    return periods;
  };

  // Detect mobile device and set initial name column state
  const [nameExpanded, setNameExpanded] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth > 768; // Collapsed on mobile (<=768px), expanded on desktop
    }
    return true; // Default to expanded for SSR
  });

  // Fundamentals columns (Market Cap to Rating) - expanded by default for all platforms
  const [fundamentalsExpanded, setFundamentalsExpanded] = useState(true);

  // Update nameExpanded on window resize
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth <= 768;
      setNameExpanded(!isMobile);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortValue = (stock, column) => {
    if (column === 'code') return stock.code;
    if (column === 'name') return stock.name;
    if (column === 'marketCap') return getMarketCapValue(stock.marketCap);
    if (column === 'pe') return parseFloat(stock.pe) || 0;
    if (column === 'beta') return parseFloat(stock.beta) || 0;
    if (column === 'dividendYield') {
      const raw = typeof stock.dividendYield === 'string' ? stock.dividendYield.replace('%','') : stock.dividendYield;
      return parseFloat(raw) || 0;
    }
    if (column === 'rating') return stock.analystRating;
    if (periods.includes(column)) return stock.performance[column];
    // Handle non-accumulated period columns (period-0, period-1, etc.)
    if (column.startsWith('period-')) {
      const periodIndex = parseInt(column.split('-')[1]);
      const nDayPeriodsData = calculateNDayPeriods(stock, nDays);
      return nDayPeriodsData[periodIndex] || 0;
    }
    return 0;
  };

  // Separate benchmark stocks (SPY, QQQ) from others
  const benchmarkStocks = comparisonStocks.filter(s => s.code === 'SPY' || s.code === 'QQQ');
  const otherStocks = comparisonStocks.filter(s => s.code !== 'SPY' && s.code !== 'QQQ');

  // Sort benchmark stocks in fixed order (SPY first, then QQQ)
  const sortedBenchmarks = benchmarkStocks.sort((a, b) => {
    if (a.code === 'SPY') return -1;
    if (b.code === 'SPY') return 1;
    return 0;
  });

  // Sort other stocks normally
  const sortedOthers = [...otherStocks].sort((a, b) => {
    if (!sortColumn) return 0;

    const aValue = getSortValue(a, sortColumn);
    const bValue = getSortValue(b, sortColumn);

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    return sortDirection === 'asc'
      ? aValue - bValue
      : bValue - aValue;
  });

  // Benchmarks always at top, followed by sorted others
  const sortedComparisonStocks = [...sortedBenchmarks, ...sortedOthers];

  const isActive = (col) => sortColumn === col;

  const lerpColor = (c1, c2, t) => {
    const hexToRgb = h => h.match(/.{2}/g).map(x => parseInt(x, 16));
    const [r1,g1,b1] = hexToRgb(c1);
    const [r2,g2,b2] = hexToRgb(c2);
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    return `rgb(${r}, ${g}, ${b})`;
  };

  // Collect all Market Cap numeric values
  const allMarketCapValues = [selectedStock, ...comparisonStocks]
    .map(s => getMarketCapValue(s.marketCap))
    .filter(v => v > 0);
  const minMarketCap = allMarketCapValues.length ? Math.min(...allMarketCapValues) : null;
  const maxMarketCap = allMarketCapValues.length ? Math.max(...allMarketCapValues) : null;

  const getMarketCapCellStyle = (marketCap) => {
    const numericCap = getMarketCapValue(marketCap);
    const baseStyle = { color: 'white', borderRadius: '0.5rem', padding: '0.5rem', textAlign: 'right', fontWeight: '600' };
    if (isNaN(numericCap) || numericCap <= 0 || minMarketCap === null || maxMarketCap === null || minMarketCap === maxMarketCap) {
      return { ...baseStyle, backgroundColor: '#4B5563' };
    }
    // Normalize 0..1
    const ratio = (numericCap - minMarketCap) / (maxMarketCap - minMarketCap);
    // Interpolate between light blue (e.g., blue-200: 90cdf4) and deep blue (e.g., blue-900: 2c5282)
    const bg = lerpColor('90cdf4', '1e3a8a', ratio);
    return { ...baseStyle, backgroundColor: bg };
  };

  // Collect all P/E numeric values (exclude non-numeric and dash)
  const allPeValues = [selectedStock, ...comparisonStocks]
    .map(s => parseFloat(s.pe))
    .filter(v => !isNaN(v) && v > 0);
  const minPe = allPeValues.length ? Math.min(...allPeValues) : null;
  const maxPe = allPeValues.length ? Math.max(...allPeValues) : null;

  const getPeCellStyle = (pe) => {
    const numericPe = parseFloat(pe);
    if (isNaN(numericPe) || numericPe <= 0 || minPe === null || maxPe === null || minPe === maxPe) {
      return { backgroundColor: '#4B5563', color: 'white', borderRadius: '0.5rem', padding: '0.5rem', textAlign: 'right', fontWeight: '600' };
    }
    // Normalize 0..1
    const ratio = (numericPe - minPe) / (maxPe - minPe);
    // Interpolate between blue (#1d4ed8) and red (#dc2626)
    const bg = lerpColor('1d4ed8', 'dc2626', ratio);
    return { backgroundColor: bg, color: 'white', borderRadius: '0.5rem', padding: '0.5rem', textAlign: 'right', fontWeight: '600' };
  };

  // Beta gradient (light blue -> deep blue)
  const allBetaValues = [selectedStock, ...comparisonStocks]
    .map(s => parseFloat(s.beta))
    .filter(v => !isNaN(v) && v > 0);
  const minBeta = allBetaValues.length ? Math.min(...allBetaValues) : null;
  const maxBeta = allBetaValues.length ? Math.max(...allBetaValues) : null;

  const getBetaCellStyle = (beta) => {
    const numeric = parseFloat(beta);
    const base = { color: 'white', borderRadius: '0.5rem', padding: '0.5rem', fontWeight: '600', textAlign: 'right' };
    if (isNaN(numeric)) {
      return { ...base, backgroundColor: '#4B5563' };
    }
    // Negative beta: light red (fa8072 / salmon) to deep red (7f1d1d).
    if (numeric < 0) {
      // Cap extreme negatives for gradient scaling
      const capped = Math.max(numeric, -3); // assume -3 is very negative
      const ratioNeg = Math.abs(capped) / 3; // 0 at 0, 1 at -3
      const negBg = lerpColor('fa8072', '7f1d1d', ratioNeg); // salmon to dark red
      return { ...base, backgroundColor: negBg };
    }
    // Zero or near zero positive: treat as gray base
    if (numeric === 0 || minBeta === null || maxBeta === null || minBeta === maxBeta) {
      return { ...base, backgroundColor: '#4B5563' };
    }
    // Positive gradient light blue -> deep blue
    const ratio = (numeric - minBeta) / (maxBeta - minBeta);
    const bg = lerpColor('90cdf4', '1e3a8a', ratio);
    return { ...base, backgroundColor: bg };
  };

  // Dividend yield gradient (light blue -> deep blue)
  const dividendToNumber = (val) => {
    if (typeof val !== 'string') return NaN;
    const cleaned = val.replace('%','');
    const num = parseFloat(cleaned);
    return isNaN(num) ? NaN : num;
  };
  const allDividendValues = [selectedStock, ...comparisonStocks]
    .map(s => dividendToNumber(s.dividendYield))
    .filter(v => !isNaN(v) && v > 0);
  const minDiv = allDividendValues.length ? Math.min(...allDividendValues) : null;
  const maxDiv = allDividendValues.length ? Math.max(...allDividendValues) : null;

  const getDividendCellStyle = (divYield) => {
    const numeric = dividendToNumber(divYield);
    const base = { color: 'white', borderRadius: '0.5rem', padding: '0.5rem', fontWeight: '600', textAlign: 'right' };
    if (isNaN(numeric) || numeric <= 0 || minDiv === null || maxDiv === null || minDiv === maxDiv) {
      return { ...base, backgroundColor: '#4B5563' };
    }
    const ratio = (numeric - minDiv) / (maxDiv - minDiv);
    const bg = lerpColor('90cdf4', '1e3a8a', ratio);
    return { ...base, backgroundColor: bg };
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-900 text-white">
          <tr>
            <th
              className="px-4 py-3 text-left cursor-pointer hover:bg-gray-800 transition"
              onClick={() => handleSort('code')}
            >
              Code <SortIcon active={isActive('code')} direction={sortDirection} />
            </th>
            <th className="px-2 py-3 text-center" style={{width:'50px', minWidth:'50px'}}>
            </th>
            <th
              className="px-2 py-3 text-left hover:bg-gray-800 transition"
              style={{width: nameExpanded ? '160px' : '50px', minWidth: nameExpanded ? '160px' : '50px'}}
            >
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setNameExpanded(!nameExpanded)}
                  className="p-1 hover:bg-gray-700 rounded transition"
                  title={nameExpanded ? "Click to collapse Name column" : "Click to expand Name column"}
                >
                  {nameExpanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                </button>
                {nameExpanded && (
                  <span
                    className="inline-block truncate cursor-pointer"
                    onClick={() => handleSort('name')}
                  >
                    Name <SortIcon active={isActive('name')} direction={sortDirection} />
                  </span>
                )}
              </div>
            </th>
            {nameExpanded && (
              <th className="px-2 py-3 text-center" style={{width:'50px', minWidth:'50px'}}>
                Type
              </th>
            )}
            {fundamentalsExpanded ? (
              <>
                <th
                  className="px-4 py-3 text-right hover:bg-gray-800 transition"
                >
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => setFundamentalsExpanded(!fundamentalsExpanded)}
                      className="p-1 hover:bg-gray-700 rounded transition"
                      title="Click to collapse fundamentals columns"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span
                      className="cursor-pointer"
                      onClick={() => handleSort('marketCap')}
                    >
                      Market Cap <SortIcon active={isActive('marketCap')} direction={sortDirection} />
                    </span>
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-right cursor-pointer hover:bg-gray-800 transition"
                  onClick={() => handleSort('beta')}
                >
                  Beta <SortIcon active={isActive('beta')} direction={sortDirection} />
                </th>
                <th
                  className="px-4 py-3 text-right cursor-pointer hover:bg-gray-800 transition"
                  onClick={() => handleSort('pe')}
                >
                  P/E <SortIcon active={isActive('pe')} direction={sortDirection} />
                </th>
                <th
                  className="px-4 py-3 text-right cursor-pointer hover:bg-gray-800 transition"
                  onClick={() => handleSort('dividendYield')}
                >
                  Dividend <SortIcon active={isActive('dividendYield')} direction={sortDirection} />
                </th>
                <th
                  className="px-4 py-3 text-center cursor-pointer hover:bg-gray-800 transition"
                  onClick={() => handleSort('rating')}
                >
                  Rating <SortIcon active={isActive('rating')} direction={sortDirection} />
                </th>
              </>
            ) : (
              <th className="px-2 py-3 text-center" style={{width:'50px', minWidth:'50px'}}>
                <button
                  onClick={() => setFundamentalsExpanded(!fundamentalsExpanded)}
                  className="p-1 hover:bg-gray-700 rounded transition"
                  title="Click to expand fundamentals columns"
                >
                  <ChevronRight size={16} />
                </button>
              </th>
            )}
            <th
              className="px-2 py-3 text-center cursor-pointer hover:bg-gray-800 transition"
              style={{width: sentimentExpanded ? '90px' : '30px', minWidth: sentimentExpanded ? '90px' : '30px'}}
              onClick={() => setSentimentExpanded(!sentimentExpanded)}
              title={sentimentExpanded ? "Click to collapse" : "Click to expand sentiment"}
            >
              {sentimentExpanded ? 'Sentiment (1M)' : '📊'}
            </th>
            {periodMode === 'accumulated' ? (
              periods.map(period => (
                <th
                  key={period}
                  className="px-2 py-3 text-center cursor-pointer hover:bg-gray-800 transition"
                  style={{width:'90px', minWidth:'90px'}}
                  onClick={() => handleSort(period)}
                >
                  {period} <SortIcon active={isActive(period)} direction={sortDirection} />
                </th>
              ))
            ) : (
              Array.from({ length: 8 }, (_, i) => {
                const end = (i + 1) * nDays;
                const label = `-${end}D`;
                return (
                  <th
                    key={`period-${i}`}
                    className="px-2 py-3 text-center cursor-pointer hover:bg-gray-800 transition"
                    style={{width:'90px', minWidth:'90px'}}
                    onClick={() => handleSort(`period-${i}`)}
                  >
                    {label} <SortIcon active={isActive(`period-${i}`)} direction={sortDirection} />
                  </th>
                );
              })
            )}
            <th className="px-4 py-3 text-center">Action</th>
          </tr>
        </thead>
        <tbody>
          <tr className="bg-blue-900/30 border-b-2 border-blue-700">
            <td className="px-4 py-3 font-bold text-white">
              <span
                onClick={() => onStockCodeClick && onStockCodeClick(selectedStock.code)}
                role="link"
                tabIndex={0}
                className="text-yellow-400 hover:text-yellow-600 underline decoration-dotted cursor-pointer focus:outline-none focus:ring-2 focus:ring-yellow-500 rounded"
              >
                {selectedStock.code}
              </span>
            </td>
            <td className="px-2 py-3 text-center" style={{width:'50px', minWidth:'50px'}}>
              {onAddToChart && (() => {
                const isInChart = chartCompareStocks?.find(s => s.code === selectedStock.code);
                return (
                  <button
                    onClick={() => onAddToChart(selectedStock.code)}
                    className={`p-1 rounded transition`}
                    title={isInChart ? "Remove from chart" : "Add to chart"}
                  >
                    <LineChart size={16} fill={isInChart ? "currentColor" : "none"} className={isInChart ? 'text-green-400' : 'text-blue-400'} />
                  </button>
                );
              })()}
            </td>
            <td className="px-2 py-3 font-medium text-white" style={{width: nameExpanded ? '160px' : '50px', maxWidth: nameExpanded ? '160px' : '50px'}}>
              {nameExpanded ? (
                selectedStock.website ? (
                  <a href={selectedStock.website} target="_blank" rel="noopener noreferrer" className="text-yellow-400 hover:text-yellow-600 underline decoration-dotted cursor-pointer focus:outline-none focus:ring-2 focus:ring-yellow-500 rounded block truncate" style={{ color: '#FBBF24' }} title={selectedStock.name}>
                    {selectedStock.name}
                  </a>
                ) : (
                  <span
                    onClick={() => onStockCodeClick && onStockCodeClick(selectedStock.code)}
                    role="link"
                    tabIndex={0}
                    className="text-yellow-400 hover:text-yellow-600 underline decoration-dotted cursor-pointer focus:outline-none focus:ring-2 focus:ring-yellow-500 rounded block truncate"
                    title={selectedStock.name}
                  >{selectedStock.name}</span>
                )
              ) : (
                <span className="text-gray-400 text-xs text-center block" title={selectedStock.name}>•</span>
              )}
            </td>
            {nameExpanded && (
              <td className="px-2 py-3 text-center text-gray-400" style={{width:'50px', minWidth:'50px'}}>-</td>
            )}
            {fundamentalsExpanded ? (
              <>
                <td className="px-4 py-3">
                  <div style={getMarketCapCellStyle(selectedStock.marketCap)}>
                    ${selectedStock.marketCap}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <div style={getBetaCellStyle(selectedStock.beta)}>
                    {selectedStock.beta || 'N/A'}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div style={getPeCellStyle(selectedStock.pe)}>
                    {selectedStock.pe === '—' ? '—' : selectedStock.pe}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <div style={getDividendCellStyle(selectedStock.dividendYield)}>
                    {selectedStock.dividendYield}
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <span style={getRatingStyle(selectedStock.analystRating)}>
                    {selectedStock.analystRating}
                  </span>
                </td>
              </>
            ) : (
              <td className="px-2 py-3 text-center text-gray-400" style={{width:'50px', minWidth:'50px'}}>•</td>
            )}
            <td className="px-2 py-3 text-center" style={{width: sentimentExpanded ? '90px' : '30px', minWidth: sentimentExpanded ? '90px' : '30px'}}>
              {sentimentExpanded ? (
                <div className="mx-auto" style={{width:'84px'}}>
                  <SentimentChart data={selectedStock.sentimentTimeSeries} />
                </div>
              ) : (
                <span className="text-xs">📊</span>
              )}
            </td>
            {periodMode === 'accumulated' ? (
              periods.map(period => {
                const basePerf = selectedStock.performance[period];
                // Relative mode: compute min/max across all stocks (primary + comparisons) for this period
                let styleObj = getColorForPerformance(basePerf);
                if (colorMode === 'relative') {
                  const allValues = [selectedStock, ...comparisonStocks].map(s => s.performance[period]);
                  const min = Math.min(...allValues);
                  const max = Math.max(...allValues);
                  // Map value to 0..1
                  const ratio = max === min ? 0.5 : (basePerf - min) / (max - min);
                  // Interpolate green (best) to red (worst)
                  const lerp = (hex1, hex2, t) => {
                    const toRgb = h => h.match(/.{2}/g).map(x => parseInt(x,16));
                    const [r1,g1,b1] = toRgb(hex1);
                    const [r2,g2,b2] = toRgb(hex2);
                    const r = Math.round(r1 + (r2 - r1) * t);
                    const g = Math.round(g1 + (g2 - g1) * t);
                    const b = Math.round(b1 + (b2 - b1) * t);
                    return `rgb(${r}, ${g}, ${b})`;
                  };
                  styleObj = { backgroundColor: lerp('10b981','ef4444', 1 - ratio), color:'white' };
                }
                return (
                  <td key={period} className="px-2 py-3 text-center" style={{width:'90px', minWidth:'90px'}}>
                    <div style={{
                      ...styleObj,
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      textAlign: 'center',
                      fontWeight: 'bold',
                      marginBottom: '0.25rem'
                    }}>
                      {basePerf > 0 ? '+' : ''}{basePerf.toFixed(1)}%
                    </div>
                  </td>
                );
              })
            ) : (
              (() => {
                const nDayPeriodsData = calculateNDayPeriods(selectedStock, nDays);
                return nDayPeriodsData.map((value, i) => {
                  let styleObj = getColorForPerformance(value);
                  if (colorMode === 'relative') {
                    // Collect all values for this period index across all stocks
                    const allValues = [
                      value,
                      ...comparisonStocks.map(s => calculateNDayPeriods(s, nDays)[i])
                    ];
                    const min = Math.min(...allValues);
                    const max = Math.max(...allValues);
                    const ratio = max === min ? 0.5 : (value - min) / (max - min);
                    const lerp = (hex1, hex2, t) => {
                      const toRgb = h => h.match(/.{2}/g).map(x => parseInt(x,16));
                      const [r1,g1,b1] = toRgb(hex1);
                      const [r2,g2,b2] = toRgb(hex2);
                      const r = Math.round(r1 + (r2 - r1) * t);
                      const g = Math.round(g1 + (g2 - g1) * t);
                      const b = Math.round(b1 + (b2 - b1) * t);
                      return `rgb(${r}, ${g}, ${b})`;
                    };
                    styleObj = { backgroundColor: lerp('10b981','ef4444', 1 - ratio), color:'white' };
                  }
                  return (
                    <td key={`period-${i}`} className="px-2 py-3 text-center" style={{width:'90px', minWidth:'90px'}}>
                      <div style={{
                        ...styleObj,
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        textAlign: 'center',
                        fontWeight: 'bold',
                        marginBottom: '0.25rem'
                      }}>
                        {value > 0 ? '+' : ''}{value.toFixed(1)}%
                      </div>
                    </td>
                  );
                });
              })()
            )}
            <td className="px-4 py-3 text-center text-gray-400">-</td>
          </tr>
          {sortedComparisonStocks.map((stock, idx) => (
            <tr key={stock.code} className={idx % 2 === 0 ? 'bg-gray-700/50' : 'bg-gray-800/50'}>
              <td className="px-4 py-3 font-medium text-white">
                <span
                  onClick={() => onStockCodeClick && onStockCodeClick(stock.code)}
                  role="link"
                  tabIndex={0}
                  className="text-yellow-400 hover:text-yellow-600 underline decoration-dotted cursor-pointer focus:outline-none focus:ring-2 focus:ring-yellow-500 rounded"
                >
                  {stock.code}
                </span>
              </td>
              <td className="px-2 py-3 text-center" style={{width:'50px', minWidth:'50px'}}>
                {onAddToChart && (() => {
                  const isInChart = chartCompareStocks?.find(s => s.code === stock.code);
                  return (
                    <button
                      onClick={() => onAddToChart(stock.code)}
                      className={`p-1 rounded transition`}
                      title={isInChart ? "Remove from chart" : "Add to chart"}
                    >
                      <LineChart size={16} fill={isInChart ? "currentColor" : "none"} className={isInChart ? 'text-green-400' : 'text-blue-400'} />
                    </button>
                  );
                })()}
              </td>
              <td className="px-2 py-3 text-gray-200" style={{width: nameExpanded ? '160px' : '50px', maxWidth: nameExpanded ? '160px' : '50px'}}>
                {nameExpanded ? (
                  stock.website ? (
                    <a href={stock.website} target="_blank" rel="noopener noreferrer" className="text-yellow-400 hover:text-yellow-600 underline decoration-dotted cursor-pointer focus:outline-none focus:ring-2 focus:ring-yellow-500 rounded block truncate" style={{ color: '#FBBF24' }} title={stock.name}>
                      {stock.name}
                    </a>
                  ) : (
                    <span
                      onClick={() => onStockCodeClick && onStockCodeClick(stock.code)}
                      role="link"
                      tabIndex={0}
                      className="text-yellow-400 hover:text-yellow-600 underline decoration-dotted cursor-pointer focus:outline-none focus:ring-2 focus:ring-yellow-500 rounded block truncate"
                      title={stock.name}
                    >{stock.name}</span>
                  )
                ) : (
                  <span className="text-gray-400 text-xs text-center block" title={stock.name}>•</span>
                )}
              </td>
              {nameExpanded && (
                <td className="px-2 py-3 text-center text-gray-200" style={{width:'50px', minWidth:'50px'}}>
                  {getRelationshipTypeAbbr(stock.relationshipType)}
                </td>
              )}
              {fundamentalsExpanded ? (
                <>
                  <td className="px-4 py-3">
                    <div style={getMarketCapCellStyle(stock.marketCap)}>
                      ${stock.marketCap}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div style={getBetaCellStyle(stock.beta)}>
                      {stock.beta || 'N/A'}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div style={getPeCellStyle(stock.pe)}>
                      {stock.pe === '—' ? '—' : stock.pe}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div style={getDividendCellStyle(stock.dividendYield)}>
                      {stock.dividendYield}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span style={getRatingStyle(stock.analystRating)}>
                      {stock.analystRating}
                    </span>
                  </td>
                </>
              ) : (
                <td className="px-2 py-3 text-center text-gray-400" style={{width:'50px', minWidth:'50px'}}>•</td>
              )}
              <td className="px-2 py-3 text-center" style={{width: sentimentExpanded ? '90px' : '30px', minWidth: sentimentExpanded ? '90px' : '30px'}}>
                {sentimentExpanded ? (
                  <div className="mx-auto" style={{width:'84px'}}>
                    <SentimentChart data={stock.sentimentTimeSeries} />
                  </div>
                ) : (
                  <span className="text-xs">📊</span>
                )}
              </td>
              {periodMode === 'accumulated' ? (
                periods.map(period => {
                  const value = stock.performance[period];
                  let styleObj = getColorForPerformance(value);
                  if (colorMode === 'relative') {
                    const allValues = [selectedStock, ...comparisonStocks].map(s => s.performance[period]);
                    const min = Math.min(...allValues);
                    const max = Math.max(...allValues);
                    const ratio = max === min ? 0.5 : (value - min) / (max - min);
                    const lerp = (hex1, hex2, t) => {
                      const toRgb = h => h.match(/.{2}/g).map(x => parseInt(x,16));
                      const [r1,g1,b1] = toRgb(hex1);
                      const [r2,g2,b2] = toRgb(hex2);
                      const r = Math.round(r1 + (r2 - r1) * t);
                      const g = Math.round(g1 + (g2 - g1) * t);
                      const b = Math.round(b1 + (b2 - b1) * t);
                      return `rgb(${r}, ${g}, ${b})`;
                    };
                    styleObj = { backgroundColor: lerp('10b981','ef4444', 1 - ratio), color:'white' };
                  }
                  return (
                    <td key={period} className="px-2 py-3 text-center" style={{width:'90px', minWidth:'90px'}}>
                      <div style={{
                        ...styleObj,
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        textAlign: 'center',
                        fontWeight: 'bold',
                        marginBottom: '0.25rem'
                      }}>
                        {value > 0 ? '+' : ''}{value.toFixed(1)}%
                      </div>
                    </td>
                  );
                })
              ) : (
                (() => {
                  const nDayPeriodsData = calculateNDayPeriods(stock, nDays);
                  return nDayPeriodsData.map((value, i) => {
                    let styleObj = getColorForPerformance(value);
                    if (colorMode === 'relative') {
                      // Collect all values for this period index across all stocks
                      const allValues = [
                        calculateNDayPeriods(selectedStock, nDays)[i],
                        ...comparisonStocks.map(s => calculateNDayPeriods(s, nDays)[i])
                      ];
                      const min = Math.min(...allValues);
                      const max = Math.max(...allValues);
                      const ratio = max === min ? 0.5 : (value - min) / (max - min);
                      const lerp = (hex1, hex2, t) => {
                        const toRgb = h => h.match(/.{2}/g).map(x => parseInt(x,16));
                        const [r1,g1,b1] = toRgb(hex1);
                        const [r2,g2,b2] = toRgb(hex2);
                        const r = Math.round(r1 + (r2 - r1) * t);
                        const g = Math.round(g1 + (g2 - g1) * t);
                        const b = Math.round(b1 + (b2 - b1) * t);
                        return `rgb(${r}, ${g}, ${b})`;
                      };
                      styleObj = { backgroundColor: lerp('10b981','ef4444', 1 - ratio), color:'white' };
                    }
                    return (
                      <td key={`period-${i}`} className="px-2 py-3 text-center" style={{width:'90px', minWidth:'90px'}}>
                        <div style={{
                          ...styleObj,
                          padding: '0.75rem',
                          borderRadius: '0.5rem',
                          textAlign: 'center',
                          fontWeight: 'bold',
                          marginBottom: '0.25rem'
                        }}>
                          {value > 0 ? '+' : ''}{value.toFixed(1)}%
                        </div>
                      </td>
                    );
                  });
                })()
              )}
              <td className="px-4 py-3 text-center">
                {stock.code !== 'SPY' && stock.code !== 'QQQ' ? (
                  <button
                    onClick={() => onRemoveComparison(stock.code)}
                    className="p-1 text-red-400 hover:bg-red-900/30 rounded transition"
                  >
                    <X size={18} />
                  </button>
                ) : (
                  <span className="text-gray-600 text-xs">Benchmark</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
