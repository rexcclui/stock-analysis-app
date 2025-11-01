import React from 'react';
import { X } from 'lucide-react';

const getColorForPerformance = (value) => {
  const numValue = parseFloat(value);
  if (isNaN(numValue)) return 'bg-gray-600 text-white';
  if (numValue >= 20) return 'bg-green-500 text-white';
  if (numValue >= 10) return 'bg-green-600 text-white';
  if (numValue >= 5) return 'bg-green-700 text-white';
  if (numValue >= 0) return 'bg-green-800 text-white';
  if (numValue >= -5) return 'bg-red-800 text-white';
  if (numValue >= -10) return 'bg-red-700 text-white';
  if (numValue >= -20) return 'bg-red-600 text-white';
  return 'bg-red-500 text-white';
};

const getSentimentBgColor = (score) => {
  if (score >= 0.7) return 'bg-green-500 text-white';
  if (score >= 0.6) return 'bg-green-600 text-white';
  if (score >= 0.5) return 'bg-green-700 text-white';
  if (score >= 0.4) return 'bg-yellow-600 text-white';
  if (score >= 0.3) return 'bg-yellow-700 text-white';
  if (score >= 0.2) return 'bg-red-700 text-white';
  return 'bg-red-600 text-white';
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
  onHeatmapColorByChange,
  heatmapSizeBy,
  onHeatmapSizeByChange
}) {
  return (
    <div className="bg-gray-800 rounded-xl shadow-xl overflow-hidden border border-gray-700">
      {viewMode === 'table' ? (
        <TableView
          selectedStock={selectedStock}
          comparisonStocks={comparisonStocks}
          periods={periods}
          onRemoveComparison={onRemoveComparison}
        />
      ) : (
        <HeatmapView
          selectedStock={selectedStock}
          comparisonStocks={comparisonStocks}
          heatmapColorBy={heatmapColorBy}
          heatmapSizeBy={heatmapSizeBy}
          onRemoveComparison={onRemoveComparison}
        />
      )}
      
      <div className="bg-gray-800 p-4 border-t border-gray-700">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <span className="text-white font-medium">View Mode:</span>
            <div className="flex bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => onViewModeChange('table')}
                className={`px-4 py-2 rounded-lg transition ${
                  viewMode === 'table' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                Table
              </button>
              <button
                onClick={() => onViewModeChange('heatmap')}
                className={`px-4 py-2 rounded-lg transition ${
                  viewMode === 'heatmap' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                Heatmap
              </button>
            </div>
          </div>

          {viewMode === 'heatmap' && (
            <div className="flex items-center gap-6 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-gray-300 text-sm">Color by:</span>
                <select
                  value={heatmapColorBy}
                  onChange={(e) => onHeatmapColorByChange(e.target.value)}
                  className="px-3 py-1 bg-gray-700 border border-gray-600 text-white rounded-lg text-sm focus:border-blue-500 focus:outline-none"
                >
                  {periods.map(period => (
                    <option key={period} value={period}>{period} Performance</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-300 text-sm">Size by:</span>
                <select
                  value={heatmapSizeBy}
                  onChange={(e) => onHeatmapSizeByChange(e.target.value)}
                  className="px-3 py-1 bg-gray-700 border border-gray-600 text-white rounded-lg text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="marketCap">Market Cap</option>
                  <option value="pe">P/E Ratio</option>
                  {periods.map(period => (
                    <option key={period} value={period}>{period} Performance</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TableView({ selectedStock, comparisonStocks, periods, onRemoveComparison }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-900 text-white">
          <tr>
            <th colSpan="5" className="px-4 py-3 text-left"></th>
            <th colSpan={periods.length} className="px-4 py-3 text-center font-semibold bg-gray-800 border-b-2 border-gray-700">
              Price / Sentiment
            </th>
            <th className="px-4 py-3 text-center"></th>
          </tr>
          <tr>
            <th className="px-4 py-3 text-left">Code</th>
            <th className="px-2 py-3 text-left whitespace-nowrap">Name</th>
            <th className="px-4 py-3 text-right">Market Cap</th>
            <th className="px-4 py-3 text-right">P/E</th>
            <th className="px-4 py-3 text-center">Rating</th>
            {periods.map(period => (
              <th key={period} className="px-4 py-3 text-center">
                {period}
              </th>
            ))}
            <th className="px-4 py-3 text-center">Action</th>
          </tr>
        </thead>
        <tbody>
          <tr className="bg-blue-900/30 border-b-2 border-blue-700">
            <td className="px-4 py-3 font-bold text-white">{selectedStock.code}</td>
            <td className="px-2 py-3 font-medium text-white whitespace-nowrap">{selectedStock.name}</td>
            <td className="px-4 py-3 text-right text-gray-200">${selectedStock.marketCap}</td>
            <td className="px-4 py-3 text-right text-gray-200">{selectedStock.pe}</td>
            <td className="px-4 py-3 text-center">
              <span className="px-2 py-1 bg-green-900/40 text-green-300 rounded-full text-sm font-medium border border-green-700">
                {selectedStock.analystRating}
              </span>
            </td>
            {periods.map(period => (
              <td key={period} className="px-2 py-3">
                <div className={`px-3 py-2 rounded-lg text-center font-bold mb-1 ${getColorForPerformance(selectedStock.performance[period])}`}>
                  {selectedStock.performance[period] > 0 ? '+' : ''}{selectedStock.performance[period].toFixed(1)}%
                </div>
                {selectedStock.sentimentHistory && (
                  <div className={`px-2 py-1 rounded text-center text-xs font-bold ${getSentimentBgColor(selectedStock.sentimentHistory[period])}`}>
                    {(selectedStock.sentimentHistory[period] * 100).toFixed(0)}%
                  </div>
                )}
              </td>
            ))}
            <td className="px-4 py-3 text-center text-gray-400">-</td>
          </tr>
          {comparisonStocks.map((stock, idx) => (
            <tr key={stock.code} className={idx % 2 === 0 ? 'bg-gray-700/50' : 'bg-gray-800/50'}>
              <td className="px-4 py-3 font-medium text-white">{stock.code}</td>
              <td className="px-2 py-3 text-gray-200 whitespace-nowrap">{stock.name}</td>
              <td className="px-4 py-3 text-right text-gray-200">${stock.marketCap}</td>
              <td className="px-4 py-3 text-right text-gray-200">{stock.pe}</td>
              <td className="px-4 py-3 text-center">
                <span className="px-2 py-1 bg-gray-600 text-gray-200 rounded-full text-sm border border-gray-500">
                  {stock.analystRating}
                </span>
              </td>
              {periods.map(period => (
                <td key={period} className="px-2 py-3">
                  <div className={`px-3 py-2 rounded-lg text-center font-bold mb-1 ${getColorForPerformance(stock.performance[period])}`}>
                    {stock.performance[period] > 0 ? '+' : ''}{stock.performance[period].toFixed(1)}%
                  </div>
                  {stock.sentimentHistory && (
                    <div className={`px-2 py-1 rounded text-center text-xs font-bold ${getSentimentBgColor(stock.sentimentHistory[period])}`}>
                      {(stock.sentimentHistory[period] * 100).toFixed(0)}%
                    </div>
                  )}
                </td>
              ))}
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

function HeatmapView({ selectedStock, comparisonStocks, heatmapColorBy, heatmapSizeBy, onRemoveComparison }) {
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
                <div className="text-white font-bold text-2xl mb-1">{stock.code}</div>
                <div className="text-white text-sm opacity-90 mb-2">{stock.name}</div>
                <div className="text-white font-bold text-3xl">
                  {performance > 0 ? '+' : ''}{performance.toFixed(1)}%
                </div>
                <div className="text-white text-xs mt-2 opacity-80">
                  {heatmapColorBy} Performance
                </div>
                {heatmapSizeBy === 'marketCap' && (
                  <div className="text-white text-xs mt-1 opacity-70">
                    Cap: ${stock.marketCap}
                  </div>
                )}
                {heatmapSizeBy === 'pe' && (
                  <div className="text-white text-xs mt-1 opacity-70">
                    P/E: {stock.pe}
                  </div>
                )}
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
