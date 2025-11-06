import React from 'react';
import { TrendingUp, TrendingDown, ExternalLink } from 'lucide-react';
import { LoadingState } from './LoadingState';

/**
 * NewsSection
 * Props:
 * - news: array of { title, date, sentiment }
 * - title: optional override title
 * - symbol: stock symbol for external news links
 */
export function NewsSection({ news = [], title = 'Latest News', loading = false, symbol = '' }) {
  console.log('[NewsSection] Received news:', { length: news?.length, isArray: Array.isArray(news), data: news });

  if (!news || !Array.isArray(news) || news.length === 0) {
    console.log('[NewsSection] No news to display');
    if (loading) {
      return <LoadingState message="Loading latest news..." className="mb-6" />;
    }
    return null;
  }
  
  // Filter out error entries
  const validNews = news.filter(article => !article.error);
  console.log('[NewsSection] Valid news after filtering:', { total: news.length, valid: validNews.length });
  
  if (validNews.length === 0) {
    console.log('[NewsSection] All news articles were errors');
    return null;
  }
  
  const newsLinks = symbol ? [
    { name: 'Google', url: `https://news.google.com/search?q=${encodeURIComponent(symbol + ' stock')}`, color: 'bg-blue-600 hover:bg-blue-700', logo: 'https://www.google.com/favicon.ico' },
    { name: 'Yahoo Finance', url: `https://finance.yahoo.com/quote/${symbol}/news`, color: 'bg-purple-600 hover:bg-purple-700', logo: 'https://finance.yahoo.com/favicon.ico' },
    { name: 'MarketWatch', url: `https://www.marketwatch.com/investing/stock/${symbol.toLowerCase()}`, color: 'bg-green-600 hover:bg-green-700', logo: 'https://www.marketwatch.com/favicon.ico' },
    { name: 'Seeking Alpha', url: `https://seekingalpha.com/symbol/${symbol}/news`, color: 'bg-orange-600 hover:bg-orange-700', logo: 'https://seekingalpha.com/favicon.ico' },
    { name: 'Bloomberg', url: `https://www.bloomberg.com/quote/${symbol}:US`, color: 'bg-gray-600 hover:bg-gray-700', logo: 'https://www.bloomberg.com/favicon.ico' }
  ] : [];

  return (
    <div className="bg-gray-800 rounded-xl shadow-xl p-6 border border-gray-700" style={{ marginTop: '1rem' }}>
      <h3 className="text-xl font-bold text-white mb-4">{title}</h3>

      {symbol && newsLinks.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          <span className="text-sm text-gray-400 self-center mr-2">More news from:</span>
          {newsLinks.map((link) => (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`px-3 py-1.5 ${link.color} text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5`}
            >
              <img
                src={link.logo}
                alt={`${link.name} logo`}
                className="w-4 h-4 object-contain"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              {link.name}
              <ExternalLink size={14} />
            </a>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {validNews.map((article, idx) => (
          <div key={idx} className="flex items-start gap-3 p-3 bg-gray-700/40 rounded-lg border border-gray-600">
            {article.sentiment === 'positive' ? (
              <TrendingUp className="text-green-400 mt-1" size={20} />
            ) : (
              <TrendingDown className="text-red-400 mt-1" size={20} />
            )}
            <div className="flex-1">
              {article.url ? (
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-white hover:text-blue-400 transition-colors cursor-pointer"
                >
                  {article.title}
                </a>
              ) : (
                <div className="font-medium text-white">{article.title}</div>
              )}
              <div className="text-sm text-gray-400">{article.date}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
