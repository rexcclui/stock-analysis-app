import React from 'react';
import { X } from 'lucide-react';

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

export function HeatmapView({ selectedStock, comparisonStocks, heatmapColorBy, heatmapSizeBy, onRemoveComparison, onStockCodeClick }) {
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
                  className="absolute bottom-1 right-1 p-0.5 bg-red-500/80 hover:bg-red-600 rounded-full transition-all z-10"
                  aria-label="Remove comparison"
                >
                  <X size={10} className="text-white" />
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
