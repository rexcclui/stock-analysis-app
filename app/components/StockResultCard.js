'use client';

import React from 'react';

// Color helper for sentiment score
const getSentimentColor = (score) => {
  if (score >= 0.6) return 'text-green-400';
  if (score >= 0.3) return 'text-yellow-400';
  return 'text-red-400';
};

/**
 * StockResultCard
 * Displays the primary stock summary after a successful search.
 * Props:
 *  - stock: full stock object (selectedStock) or null
 */
export function StockResultCard({ stock }) {
  if (!stock) return null;

  return (
    <div className="bg-gradient-to-r from-blue-900/40 to-indigo-900/40 rounded-xl p-6 mb-6 border border-blue-800/30">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-3xl font-bold text-white">{stock.name}</h2>
          <p className="text-gray-300">{stock.code} • {stock.exchange}</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-300">Current Price</div>
          <div className="text-3xl font-bold" style={{ color: '#60A5FA' }}>
            {stock.currentPrice !== undefined && stock.currentPrice !== null ? `$${stock.currentPrice.toFixed(2)}` : '—'}
          </div>
          {stock.dayChange !== undefined && stock.dayChange !== null && (
            <div className="text-lg font-semibold" style={{
              color: stock.dayChange > 0
                ? '#4ADE80'
                : stock.dayChange < 0
                ? '#F87171'
                : '#9CA3AF'
            }}>
              {stock.dayChange > 0 ? '+' : ''}{stock.dayChange.toFixed(2)}%
            </div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gray-800/60 rounded-lg p-3 border border-gray-700">
          <div className="text-sm text-gray-300">Market Cap</div>
          <div className="text-lg font-bold text-white">{stock.marketCap ? `$${stock.marketCap}` : '—'}</div>
        </div>
        <div className="bg-gray-800/60 rounded-lg p-3 border border-gray-700">
          <div className="text-sm text-gray-300">P/E Ratio</div>
          <div className="text-lg font-bold text-white">{stock.pe ?? '—'}</div>
        </div>
        <div className="bg-gray-800/60 rounded-lg p-3 border border-gray-700">
          <div className="text-sm text-gray-300">Analyst Rating</div>
          <div className="text-lg font-bold text-green-400">{stock.analystRating ?? '—'}</div>
        </div>
        {stock.sentiment && (
          <div className="bg-gray-800/60 rounded-lg p-3 border border-gray-700">
            <div className="text-sm text-gray-300">Social Sentiment</div>
            <div className={`text-lg font-bold ${getSentimentColor(stock.sentiment.score)}`}>
              {(stock.sentiment.score * 100).toFixed(0)}%
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
