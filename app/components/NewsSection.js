import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

/**
 * NewsSection
 * Props:
 * - news: array of { title, date, sentiment }
 * - title: optional override title
 */
export function NewsSection({ news = [], title = 'Latest News' }) {
  console.log('[NewsSection] Received news:', { length: news?.length, isArray: Array.isArray(news), data: news });
  
  if (!news || !Array.isArray(news) || news.length === 0) {
    console.log('[NewsSection] No news to display');
    return null;
  }
  
  // Filter out error entries
  const validNews = news.filter(article => !article.error);
  console.log('[NewsSection] Valid news after filtering:', { total: news.length, valid: validNews.length });
  
  if (validNews.length === 0) {
    console.log('[NewsSection] All news articles were errors');
    return null;
  }
  
  return (
    <div className="bg-gray-800 rounded-xl shadow-xl p-6 border border-gray-700" style={{ marginTop: '1rem' }}>
      <h3 className="text-xl font-bold text-white mb-4">{title}</h3>
      <div className="space-y-3">
        {validNews.map((article, idx) => (
          <div key={idx} className="flex items-start gap-3 p-3 bg-gray-700/40 rounded-lg border border-gray-600">
            {article.sentiment === 'positive' ? (
              <TrendingUp className="text-green-400 mt-1" size={20} />
            ) : (
              <TrendingDown className="text-red-400 mt-1" size={20} />
            )}
            <div className="flex-1">
              <div className="font-medium text-white">{article.title}</div>
              <div className="text-sm text-gray-400">{article.date}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
