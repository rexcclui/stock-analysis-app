'use client';

import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Search, TrendingUp, TrendingDown, Plus, X, BarChart3 } from 'lucide-react';

// Fetch complete stock data from API routes
const fetchCompleteStockData = async (symbol) => {
  try {
    const [stockRes, sentimentRes, newsRes] = await Promise.all([
      fetch(`/api/stock?symbol=${symbol}`),
      fetch(`/api/sentiment?symbol=${symbol}`),
      fetch(`/api/news?symbol=${symbol}`)
    ]);

    const [stock, sentiment, news] = await Promise.all([
      stockRes.json(),
      sentimentRes.json(),
      newsRes.json()
    ]);

    if (stock.error) throw new Error(stock.error);

    const competitorsRes = await fetch(`/api/competitors?sector=${stock.sector}&exclude=${symbol}`);
    const competitors = await competitorsRes.json();

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

const generateChartData = (period) => {
  const dataPoints = { '1D': 24, '7D': 7, '1M': 30, '3M': 90, '6M': 180, '1Y': 365, '3Y': 1095, '5Y': 1825 };
  const points = dataPoints[period] > 100 ? 50 : dataPoints[period];
  return Array.from({ length: points }, (_, i) => ({
    date: `Day ${i + 1}`,
    price: 150 + Math.random() * 30 + (i * 0.5)
  }));
};

const getColorForPerformance = (value) => {
  const numValue = parseFloat(value);
  if (isNaN(numValue)) return 'bg-gray-600 text-white';
  if (numValue >= 20) return 'bg-green-500 text-white';
  if (numValue >= 10) return 'bg-green-600 text-white';
  if (numValue >= 5) return 'bg-green-700 text-white';
  if (numValue >= 0) return 'bg-green-800 text-white';
  if (numValue >= -5) return 'bg-red-800 text-white';
  if (numValue >= -10) return 'bg-red-700 text-white';
  if (numValue >= -20) return 'bg-red-600 text-white';
  return 'bg-red-500 text-white';
};

const getSentimentColor = (score) => {
  if (score >= 0.6) return 'text-green-400';
  if (score >= 0.3) return 'text-yellow-400';
  return 'text-red-400';
};

const getSentimentBgColor = (score) => {
  if (score >= 0.7) return 'bg-green-500 text-white';
  if (score >= 0.6) return 'bg-green-600 text-white';
  if (score >= 0.5) return 'bg-green-700 text-white';
  if (score >= 0.4) return 'bg-yellow-600 text-white';
  if (score >= 0.3) return 'bg-yellow-700 text-white';
  if (score >= 0.2) return 'bg-red-700 text-white';
  return 'bg-red-600 text-white';
};

const getHeatmapColor = (value) => {
  if (value >= 20) return '#10b981';
  if (value >= 10) return '#22c55e';
  if (value >= 5) return '#84cc16';
  if (value >= 0) return '#eab308';
  if (value >= -5) return '#f97316';
  if (value >= -10) return '#ef4444';
  if (value >= -20) return '#dc2626';
  return '#991b1b';
};

const getMarketCapValue = (marketCap) => {
  if (!marketCap || marketCap === 'N/A') return 0;
  const value = parseFloat(marketCap.replace(/[^0-9.]/g, ''));
  if (marketCap.includes('T')) return value * 1000;
  return value;
};

export default function StockAnalysisDashboard() {
  const [searchInput, setSearchInput] = useState('');
  const [selectedStock, setSelectedStock] = useState(null);
  const [chartPeriod, setChartPeriod] = useState('1M');
  const [chartData, setChartData] = useState([]);
  const [comparisonStocks, setComparisonStocks] = useState([]);
  const [manualStock, setManualStock] = useState('');
  const [savedComparisons, setSavedComparisons] = useState({});
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('table');
  const [heatmapColorBy, setHeatmapColorBy] = useState('1D');
  const [heatmapSizeBy, setHeatmapSizeBy] = useState('marketCap');

  useEffect(() => {
    if (selectedStock && selectedStock.chartData) {
      // Use real chart data from API
      const data = selectedStock.chartData[chartPeriod];
      if (data && data.length > 0) {
        setChartData(data);
      } else {
        setChartData([]);
      }
    }
  }, [selectedStock, chartPeriod]);

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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800 p-6">
      <div className="max-w-7xl mx-auto">
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
                    <div className="text-3xl font-bold text-white">${selectedStock.currentPrice?.toFixed(2)}</div>
                    <div className={`text-lg font-semibold ${selectedStock.dayChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {selectedStock.dayChange >= 0 ? '+' : ''}{selectedStock.dayChange?.toFixed(2)}%
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
                        onClick={() => setChartPeriod(period)}
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
                      <YAxis stroke="#9CA3AF" />
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

              <div className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <h3 className="text-xl font-bold text-white">Add Custom Comparison</h3>
                  <input
                    type="text"
                    placeholder="Stock code (e.g., TSLA)"
                    value={manualStock}
                    onChange={(e) => setManualStock(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addManualComparison()}
                    className="px-3 py-2 bg-gray-700 border-2 border-gray-600 text-white rounded-lg focus:border-blue-500 focus:outline-none placeholder-gray-400"
                  />
                  <button
                    onClick={addManualComparison}
                    disabled={loading}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2 disabled:opacity-50"
                  >
                    <Plus size={18} />
                    Add
                  </button>
                </div>
              </div>

              <div className="mb-4 bg-gray-800 rounded-xl p-4 border border-gray-700">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <span className="text-white font-medium">View Mode:</span>
                    <div className="flex bg-gray-700 rounded-lg p-1">
                      <button
                        onClick={() => setViewMode('table')}
                        className={`px-4 py-2 rounded-lg transition ${
                          viewMode === 'table' 
                            ? 'bg-blue-600 text-white' 
                            : 'text-gray-300 hover:text-white'
                        }`}
                      >
                        Table
                      </button>
                      <button
                        onClick={() => setViewMode('heatmap')}
                        className={`px-4 py-2 rounded-lg transition ${
                          viewMode === 'heatmap' 
                            ? 'bg-blue-600 text-white' 
                            : 'text-gray-300 hover:text-white'
                        }`}
                      >
                        Heatmap
                      </button>
                    </div>
                  </div>

                  {viewMode === 'heatmap' && (
                    <div className="flex items-center gap-6 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-300 text-sm">Color by:</span>
                        <select
                          value={heatmapColorBy}
                          onChange={(e) => setHeatmapColorBy(e.target.value)}
                          className="px-3 py-1 bg-gray-700 border border-gray-600 text-white rounded-lg text-sm focus:border-blue-500 focus:outline-none"
                        >
                          {periods.map(period => (
                            <option key={period} value={period}>{period} Performance</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-300 text-sm">Size by:</span>
                        <select
                          value={heatmapSizeBy}
                          onChange={(e) => setHeatmapSizeBy(e.target.value)}
                          className="px-3 py-1 bg-gray-700 border border-gray-600 text-white rounded-lg text-sm focus:border-blue-500 focus:outline-none"
                        >
                          <option value="marketCap">Market Cap</option>
                          <option value="pe">P/E Ratio</option>
                          {periods.map(period => (
                            <option key={period} value={period}>{period} Performance</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl shadow-xl overflow-hidden border border-gray-700">
                {viewMode === 'table' ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-900 text-white">
                        <tr>
                          <th className="px-4 py-3 text-left">Code</th>
                          <th className="px-4 py-3 text-left">Name</th>
                          <th className="px-4 py-3 text-right">Market Cap</th>
                          <th className="px-4 py-3 text-right">P/E</th>
                          <th className="px-4 py-3 text-center">Rating</th>
                          {periods.map(period => (
                            <th key={period} className="px-4 py-3 text-center">
                              <div>{period}</div>
                              <div className="text-xs text-gray-400 font-normal">Price / Sentiment</div>
                            </th>
                          ))}
                          <th className="px-4 py-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="bg-blue-900/30 border-b-2 border-blue-700">
                          <td className="px-4 py-3 font-bold text-white">{selectedStock.code}</td>
                          <td className="px-4 py-3 font-medium text-white">{selectedStock.name}</td>
                          <td className="px-4 py-3 text-right text-gray-200">${selectedStock.marketCap}</td>
                          <td className="px-4 py-3 text-right text-gray-200">{selectedStock.pe}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="px-2 py-1 bg-green-900/40 text-green-300 rounded-full text-sm font-medium border border-green-700">
                              {selectedStock.analystRating}
                            </span>
                          </td>
                          {periods.map(period => (
                            <td key={period} className="px-2 py-3">
                              <div className={`px-3 py-2 rounded-lg text-center font-bold mb-1 ${getColorForPerformance(selectedStock.performance[period])}`}>
                                {selectedStock.performance[period] > 0 ? '+' : ''}{selectedStock.performance[period].toFixed(1)}%
                              </div>
                              {selectedStock.sentimentHistory && (
                                <div className={`px-2 py-1 rounded text-center text-xs font-bold ${getSentimentBgColor(selectedStock.sentimentHistory[period])}`}>
                                  {(selectedStock.sentimentHistory[period] * 100).toFixed(0)}%
                                </div>
                              )}
                            </td>
                          ))}
                          <td className="px-4 py-3 text-center text-gray-400">-</td>
                        </tr>
                        {comparisonStocks.map((stock, idx) => (
                          <tr key={stock.code} className={idx % 2 === 0 ? 'bg-gray-700/50' : 'bg-gray-800/50'}>
                            <td className="px-4 py-3 font-medium text-white">{stock.code}</td>
                            <td className="px-4 py-3 text-gray-200">{stock.name}</td>
                            <td className="px-4 py-3 text-right text-gray-200">${stock.marketCap}</td>
                            <td className="px-4 py-3 text-right text-gray-200">{stock.pe}</td>
                            <td className="px-4 py-3 text-center">
                              <span className="px-2 py-1 bg-gray-600 text-gray-200 rounded-full text-sm border border-gray-500">
                                {stock.analystRating}
                              </span>
                            </td>
                            {periods.map(period => (
                              <td key={period} className="px-2 py-3">
                                <div className={`px-3 py-2 rounded-lg text-center font-bold mb-1 ${getColorForPerformance(stock.performance[period])}`}>
                                  {stock.performance[period] > 0 ? '+' : ''}{stock.performance[period].toFixed(1)}%
                                </div>
                                {stock.sentimentHistory && (
                                  <div className={`px-2 py-1 rounded text-center text-xs font-bold ${getSentimentBgColor(stock.sentimentHistory[period])}`}>
                                    {(stock.sentimentHistory[period] * 100).toFixed(0)}%
                                  </div>
                                )}
                              </td>
                            ))}
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => removeComparison(stock.code)}
                                className="p-1 text-red-400 hover:bg-red-900/30 rounded transition"
                              >
                                <X size={18} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-6">
                    <div className="flex flex-wrap gap-3 justify-center">
                      {[selectedStock, ...comparisonStocks].map((stock) => {
                        const performance = stock.performance[heatmapColorBy];
                        const sizeValue = heatmapSizeBy === 'marketCap' 
                          ? getMarketCapValue(stock.marketCap)
                          : heatmapSizeBy === 'pe'
                          ? parseFloat(stock.pe) || 0
                          : Math.abs(stock.performance[heatmapSizeBy]);
                        
                        const maxSize = 250;
                        const minSize = 120;
                        const allValues = [selectedStock, ...comparisonStocks].map(s => 
                          heatmapSizeBy === 'marketCap' 
                            ? getMarketCapValue(s.marketCap)
                            : heatmapSizeBy === 'pe'
                            ? parseFloat(s.pe) || 0
                            : Math.abs(s.performance[heatmapSizeBy])
                        );
                        const maxValue = Math.max(...allValues);
                        const minValue = Math.min(...allValues);
                        const normalizedSize = minSize + ((sizeValue - minValue) / (maxValue - minValue || 1)) * (maxSize - minSize);
                        
                        return (
                          <div
                            key={stock.code}
                            className="relative rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:scale-105 flex flex-col items-center justify-center p-4 border-2 border-white/10"
                            style={{
                              backgroundColor: getHeatmapColor(performance),
                              width: `${normalizedSize}px`,
                              height: `${normalizedSize}px`,
                            }}
                          >
                            <div className="text-center">
                              <div className="text-white font-bold text-2xl mb-1">{stock.code}</div>
                              <div className="text-white text-sm opacity-90 mb-2">{stock.name}</div>
                              <div className="text-white font-bold text-3xl">
                                {performance > 0 ? '+' : ''}{performance.toFixed(1)}%
                              </div>
                              <div className="text-white text-xs mt-2 opacity-80">
                                {heatmapColorBy} Performance
                              </div>
                              {heatmapSizeBy === 'marketCap' && (
                                <div className="text-white text-xs mt-1 opacity-70">
                                  Cap: ${stock.marketCap}
                                </div>
                              )}
                              {heatmapSizeBy === 'pe' && (
                                <div className="text-white text-xs mt-1 opacity-70">
                                  P/E: {stock.pe}
                                </div>
                              )}
                            </div>
                            {stock.code !== selectedStock.code && (
                              <button
                                onClick={() => removeComparison(stock.code)}
                                className="absolute top-2 right-2 p-1 bg-red-500 hover:bg-red-600 rounded-full transition"
                              >
                                <X size={14} className="text-white" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    
                    <div className="mt-6 pt-6 border-t border-gray-700">
                      <div className="flex items-center justify-center gap-8">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-300 text-sm">Color Legend:</span>
                          <div className="flex gap-1">
                            <div className="w-8 h-8 rounded" style={{ backgroundColor: '#10b981' }}></div>
                            <div className="w-8 h-8 rounded" style={{ backgroundColor: '#84cc16' }}></div>
                            <div className="w-8 h-8 rounded" style={{ backgroundColor: '#eab308' }}></div>
                            <div className="w-8 h-8 rounded" style={{ backgroundColor: '#f97316' }}></div>
                            <div className="w-8 h-8 rounded" style={{ backgroundColor: '#ef4444' }}></div>
                            <div className="w-8 h-8 rounded" style={{ backgroundColor: '#991b1b' }}></div>
                          </div>
                          <span className="text-gray-300 text-sm ml-2">
                            <span className="text-green-400">+20%</span> to <span className="text-red-400">-20%</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

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