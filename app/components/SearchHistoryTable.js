import React from 'react';

// props: historyStocks: array of { code, dayChange }
// onClickCode(code): optional callback to trigger a search again
export function SearchHistoryTable({ historyStocks, onClickCode }) {
  if (!historyStocks || historyStocks.length === 0) return null;

  return (
    <div className="bg-gray-800 rounded-xl p-4 mb-6 border border-gray-700 shadow-md">
      <h3 className="text-lg font-semibold text-white mb-3">Previous Search:</h3>
      <div className="flex flex-wrap gap-3">
        {historyStocks.map(item => {
          const pct = item.dayChange ?? 0;
          const trendBg = pct > 0
            ? 'bg-green-700 hover:bg-green-600 border-green-600 hover:border-green-500'
            : pct < 0
            ? 'bg-red-700 hover:bg-red-600 border-red-600 hover:border-red-500'
            : 'bg-gray-700 hover:bg-gray-600 border-gray-600 hover:border-gray-500';
          // Force white font regardless of trend
          const color = 'text-white';
          const inlineBg = pct > 0 ? '#047857' : pct < 0 ? '#7f1d1d' : '#374151';
          return (
            <button
              key={item.code + pct}
              onClick={() => onClickCode && onClickCode(item.code)}
              className={`group flex flex-col items-center justify-center min-w-[120px] h-20 px-3 py-2 rounded-lg border transition ${trendBg}`}
              style={{ backgroundColor: inlineBg }}
            >
              <span className="font-mono text-sm font-bold text-white group-hover:text-white">{item.code}</span>
              <span className={`text-xs font-bold ${color}`}>{pct > 0 ? '+' : ''}{pct.toFixed(2)}%</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
