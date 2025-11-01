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
          const inlineBg = pct > 0 ? '#047857' : pct < 0 ? '#7f1d1d' : '#374151';
          return (
            <div
              key={item.code + pct}
              className={`group flex flex-col items-center justify-center min-w-[120px] h-20 px-3 py-2 rounded-lg border transition ${trendBg}`}
              style={{ backgroundColor: inlineBg }}
            >
              <span
                onClick={() => onClickCode && onClickCode(item.code)}
                role="link"
                tabIndex={0}
                className="font-mono text-sm font-bold text-blue-300 underline decoration-dotted cursor-pointer group-hover:text-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
              >{item.code}</span>
              <span
                onClick={() => onClickCode && onClickCode(item.code)}
                role="link"
                tabIndex={0}
                className="text-xs font-bold text-white cursor-pointer hover:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
              >{pct > 0 ? '+' : ''}{pct.toFixed(2)}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
