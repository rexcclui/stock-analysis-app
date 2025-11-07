'use client';

import React, { useState } from 'react';
import { TrendingUp, TrendingDown, ExternalLink, Newspaper, Globe, DollarSign, Building2 } from 'lucide-react';
import { LoadingState } from './LoadingState';
import { Tabs, TabPanel } from './Tabs';

/**
 * NewsSection
 * Props:
 * - newsApiNews: array of { title, date, sentiment, url } from NewsAPI
 * - googleNews: array of { title, date, sentiment, url } from Google News
 * - yahooNews: array of { title, date, sentiment, url } from Yahoo Finance
 * - bloombergNews: array of { title, date, sentiment, url } from Bloomberg
 * - title: optional override title
 * - symbol: stock symbol for external news links
 * - loading: loading state
 */
export function NewsSection({ newsApiNews = [], googleNews = [], yahooNews = [], bloombergNews = [], title = 'Latest News', loading = false, symbol = '' }) {
  const [activeTab, setActiveTab] = useState('newsapi');

  console.log('[NewsSection] Received news:', {
    newsApiLength: newsApiNews?.length,
    googleNewsLength: googleNews?.length,
    yahooNewsLength: yahooNews?.length,
    bloombergNewsLength: bloombergNews?.length,
    isNewsApiArray: Array.isArray(newsApiNews),
    isGoogleNewsArray: Array.isArray(googleNews),
    isYahooNewsArray: Array.isArray(yahooNews),
    isBloombergNewsArray: Array.isArray(bloombergNews)
  });

  // Check if any source has news
  const hasNewsApi = newsApiNews && Array.isArray(newsApiNews) && newsApiNews.length > 0;
  const hasGoogle = googleNews && Array.isArray(googleNews) && googleNews.length > 0;
  const hasYahoo = yahooNews && Array.isArray(yahooNews) && yahooNews.length > 0;
  const hasBloomberg = bloombergNews && Array.isArray(bloombergNews) && bloombergNews.length > 0;

  if (!hasNewsApi && !hasGoogle && !hasYahoo && !hasBloomberg) {
    console.log('[NewsSection] No news to display from any source');
    if (loading) {
      return <LoadingState message="Loading latest news..." className="mb-6" />;
    }
    return null;
  }

  // Filter out error entries from all sources
  const validNewsApi = hasNewsApi ? newsApiNews.filter(article => !article.error) : [];
  const validGoogleNews = hasGoogle ? googleNews.filter(article => !article.error) : [];
  const validYahooNews = hasYahoo ? yahooNews.filter(article => !article.error) : [];
  const validBloombergNews = hasBloomberg ? bloombergNews.filter(article => !article.error) : [];

  console.log('[NewsSection] Valid news after filtering:', {
    newsApi: validNewsApi.length,
    google: validGoogleNews.length,
    yahoo: validYahooNews.length,
    bloomberg: validBloombergNews.length
  });
  
  const newsLinks = symbol ? [
    { name: 'Google Trends', url: `https://trends.google.com/trends/explore?q=${encodeURIComponent(symbol)}`, color: 'bg-red-600 hover:bg-red-700', logo: 'https://www.google.com/favicon.ico' },
    { name: 'Google', url: `https://news.google.com/search?q=${encodeURIComponent(symbol + ' stock')}`, color: 'bg-blue-600 hover:bg-blue-700', logo: 'https://www.google.com/favicon.ico' },
    { name: 'Yahoo Finance', url: `https://finance.yahoo.com/quote/${symbol}/news`, color: 'bg-purple-600 hover:bg-purple-700', logo: 'https://finance.yahoo.com/favicon.ico' },
    { name: 'MarketWatch', url: `https://www.marketwatch.com/investing/stock/${symbol.toLowerCase()}`, color: 'bg-green-600 hover:bg-green-700', logo: 'https://www.marketwatch.com/favicon.ico' },
    { name: 'Seeking Alpha', url: `https://seekingalpha.com/symbol/${symbol}/news`, color: 'bg-orange-600 hover:bg-orange-700', logo: 'https://seekingalpha.com/favicon.ico' },
    { name: 'Bloomberg', url: `https://www.bloomberg.com/quote/${symbol}:US`, color: 'bg-gray-600 hover:bg-gray-700', logo: 'https://www.bloomberg.com/favicon.ico' }
  ] : [];

  // Tabs configuration
  const tabs = [
    { id: 'newsapi', label: 'NewsAPI', icon: Newspaper },
    { id: 'google', label: 'Google News', icon: Globe },
    { id: 'yahoo', label: 'Yahoo Finance', icon: DollarSign },
    { id: 'bloomberg', label: 'Bloomberg', icon: Building2 }
  ];

  // Helper function to render news articles
  const renderNewsList = (articles) => {
    if (!articles || articles.length === 0) {
      return (
        <div className="text-gray-400 text-center py-8">
          No news articles available
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {articles.map((article, idx) => (
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
              <div className="text-sm text-gray-400">
                {article.date}
                {article.source && <span className="ml-2">• {article.source}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-gray-800 rounded-xl shadow-xl p-6 border border-gray-700" style={{ marginTop: '1rem' }}>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h3 className="text-xl font-bold text-white">{title}</h3>

        {symbol && newsLinks.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
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
      </div>

      {/* Tabs */}
      <Tabs activeTab={activeTab} onTabChange={setActiveTab} tabs={tabs} />

      {/* Tab Panels */}
      <TabPanel activeTab={activeTab} tabId="newsapi">
        {renderNewsList(validNewsApi)}
      </TabPanel>

      <TabPanel activeTab={activeTab} tabId="google">
        {renderNewsList(validGoogleNews)}
      </TabPanel>

      <TabPanel activeTab={activeTab} tabId="yahoo">
        {renderNewsList(validYahooNews)}
      </TabPanel>

      <TabPanel activeTab={activeTab} tabId="bloomberg">
        {renderNewsList(validBloombergNews)}
      </TabPanel>
    </div>
  );
}
