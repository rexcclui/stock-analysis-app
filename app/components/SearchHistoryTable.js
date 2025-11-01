import React from 'react';

// props: historyStocks: array of { code, dayChange }
// onClickCode(code): optional callback to trigger a search again
export function SearchHistoryTable({ historyStocks, onClickCode }) {
  if (!historyStocks || historyStocks.length === 0) return null;

  return (
    <div className="bg-gray-800 rounded-xl p-4 mb-6 border border-gray-700 shadow-md">
      <h3 className="text-lg font-semibold text-white mb-3">Recent Search:</h3>
      <div className="flex flex-wrap gap-3">
        {historyStocks.map(item => {
          const pct = item.dayChange ?? 0;
          const color = pct > 0 ? 'text-green-400' : pct < 0 ? 'text-red-400' : 'text-gray-400';
          return (
            <button
              key={item.code + pct}
              onClick={() => onClickCode && onClickCode(item.code)}
              className="group flex flex-col items-start min-w-[120px] px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg border border-gray-600 hover:border-gray-500 transition"
            >
              <span className="font-mono text-sm text-blue-300 group-hover:text-blue-200">{item.code}</span>
              <span className={`text-xs font-semibold ${color}`}>{pct > 0 ? '+' : ''}{pct.toFixed(2)}%</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
