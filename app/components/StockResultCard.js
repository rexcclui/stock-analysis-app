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
    <div className="bg-gradient-to-r from-blue-900/40 to-indigo-900/40 rounded-xl p-6 mb-6 border border-blue-800/30" style={{ marginTop: '1rem' }}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-3xl font-bold text-white">
            {stock.website ? (
              <a href={stock.website} target="_blank" rel="noopener noreferrer" className="text-yellow-400 hover:text-yellow-600" style={{ color: '#FBBF24', textDecoration: 'none' }}>
                {stock.name}
              </a>
            ) : (
              stock.name
            )}
          </h2>
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
      <div className="flex overflow-x-auto space-x-4 pb-2">
        {[
          { label: 'Market Cap', value: stock.marketCap ? `$${stock.marketCap}` : '—' },
          { label: 'P/E Ratio', value: stock.pe ?? '—' },
          { label: '52W Range', value: stock.fiftyTwoWeekRange ?? '—' },
          { label: 'Dividend %', value: stock.dividendYield > 0 ? `${stock.dividendYield}%` : '—' },
          { label: 'Sector', value: stock.sector ?? '—' },
          { label: 'Industry', value: stock.industry ?? '—' },
          { label: 'Analyst Rating', value: stock.analystRating ?? '—', color: 'text-green-400' },
          stock.sentiment && { label: 'Social Sentiment', value: `${(stock.sentiment.score * 100).toFixed(0)}%`, color: getSentimentColor(stock.sentiment.score) }
        ].filter(Boolean).map(item => (
          <div key={item.label} className="bg-gray-800/60 rounded-lg p-3 border border-gray-700 flex-shrink-0 w-44">
            <div className="text-sm text-gray-300 truncate">{item.label}</div>
            <div className={`text-lg font-bold truncate ${item.color || 'text-white'}`}>{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
