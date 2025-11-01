'use client';

import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Search, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import { ComparisonSection } from './components/ComparisonSection';

// Fetch complete stock data from API routes
const fetchCompleteStockData = async (symbol) => {
  try {
    const [stockRes, sentimentRes, newsRes] = await Promise.all([
      fetch(`/api/stock?symbol=${symbol}`),
      fetch(`/api/sentiment?symbol=${symbol}`),
      fetch(`/api/news?symbol=${symbol}`)
    ]);

    if (!stockRes.ok) throw new Error(`Stock API error: ${stockRes.status}`);
    if (!sentimentRes.ok) throw new Error(`Sentiment API error: ${sentimentRes.status}`);
    if (!newsRes.ok) throw new Error(`News API error: ${newsRes.status}`);

    const [stock, sentiment, news] = await Promise.all([
      stockRes.json(),
      sentimentRes.json(),
      newsRes.json()
    ]);

    if (stock.error) throw new Error(stock.error);

    let competitors = [];
    try {
      const competitorsRes = await fetch(`/api/competitors?sector=${stock.sector}&exclude=${symbol}`);
      if (competitorsRes.ok) {
        const competitorsData = await competitorsRes.json();
        competitors = competitorsData || [];
      }
    } catch (compError) {
      console.warn('Failed to fetch competitors:', compError);
      competitors = [];
    }

    return {
      ...stock,
      sentiment,
      sentimentHistory: sentiment.sentimentHistory,
      news,
      competitors
    };
  } catch (error) {
    console.error('Fetch error:', error);
    return null;
  }
};

const getSentimentColor = (score) => {
  if (score >= 0.6) return 'text-green-400';
  if (score >= 0.3) return 'text-yellow-400';
  return 'text-red-400';
};

