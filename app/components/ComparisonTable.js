import React, { useState } from 'react';
import { X, ArrowUp, ArrowDown } from 'lucide-react';
import SentimentChart from './SentimentChart';

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

const getHeatmapColor = (value) => {
  if (value >= 20) return '#10b981';
  if (value >= 10) return '#22c55e';
  if (value >= 5) return '#84cc16';
  if (value >= 0) return '#eab308';
  if (value >= -5) return '#f97316';
  if (value >= -10) return '#ef4444';
  if (value >= -20) return '#dc2626';
  return '#991b1b';
};

export function ComparisonTable({ 
  selectedStock, 
  comparisonStocks, 
  periods, 
  onRemoveComparison,
  viewMode,
  onViewModeChange,
  heatmapColorBy,
  heatmapSizeBy,
  onHeatmapColorByChange,
  onHeatmapSizeByChange,
  onStockCodeClick
}) {
  const [colorMode, setColorMode] = useState('historical'); // 'historical' | 'relative'
  return (
    <div className="bg-gray-800 rounded-xl shadow-xl overflow-hidden border border-gray-700">
      <div className="flex items-center justify-between flex-wrap gap-4 px-6 py-4 bg-gray-900 border-b border-gray-700">
        <span className="text-lg font-semibold text-white">Industry Comparison</span>
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-gray-300 text-sm">View:</span>
            <div className="flex bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => onViewModeChange('table')}
                className={`px-3 py-1 rounded-md text-sm transition ${
                  viewMode === 'table' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'
                }`}
              >Table</button>
              <button
                onClick={() => onViewModeChange('heatmap')}
                className={`px-3 py-1 rounded-md text-sm transition ${
                  viewMode === 'heatmap' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'
                }`}
              >Heatmap</button>
            </div>
          </div>
          {viewMode === 'table' && (
            <div className="flex items-center gap-2">
              <span className="text-gray-300 text-sm">Colorize:</span>
              <div className="flex bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setColorMode('historical')}
                  className={`px-3 py-1 rounded-md text-sm transition ${colorMode === 'historical' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'}`}
                >Historical</button>
                <button
                  onClick={() => setColorMode('relative')}
                  className={`px-3 py-1 rounded-md text-sm transition ${colorMode === 'relative' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'}`}
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
        <TableView
          selectedStock={selectedStock}
          comparisonStocks={comparisonStocks}
          periods={periods}
          onRemoveComparison={onRemoveComparison}
          onStockCodeClick={onStockCodeClick}
          colorMode={colorMode}
          setColorMode={setColorMode}
        />
      ) : (
        <HeatmapView
          selectedStock={selectedStock}
          comparisonStocks={comparisonStocks}
          heatmapColorBy={heatmapColorBy}
          heatmapSizeBy={heatmapSizeBy}
          onRemoveComparison={onRemoveComparison}
          onStockCodeClick={onStockCodeClick}
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

function TableView({ selectedStock, comparisonStocks, periods, onRemoveComparison, onStockCodeClick, colorMode }) {
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');

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
    if (column === 'rating') return stock.analystRating;
    if (periods.includes(column)) return stock.performance[column];
    return 0;
  };

  const sortedComparisonStocks = [...comparisonStocks].sort((a, b) => {
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
            <th
              className="px-2 py-3 text-left cursor-pointer hover:bg-gray-800 transition max-w-[160px]"
              onClick={() => handleSort('name')}
              style={{width:'160px'}}
            >
              <span className="inline-block truncate max-w-[140px] align-middle">Name</span> <SortIcon active={isActive('name')} direction={sortDirection} />
            </th>
            <th
              className="px-4 py-3 text-right cursor-pointer hover:bg-gray-800 transition"
              onClick={() => handleSort('marketCap')}
            >
              Market Cap <SortIcon active={isActive('marketCap')} direction={sortDirection} />
            </th>
            <th
              className="px-4 py-3 text-right cursor-pointer hover:bg-gray-800 transition"
              onClick={() => handleSort('pe')}
            >
              P/E <SortIcon active={isActive('pe')} direction={sortDirection} />
            </th>
            <th
              className="px-4 py-3 text-center cursor-pointer hover:bg-gray-800 transition"
              onClick={() => handleSort('rating')}
            >
              Rating <SortIcon active={isActive('rating')} direction={sortDirection} />
            </th>
            <th className="px-4 py-3 text-center">Sentiment (1M)</th>
            {periods.map(period => (
              <th
                key={period}
                className="px-4 py-3 text-center cursor-pointer hover:bg-gray-800 transition"
                onClick={() => handleSort(period)}
              >
                {period} <SortIcon active={isActive(period)} direction={sortDirection} />
              </th>
            ))}
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
            <td className="px-2 py-3 font-medium text-white max-w-[160px]" style={{width:'160px'}}>
              {selectedStock.website ? (
                <a href={selectedStock.website} target="_blank" rel="noopener noreferrer" className="text-yellow-400 hover:text-yellow-600 underline decoration-dotted cursor-pointer focus:outline-none focus:ring-2 focus:ring-yellow-500 rounded block truncate" title={selectedStock.name}>
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
              )}
            </td>
            <td className="px-4 py-3">
              <div style={getMarketCapCellStyle(selectedStock.marketCap)}>
                ${selectedStock.marketCap}
              </div>
            </td>
            <td className="px-4 py-3">
              <div style={getPeCellStyle(selectedStock.pe)}>
                {selectedStock.pe === '—' ? '—' : selectedStock.pe}
              </div>
            </td>
            <td className="px-4 py-3 text-center">
              <span style={getRatingStyle(selectedStock.analystRating)}>
                {selectedStock.analystRating}
              </span>
            </td>
            <td className="px-4 py-3">
              <SentimentChart data={selectedStock.sentimentTimeSeries} />
            </td>
            {periods.map(period => {
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
                <td key={period} className="px-2 py-3">
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
            })}
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
              <td className="px-2 py-3 text-gray-200 max-w-[160px]" style={{width:'160px'}}>
                {stock.website ? (
                  <a href={stock.website} target="_blank" rel="noopener noreferrer" className="text-yellow-400 hover:text-yellow-600 underline decoration-dotted cursor-pointer focus:outline-none focus:ring-2 focus:ring-yellow-500 rounded block truncate" title={stock.name}>
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
                )}
              </td>
              <td className="px-4 py-3">
                <div style={getMarketCapCellStyle(stock.marketCap)}>
                  ${stock.marketCap}
                </div>
              </td>
              <td className="px-4 py-3">
                <div style={getPeCellStyle(stock.pe)}>
                  {stock.pe === '—' ? '—' : stock.pe}
                </div>
              </td>
              <td className="px-4 py-3 text-center">
                <span style={getRatingStyle(stock.analystRating)}>
                  {stock.analystRating}
                </span>
              </td>
              <td className="px-4 py-3">
                <SentimentChart data={stock.sentimentTimeSeries} />
              </td>
              {periods.map(period => {
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
                  <td key={period} className="px-2 py-3">
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
              })}
              <td className="px-4 py-3 text-center">
                <button
                  onClick={() => onRemoveComparison(stock.code)}
                  className="p-1 text-red-400 hover:bg-red-900/30 rounded transition"
                >
                  <X size={18} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HeatmapView({ selectedStock, comparisonStocks, heatmapColorBy, heatmapSizeBy, onRemoveComparison, onStockCodeClick }) {
  return (
    <div className="p-6">
      <div className="flex flex-wrap gap-3 justify-center">
  {[selectedStock, ...comparisonStocks].map((stock) => {
          const performance = stock.performance[heatmapColorBy];
          const sizeValue = heatmapSizeBy === 'marketCap' 
            ? getMarketCapValue(stock.marketCap)
            : heatmapSizeBy === 'pe'
            ? parseFloat(stock.pe) || 0
            : Math.abs(stock.performance[heatmapSizeBy]);
          
          const maxSize = 250;
          const minSize = 120;
          const allValues = [selectedStock, ...comparisonStocks].map(s => 
            heatmapSizeBy === 'marketCap' 
              ? getMarketCapValue(s.marketCap)
              : heatmapSizeBy === 'pe'
              ? parseFloat(s.pe) || 0
              : Math.abs(s.performance[heatmapSizeBy])
          );
          const maxValue = Math.max(...allValues);
          const minValue = Math.min(...allValues);
          const normalizedSize = minSize + ((sizeValue - minValue) / (maxValue - minValue || 1)) * (maxSize - minSize);
          
          return (
            <div
              key={stock.code}
              className="relative rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:scale-105 flex flex-col items-center justify-center p-4 border-2 border-white/10"
              style={{
                backgroundColor: getHeatmapColor(performance),
                width: `${normalizedSize}px`,
                height: `${normalizedSize}px`,
              }}
            >
              <div className="text-center">
                <span
                  onClick={() => onStockCodeClick && onStockCodeClick(stock.code)}
                  role="link"
                  tabIndex={0}
                  className="text-white font-bold text-2xl mb-1 underline decoration-dotted cursor-pointer hover:text-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                >{stock.code}</span>
                <div className="text-white font-bold text-3xl">
                  {performance > 0 ? '+' : ''}{performance.toFixed(1)}%
                </div>
              </div>
              {stock.code !== selectedStock.code && (
                <button
                  onClick={() => onRemoveComparison(stock.code)}
                  className="absolute top-2 right-2 p-1 bg-red-500 hover:bg-red-600 rounded-full transition"
                >
                  <X size={14} className="text-white" />
                </button>
              )}
            </div>
          );
        })}
      </div>
      
      <div className="mt-6 pt-6 border-t border-gray-700">
        <div className="flex items-center justify-center gap-8">
          <div className="flex items-center gap-2">
            <span className="text-gray-300 text-sm">Color Legend:</span>
            <div className="flex gap-1">
              <div className="w-8 h-8 rounded" style={{ backgroundColor: '#10b981' }}></div>
              <div className="w-8 h-8 rounded" style={{ backgroundColor: '#84cc16' }}></div>
              <div className="w-8 h-8 rounded" style={{ backgroundColor: '#eab308' }}></div>
              <div className="w-8 h-8 rounded" style={{ backgroundColor: '#f97316' }}></div>
              <div className="w-8 h-8 rounded" style={{ backgroundColor: '#ef4444' }}></div>
              <div className="w-8 h-8 rounded" style={{ backgroundColor: '#991b1b' }}></div>
            </div>
            <span className="text-gray-300 text-sm ml-2">
              <span className="text-green-400">+20%</span> to <span className="text-red-400">-20%</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}