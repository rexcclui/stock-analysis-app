import React, { useState, useEffect } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { LoadingState } from './LoadingState';

// props: historyStocks: array of { code, dayChange, timestamp }
// onClickCode(code): optional callback to trigger a search again
// onRemoveStock(code): optional callback to remove a stock from history
// onReload: optional callback to reload all stocks
// loading: boolean to show loading state
export function SearchHistoryTable({ historyStocks, onClickCode, onRemoveStock, onReload, loading }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if screen is mobile size (768px or below)
    const checkMobileSize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    // Check on mount
    checkMobileSize();

    // Add event listener for window resize
    window.addEventListener('resize', checkMobileSize);

    // Cleanup
    return () => window.removeEventListener('resize', checkMobileSize);
  }, []);

  if (!historyStocks || historyStocks.length === 0) {
    if (loading) {
      return <LoadingState message="Loading previous searches..." className="mb-6" />;
    }
    return null;
  }

  // On mobile, show only the last 5 stocks
  const displayStocks = isMobile && historyStocks.length > 5
    ? historyStocks.slice(-5)
    : historyStocks;

  return (
    <div className="bg-gray-800 rounded-xl p-4 mb-6 border border-gray-700 shadow-md" style={{ marginTop: '1rem' }}>
      <div className="flex items-center gap-3 mb-3">
        <h3 className="text-lg font-semibold text-white">Previous Search:</h3>
        {onReload && (
          <button
            onClick={onReload}
            disabled={loading}
            className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 ml-8"
            title="Reload all stocks with latest data from API (bypass cache)"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Reload
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-3">
        {displayStocks.map(item => {
          const pct = item.dayChange ?? 0;
          const trendBg = pct > 0
            ? 'bg-green-700 hover:bg-green-600 border-green-600 hover:border-green-500'
            : pct < 0
            ? 'bg-red-700 hover:bg-red-600 border-red-600 hover:border-red-500'
            : 'bg-gray-700 hover:bg-gray-600 border-gray-600 hover:border-gray-500';
          const inlineBg = pct > 0 ? '#047857' : pct < 0 ? '#7f1d1d' : '#374151';

          // Format timestamp
          const formatTimestamp = (timestamp) => {
            if (!timestamp) return '';
            const date = new Date(timestamp);
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);

            if (diffMins < 1) return 'just now';
            if (diffMins < 60) return `${diffMins}m ago`;
            if (diffHours < 24) return `${diffHours}h ago`;
            if (diffDays < 7) return `${diffDays}d ago`;
            return date.toLocaleDateString();
          };

          return (
            <div
              key={item.code + pct}
              className={`group relative flex flex-col items-center justify-center min-w-[120px] h-24 px-3 py-2 rounded-lg border transition ${trendBg}`}
              style={{ backgroundColor: inlineBg }}
            >
              {onRemoveStock && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveStock(item.code);
                  }}
                  className="absolute top-1 right-1 p-0.5 text-white/60 hover:text-white hover:bg-black/30 rounded transition"
                  title="Remove from history"
                >
                  <X size={14} />
                </button>
              )}
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
              <span className="text-[10px] italic text-gray-500 mt-1">
                {formatTimestamp(item.timestamp)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