export default function StockAnalysisDashboard() {
  const [searchInput, setSearchInput] = useState('');
  const [selectedStock, setSelectedStock] = useState(null);
  const [chartPeriod, setChartPeriod] = useState('1M');
  const [comparisonStocks, setComparisonStocks] = useState([]);
  const [manualStock, setManualStock] = useState('');
  const [savedComparisons, setSavedComparisons] = useState({});
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('table');
  const [heatmapColorBy, setHeatmapColorBy] = useState('1D');
  const [heatmapSizeBy, setHeatmapSizeBy] = useState('marketCap');
  const [searchHistory, setSearchHistory] = useState([]);
  const [isClient, setIsClient] = useState(false);

  React.useEffect(() => {
    setIsClient(true);
    // Load searchHistory from localStorage
    const saved = localStorage.getItem('stockSearchHistory');
    if (saved) {
      setSearchHistory(JSON.parse(saved));
    }
    // Load chartPeriod from localStorage
    const savedPeriod = localStorage.getItem('chartPeriod');
    if (savedPeriod) {
      setChartPeriod(savedPeriod);
    }
  }, []);

  const chartData = selectedStock?.chartData?.[chartPeriod] || [];

  // Save search history to localStorage
  const addToSearchHistory = (stockCode) => {
    const code = stockCode.toUpperCase();
    let updated = [code, ...searchHistory.filter(s => s !== code)];
    if (updated.length > 10) {
      updated = updated.slice(0, 10);
    }
    setSearchHistory(updated);
    localStorage.setItem('stockSearchHistory', JSON.stringify(updated));
  };

  const handleSearch = async () => {
    setLoading(true);
    const stockCode = searchInput.toUpperCase();
    
    try {
      const stockData = await fetchCompleteStockData(stockCode);
      
      if (!stockData) {
        alert('Stock not found or API error. Please check your API keys in .env.local');
        setLoading(false);
        return;
      }
      
      setSelectedStock(stockData);
      addToSearchHistory(stockCode);
      
      const competitorPromises = stockData.competitors.map(code => fetchCompleteStockData(code));
      const competitorData = await Promise.all(competitorPromises);
      const validCompetitors = competitorData.filter(c => c !== null);
      
      const saved = savedComparisons[stockCode] || [];
      const savedPromises = saved.map(code => fetchCompleteStockData(code));
      const savedData = await Promise.all(savedPromises);
      const validSaved = savedData.filter(s => s !== null);
      
      setComparisonStocks([...validCompetitors, ...validSaved]);
      
    } catch (error) {
      console.error('Search error:', error);
      alert('Error fetching stock data. Please check your API keys and try again.');
    }
    
    setLoading(false);
  };

  const addManualComparison = async () => {
    const code = manualStock.toUpperCase();
    
    if (!code || !selectedStock) return;
    
    if (comparisonStocks.find(s => s.code === code)) {
      alert('Stock already in comparison');
      return;
    }
    
    setLoading(true);
    const stock = await fetchCompleteStockData(code);
    
    if (stock) {
      setComparisonStocks([...comparisonStocks, stock]);
      
      const updated = { ...savedComparisons };
      if (!updated[selectedStock.code]) {
        updated[selectedStock.code] = [];
      }
      if (!updated[selectedStock.code].includes(code)) {
        updated[selectedStock.code].push(code);
        setSavedComparisons(updated);
      }
      setManualStock('');
    } else {
      alert('Stock not found');
    }
    
    setLoading(false);
  };

  const removeComparison = (code) => {
    setComparisonStocks(comparisonStocks.filter(s => s.code !== code));
    if (selectedStock) {
      const updated = { ...savedComparisons };
      if (updated[selectedStock.code]) {
        updated[selectedStock.code] = updated[selectedStock.code].filter(c => c !== code);
        setSavedComparisons(updated);
      }
    }
  };

  const periods = ['1D', '7D', '1M', '3M', '6M', '1Y', '3Y', '5Y'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800 p-6 pl-20">
      <div className="w-full">
        <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 mb-6 border border-gray-700">
          <h1 className="text-4xl font-bold text-white mb-6 flex items-center gap-3">
            <BarChart3 className="text-blue-400" size={40} />
            Stock Performance Analysis
          </h1>
          
          <div className="flex gap-3 mb-6">
            <input
              type="text"
              placeholder="Enter stock code (e.g., AAPL, MSFT, TSLA)"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              autoFocus
              className="flex-1 px-4 py-3 bg-gray-700 border-2 border-gray-600 text-white rounded-lg focus:border-blue-500 focus:outline-none placeholder-gray-400"
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 disabled:opacity-50"
            >
              <Search size={20} />
              {loading ? 'Loading...' : 'Search'}
            </button>
          </div>

          {isClient && searchHistory.length > 0 && (
            <div className="mb-6">
              <p className="text-sm text-gray-400 mb-2">Recent Searches:</p>
              <div className="flex flex-wrap gap-2">
                {searchHistory.map((code) => (
                  <button
                    key={code}
                    onClick={() => {
                      setSearchInput(code);
                      handleSearch();
                    }}
                    className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-blue-400 hover:text-blue-300 rounded-lg text-sm transition border border-gray-600 hover:border-gray-500"
                  >
                    {code}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!selectedStock && (
            <div className="text-center py-12">
              <p className="text-gray-300 text-lg mb-4">Search for a stock to get started</p>
              <p className="text-gray-400 text-sm">Try: AAPL, MSFT, GOOGL, TSLA, AMZN</p>
            </div>
          )}

          {selectedStock && (
            <>
              <div className="bg-gradient-to-r from-blue-900/40 to-indigo-900/40 rounded-xl p-6 mb-6 border border-blue-800/30">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-3xl font-bold text-white">{selectedStock.name}</h2>
                    <p className="text-gray-300">{selectedStock.code} • {selectedStock.exchange}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-300">Current Price</div>
                    <div className="text-3xl font-bold" style={{ color: '#60A5FA' }}>${selectedStock.currentPrice?.toFixed(2)}</div>
                    <div className="text-lg font-semibold" style={{
                      color: selectedStock.dayChange > 0 
                        ? '#4ADE80' 
                        : selectedStock.dayChange < 0 
                        ? '#F87171' 
                        : '#9CA3AF'
                    }}>
                      {selectedStock.dayChange > 0 ? '+' : ''}{selectedStock.dayChange?.toFixed(2)}%
                      <span className="text-sm text-gray-400"> Today</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-gray-800/60 rounded-lg p-3 border border-gray-700">
                    <div className="text-sm text-gray-300">Market Cap</div>
                    <div className="text-lg font-bold text-white">${selectedStock.marketCap}</div>
                  </div>
                  <div className="bg-gray-800/60 rounded-lg p-3 border border-gray-700">
                    <div className="text-sm text-gray-300">P/E Ratio</div>
                    <div className="text-lg font-bold text-white">{selectedStock.pe}</div>
                  </div>
                  <div className="bg-gray-800/60 rounded-lg p-3 border border-gray-700">
                    <div className="text-sm text-gray-300">Analyst Rating</div>
                    <div className="text-lg font-bold text-green-400">{selectedStock.analystRating}</div>
                  </div>
                  {selectedStock.sentiment && (
                    <div className="bg-gray-800/60 rounded-lg p-3 border border-gray-700">
                      <div className="text-sm text-gray-300">Social Sentiment</div>
                      <div className={`text-lg font-bold ${getSentimentColor(selectedStock.sentiment.score)}`}>
                        {(selectedStock.sentiment.score * 100).toFixed(0)}%
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white">Price Performance</h3>
                  <div className="flex gap-2">
                    {periods.map(period => (
                      <button
                        key={period}
                        onClick={() => {
                          setChartPeriod(period);
                          localStorage.setItem('chartPeriod', period);
                        }}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                          chartPeriod === period
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {period}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="bg-gray-800 rounded-xl p-4 shadow-xl border border-gray-700">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="date" stroke="#9CA3AF" />
                      <YAxis 
                        stroke="#9CA3AF" 
                        domain={
                          chartData.length > 0 
                            ? [
                                Math.min(...chartData.map(d => d.price)) * 0.9,
                                Math.max(...chartData.map(d => d.price)) * 1.05
                              ]
                            : ['auto', 'auto']
                        }
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                        labelStyle={{ color: '#F3F4F6' }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="price" stroke="#3B82F6" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <ComparisonSection
                selectedStock={selectedStock}
                comparisonStocks={comparisonStocks}
                manualStock={manualStock}
                onManualStockChange={setManualStock}
                onAddComparison={addManualComparison}
                onRemoveComparison={removeComparison}
                loading={loading}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                heatmapColorBy={heatmapColorBy}
                onHeatmapColorByChange={setHeatmapColorBy}
                heatmapSizeBy={heatmapSizeBy}
                onHeatmapSizeByChange={setHeatmapSizeBy}
                periods={periods}
              />

              {selectedStock.sentiment && (
                <div className="mt-6 bg-gray-800 rounded-xl shadow-xl p-6 border border-gray-700">
                  <h3 className="text-xl font-bold text-white mb-4">Social Media Sentiment</h3>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="bg-green-900/20 rounded-lg p-4 border border-green-800">
                      <div className="text-sm text-gray-300">Positive</div>
                      <div className="text-2xl font-bold text-green-400">{selectedStock.sentiment.positive}%</div>
                    </div>
                    <div className="bg-gray-700/20 rounded-lg p-4 border border-gray-600">
                      <div className="text-sm text-gray-300">Neutral</div>
                      <div className="text-2xl font-bold text-gray-200">{selectedStock.sentiment.neutral}%</div>
                    </div>
                    <div className="bg-red-900/20 rounded-lg p-4 border border-red-800">
                      <div className="text-sm text-gray-300">Negative</div>
                      <div className="text-2xl font-bold text-red-400">{selectedStock.sentiment.negative}%</div>
                    </div>
                  </div>
                </div>
              )}

              {selectedStock.news && selectedStock.news.length > 0 && (
                <div className="mt-6 bg-gray-800 rounded-xl shadow-xl p-6 border border-gray-700">
                  <h3 className="text-xl font-bold text-white mb-4">Latest News</h3>
                  <div className="space-y-3">
                    {selectedStock.news.map((article, idx) => (
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
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}