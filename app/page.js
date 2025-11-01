'use client';

import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Search, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import { ComparisonSection } from './components/ComparisonSection';

// Fetch complete stock data from API routes
const fetchCompleteStockData = async (symbol) => {
  try {
    // Fetch stock data (required)
    const stockRes = await fetch(`/api/stock?symbol=${symbol}`);
    if (!stockRes.ok) {
      console.error(`Stock API error: ${stockRes.status}`);
      return null;
    }
    const stock = await stockRes.json();
    if (stock.error) {
      console.error(`Stock error: ${stock.error}`);
      return null;
    }

    // Fetch sentiment data (optional - use defaults if fails)
    let sentiment = { score: 0.5, positive: 50, neutral: 30, negative: 20, sentimentHistory: { '1D': 0.5, '7D': 0.5, '1M': 0.5 } };
    try {
      const sentimentRes = await fetch(`/api/sentiment?symbol=${symbol}`);
      if (sentimentRes.ok) {
        sentiment = await sentimentRes.json();
      }
    } catch {
      console.warn('Sentiment fetch failed, using defaults');
    }

    // Fetch news data (optional - use empty if fails)
    let news = [];
    try {
      const newsRes = await fetch(`/api/news?symbol=${symbol}`);
      if (newsRes.ok) {
        news = await newsRes.json();
        if (!Array.isArray(news)) news = [];
      }
    } catch {
      console.warn('News fetch failed, using empty array');
    }

    // Fetch competitors (optional)
    let competitors = [];
    try {
      const competitorsRes = await fetch(`/api/competitors?sector=${stock.sector}&exclude=${symbol}`);
      if (competitorsRes.ok) {
        competitors = await competitorsRes.json();
        if (!Array.isArray(competitors)) competitors = [];
      }
    } catch {
      console.warn('Competitors fetch failed');
    }

    return {
      ...stock,
      sentiment,
      sentimentHistory: sentiment.sentimentHistory || {},
      news: Array.isArray(news) ? news : [],
      competitors: Array.isArray(competitors) ? competitors : []
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
  // Chart comparison input & stocks (for overlay lines)
  const [chartCompareInput, setChartCompareInput] = useState('');
  const [chartCompareStocks, setChartCompareStocks] = useState([]); // array of { code, series: [{date, pct}] }


  const buildNormalizedSeries = (stock, period) => {
    if (!stock?.chartData?.[period]) return [];
    const raw = stock.chartData[period];
    if (!raw.length) return [];
    const base = raw[0].price; // first (earliest after reverse) because we reversed earlier
    return raw.map(p => ({
      date: p.date,
      pct: base ? parseFloat((((p.price - base) / base) * 100).toFixed(2)) : 0
    }));
  };

  // Merge multiple normalized series into one dataset keyed by date
  const buildMultiStockDataset = (primarySeries, compareSeriesArr) => {
    const map = new Map();
    const addSeries = (series, key) => {
      series.forEach(point => {
        if (!map.has(point.date)) {
          map.set(point.date, { date: point.date });
        }
        map.get(point.date)[key] = point.pct;
      });
    };
    addSeries(primarySeries, selectedStock?.code || 'PRIMARY');
    compareSeriesArr.forEach(s => addSeries(s.series, s.code));
    // Sort by date ascending
    return Array.from(map.values()).sort((a,b) => a.date.localeCompare(b.date));
  };


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

  // Rebuild normalized comparison series when chartPeriod changes
  React.useEffect(() => {
    if (!selectedStock) return;
    setChartCompareStocks(prev => prev.map(s => ({
      ...s,
      series: buildNormalizedSeries(s.__stockRef, chartPeriod)
    })));
  }, [chartPeriod, selectedStock]);

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

      // Also update existing chart compare series baseline to new period
      setChartCompareStocks(prev => prev.map(s => ({
        ...s,
        series: buildNormalizedSeries(s.__stockRef, chartPeriod)
      })));
      
    } catch (error) {
      console.error('Search error:', error);
      alert('Error fetching stock data. Please check your API keys and try again.');
    }
    
    setLoading(false);
  };

  // Add stock for chart-only comparison (percentage lines)
  const addChartCompareStock = async () => {
    const code = chartCompareInput.toUpperCase().trim();
    if (!code) return;
    if (!selectedStock) {
      alert('Load a primary stock first');
      return;
    }
    if (code === selectedStock.code) {
      alert('Already the primary stock');
      return;
    }
    if (chartCompareStocks.find(s => s.code === code)) {
      alert('Already added to chart');
      return;
    }
    setLoading(true);
    const stock = await fetchCompleteStockData(code);
    setLoading(false);
    if (!stock) {
      alert('Stock not found');
      return;
    }
    const series = buildNormalizedSeries(stock, chartPeriod);
    if (!series.length) {
      alert('No chart data for this period');
      return;
    }
    setChartCompareStocks([...chartCompareStocks, { code, series, __stockRef: stock }]);
    setChartCompareInput('');
  };

  const removeChartCompareStock = (code) => {
    setChartCompareStocks(chartCompareStocks.filter(s => s.code !== code));
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
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                    <div className="flex gap-2 flex-1">
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
                    <div className="flex gap-2 flex-1">
                      <input
                        type="text"
                        placeholder="Add stock to chart (e.g. MSFT)"
                        value={chartCompareInput}
                        onChange={(e)=> setChartCompareInput(e.target.value)}
                        onKeyDown={(e)=> e.key==='Enter' && addChartCompareStock()}
                        className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 placeholder-gray-400"
                      />
                      <button
                        onClick={addChartCompareStock}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition"
                      >Add</button>
                    </div>
                  </div>
                  {chartCompareStocks.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {chartCompareStocks.map(s => (
                        <span key={s.code} className="flex items-center gap-1 bg-gray-700 px-2 py-1 rounded text-xs text-gray-200">
                          {s.code}
                          <button onClick={()=> removeChartCompareStock(s.code)} className="text-red-400 hover:text-red-300">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                  <ResponsiveContainer width="100%" height={320}>
                    {(() => {
                      const primarySeries = buildNormalizedSeries(selectedStock, chartPeriod);
                      const multiData = chartCompareStocks.length === 0
                        ? chartData
                        : buildMultiStockDataset(primarySeries, chartCompareStocks);
                      return (
                        <LineChart data={multiData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="date" stroke="#9CA3AF" />
                      {chartCompareStocks.length === 0 ? (
                        <YAxis
                          stroke="#9CA3AF"
                          allowDecimals={false}
                          domain={
                            chartData.length > 0
                              ? [
                                  Math.min(...chartData.map(d => d.price)) * 0.9,
                                  Math.max(...chartData.map(d => d.price)) * 1.05
                                ]
                              : ['auto','auto']
                          }
                        />
                      ) : (
                        <YAxis
                          stroke="#9CA3AF"
                          tickFormatter={(v)=> `${v.toFixed(0)}%`}
                          domain={['auto','auto']}
                        />
                      )}
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                        labelStyle={{ color: '#F3F4F6' }}
                        formatter={(value, name) => [chartCompareStocks.length === 0 ? `$${value.toFixed(2)}` : `${value.toFixed(2)}%`, name]}
                      />
                      <Legend />
                      {chartCompareStocks.length === 0 ? (
                        <Line type="monotone" dataKey="price" stroke="#3B82F6" strokeWidth={2} dot={false} />
                      ) : (
                        <>
                          <Line type="monotone" dataKey={selectedStock.code} name={selectedStock.code} stroke="#3B82F6" strokeWidth={2} dot={false} />
                          {chartCompareStocks.map((s, idx) => (
                            <Line
                              key={s.code}
                              type="monotone"
                              dataKey={s.code}
                              name={s.code}
                              strokeWidth={2}
                              dot={false}
                              stroke={['#10B981','#F59E0B','#EF4444','#8B5CF6','#0EA5E9','#84CC16','#D946EF'][idx % 7]}
                            />
                          ))}
                        </>
                      )}
                        </LineChart>
                      );
                    })()}
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