'use client';

import React, { useState } from 'react';
// Chart now extracted to PricePerformanceChart component
import { Search, BarChart3 } from 'lucide-react';
import { ComparisonSection } from './components/ComparisonSection';
import { PricePerformanceChart } from './components/PricePerformanceChart';
import { NewsSection } from './components/NewsSection';
import { SentimentSection } from './components/SentimentSection';
import { SentimentTimeSeriesChart } from './components/SentimentTimeSeriesChart';
import { StockResultCard } from './components/StockResultCard';
import { HistoricalPerformanceCheck } from './components/HistoricalPerformanceCheck';

// Helper function to fetch with timeout
const fetchWithTimeout = (url, timeout = 10000) => {
  return Promise.race([
    fetch(url),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeout)
    )
  ]);
};

// Fetch complete stock data from API routes
const fetchCompleteStockData = async (symbol, apiCounts = null) => {
  try {
    // Fetch stock data (required)
    if (apiCounts) apiCounts.stock++;
    const stockRes = await fetchWithTimeout(`/api/stock?symbol=${symbol}`, 15000);
    if (!stockRes.ok) {
      console.error(`Stock API error: ${stockRes.status}` + stockRes.statusText);
      return null;
    }
    const stock = await stockRes.json();
    if (stock.error) {
      console.error(`Stock error: ${stock.error}`);
      return null;
    }

    // Fetch sentiment data (optional - use defaults if fails)
    let sentiment = { score: 0.5, positive: 50, neutral: 30, negative: 20, sentimentHistory: { '1D': 0.5, '7D': 0.5, '1M': 0.5 }, sentimentTimeSeries: [] };
    try {
      if (apiCounts) apiCounts.sentiment++;
      const sentimentRes = await fetchWithTimeout(`/api/sentiment?symbol=${symbol}`, 10000);
      if (sentimentRes.ok) {
        sentiment = await sentimentRes.json();
      }
    } catch (err) {
      console.warn('Sentiment fetch failed, using defaults:', err.message);
    }

    // Fetch competitors (optional)
    let competitors = [];
    try {
      if (apiCounts) apiCounts.competitors++;
      const competitorsRes = await fetchWithTimeout(`/api/competitors?industry=${stock.industry}&exclude=${symbol}`, 10000);
      if (competitorsRes.ok) {
        competitors = await competitorsRes.json();
        if (!Array.isArray(competitors)) competitors = [];
      }
    } catch (err) {
      console.warn('Competitors fetch failed:', err.message);
    }

    // Fetch news (optional)
    let news = [];
    try {
        if (apiCounts) apiCounts.news++;
        const newsRes = await fetchWithTimeout(`/api/news?symbol=${symbol}`, 10000);
        if (newsRes.ok) {
            news = await newsRes.json();
        } else {
            console.warn(`News API returned: ${newsRes.status}`);
        }
    } catch (err) {
        console.warn('News fetch failed:', err.message);
    }

    return {
      ...stock,
      sentiment,
      sentimentHistory: sentiment.sentimentHistory, // Ensure this is passed
      sentimentTimeSeries: sentiment.sentimentTimeSeries,
      competitors: Array.isArray(competitors) ? competitors : [],
      news: Array.isArray(news) ? news : []
    };
  } catch (error) {
    console.error('Fetch error:', error);
    return null;
  }
};

// (Moved sentiment color helper into StockResultCard component)

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
  const [news, setNews] = useState([]);
  // Detailed search history entries with day change for table (bounded by 3 rows dynamic columns)
  const [searchHistoryStocks, setSearchHistoryStocks] = useState([]); // array of { code, dayChange }
  const HISTORY_COL_WIDTH = 140; // approximate width for each cell

  // Normalize possible percentage string or numeric into clean number
  const normalizeDayChange = (val) => {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'string') {
      const cleaned = val.replace(/[%()]/g, '').trim();
      const num = parseFloat(cleaned.replace(/[^0-9.+-]/g, ''));
      if (isNaN(num)) return 0;
      return cleaned.startsWith('-') ? -Math.abs(num) : Math.abs(num);
    }
    const num = Number(val);
    return isNaN(num) ? 0 : num;
  };

  const computeMaxColumns = () => {
    if (typeof window === 'undefined') return 8; // fallback
    return Math.max(1, Math.floor(window.innerWidth / HISTORY_COL_WIDTH));
  };
  const [historyCols, setHistoryCols] = useState(computeMaxColumns());

  React.useEffect(() => {
    const handleResize = () => setHistoryCols(computeMaxColumns());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const MAX_ROWS = 3;
  const maxCapacity = () => historyCols * MAX_ROWS;

  const addSearchHistoryStock = (entry) => {
    setSearchHistoryStocks(prev => {
      const filtered = prev.filter(e => e.code !== entry.code); // dedupe
      const updated = [{ code: entry.code, dayChange: normalizeDayChange(entry.dayChange) }, ...filtered];
      const capacity = maxCapacity();
      if (updated.length > capacity) {
        return updated.slice(0, capacity); // drop oldest beyond capacity
      }
      return updated;
    });
  };
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
    const savedDetailed = localStorage.getItem('stockSearchHistoryDetailed');
    if (savedDetailed) {
      try {
        const parsed = JSON.parse(savedDetailed);
        if (Array.isArray(parsed)) {
          setSearchHistoryStocks(parsed.map(e => ({ code: e.code, dayChange: normalizeDayChange(e.dayChange) })));
        }
      } catch {}
    }
    // Load chartPeriod from localStorage
    const savedPeriod = localStorage.getItem('chartPeriod');
    if (savedPeriod) {
      setChartPeriod(savedPeriod);
    }
    // Load selected stock and related data from localStorage
    const savedStock = localStorage.getItem('selectedStock');
    if (savedStock) {
      try {
        const stockData = JSON.parse(savedStock);
        setSelectedStock(stockData);
        setSearchInput(stockData.code);
      } catch {}
    }
    const savedNews = localStorage.getItem('selectedStockNews');
    if (savedNews) {
      try {
        setNews(JSON.parse(savedNews));
      } catch {}
    }
    const savedComparisonStocks = localStorage.getItem('comparisonStocks');
    if (savedComparisonStocks) {
      try {
        setComparisonStocks(JSON.parse(savedComparisonStocks));
      } catch {}
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

  // Persist detailed history whenever it changes
  React.useEffect(() => {
    if (!isClient) return;
    try {
      localStorage.setItem('stockSearchHistoryDetailed', JSON.stringify(searchHistoryStocks));
    } catch {}
  }, [searchHistoryStocks, isClient]);

  // Persist selected stock whenever it changes
  React.useEffect(() => {
    if (!isClient) return;
    try {
      if (selectedStock) {
        localStorage.setItem('selectedStock', JSON.stringify(selectedStock));
      } else {
        localStorage.removeItem('selectedStock');
      }
    } catch {}
  }, [selectedStock, isClient]);

  // Persist news whenever it changes
  React.useEffect(() => {
    if (!isClient) return;
    try {
      if (news && news.length > 0) {
        localStorage.setItem('selectedStockNews', JSON.stringify(news));
      } else {
        localStorage.removeItem('selectedStockNews');
      }
    } catch {}
  }, [news, isClient]);

  // Persist comparison stocks whenever they change
  React.useEffect(() => {
    if (!isClient) return;
    try {
      if (comparisonStocks && comparisonStocks.length > 0) {
        localStorage.setItem('comparisonStocks', JSON.stringify(comparisonStocks));
      } else {
        localStorage.removeItem('comparisonStocks');
      }
    } catch {}
  }, [comparisonStocks, isClient]);

  // Persist chart period whenever it changes
  React.useEffect(() => {
    if (!isClient) return;
    try {
      localStorage.setItem('chartPeriod', chartPeriod);
    } catch {}
  }, [chartPeriod, isClient]);


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

  const handleSearch = async (overrideCode) => {
    setLoading(true);
    const stockCode = (overrideCode || searchInput).toUpperCase();
    if (!stockCode) { setLoading(false); return; }

    // Always reflect clicked/typed code in the input
    setSearchInput(stockCode);
    
    // Initialize API counter
    const apiCounts = { stock: 0, sentiment: 0, news: 0, competitors: 0 };
    
    try {
      const stockData = await fetchCompleteStockData(stockCode, apiCounts);
      
      if (!stockData) {
        alert('Stock not found or API error. Please check your API keys in .env.local');
        setLoading(false);
        return;
      }
      
      setSelectedStock(stockData);
      setNews(stockData.news);
      addToSearchHistory(stockCode);
      
      // Always fetch SPY and QQQ for comparison (unless the selected stock is SPY or QQQ)
      const benchmarkCodes = ['SPY', 'QQQ'].filter(code => code !== stockCode);
      const benchmarkPromises = benchmarkCodes.map(code => fetchCompleteStockData(code, apiCounts));
      const benchmarkData = await Promise.all(benchmarkPromises);
      const validBenchmarks = benchmarkData.filter(b => b !== null);

      const competitorPromises = stockData.competitors.map(code => fetchCompleteStockData(code, apiCounts));
      const competitorData = await Promise.all(competitorPromises);
      const validCompetitors = competitorData.filter(c => c !== null);

      const saved = savedComparisons[stockCode] || [];
      const savedPromises = saved.map(code => fetchCompleteStockData(code, apiCounts));
      const savedData = await Promise.all(savedPromises);
      const validSaved = savedData.filter(s => s !== null);

      // SPY and QQQ first, then competitors and saved stocks
      setComparisonStocks([...validBenchmarks, ...validCompetitors, ...validSaved]);

      // Add to detailed history table
      addSearchHistoryStock({ code: stockData.code, dayChange: stockData.dayChange || 0 });

      // Also update existing chart compare series baseline to new period
      setChartCompareStocks(prev => prev.map(s => ({
        ...s,
        series: buildNormalizedSeries(s.__stockRef, chartPeriod)
      })));
      
      // Log API call summary to server
      const totalCalls = apiCounts.stock + apiCounts.sentiment + apiCounts.news + apiCounts.competitors;
      console.log('[Client] Sending API counts to server:', apiCounts);
      fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ counts: apiCounts })
      }).then(res => {
        console.log('[Client] Tracking response:', res.status);
      }).catch(err => console.error('[Client] Failed to send tracking data:', err));
      
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
    const stock = await fetchCompleteStockData(code, null);
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
    const stock = await fetchCompleteStockData(code, null);
    
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

  const reloadRecentSearches = async () => {
    if (searchHistoryStocks.length === 0) return;

    setLoading(true);
    try {
      // Fetch fresh data for all stocks in search history with cache bypass
      const promises = searchHistoryStocks.map(item =>
        fetch(`/api/stock?symbol=${item.code}&nocache=${Date.now()}`, { cache: 'no-store' })
          .then(res => res.json())
          .catch(err => {
            console.error(`Failed to reload ${item.code}:`, err);
            return null;
          })
      );

      const results = await Promise.all(promises);

      // Update searchHistoryStocks with fresh data
      const updatedHistory = results
        .filter(stock => stock && !stock.error)
        .map(stock => ({
          code: stock.code,
          dayChange: normalizeDayChange(stock.dayChange || 0)
        }));

      setSearchHistoryStocks(updatedHistory);

      console.log('Recent searches reloaded with fresh data');
    } catch (error) {
      console.error('Error reloading recent searches:', error);
      alert('Failed to reload some stocks. Please try again.');
    } finally {
      setLoading(false);
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

          {isClient && searchHistoryStocks.length > 0 && (
            <div className="mb-6 flex items-center gap-3 flex-wrap">
              <span className="text-sm text-gray-400">Recent Searches:</span>
              {searchHistoryStocks.map((item) => (
                <button
                  key={item.code + item.dayChange}
                  onClick={() => {
                    handleSearch(item.code);
                  }}
                  className={`px-3 py-1 text-white rounded-lg text-sm font-medium transition ${
                    item.dayChange > 0
                      ? 'bg-green-700 hover:bg-green-600 border border-green-600 hover:border-green-500'
                      : item.dayChange < 0
                      ? 'bg-red-700 hover:bg-red-600 border border-red-600 hover:border-red-500'
                      : 'bg-gray-700 hover:bg-gray-600 border border-gray-600 hover:border-gray-500'
                  }`}
                >
                  {item.code}
                </button>
              ))}
            </div>
          )}

          {!selectedStock && (
            <div className="text-center py-12">
              <p className="text-gray-300 text-lg mb-4">Search for a stock to get started</p>
              <div className="flex items-center justify-center gap-3 flex-wrap mt-4">
                <span className="text-gray-400 text-sm">Try:</span>
                {['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'AMZN'].map((stock) => (
                  <button
                    key={stock}
                    onClick={() => handleSearch(stock)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                  >
                    {stock}
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedStock && (
            <>
              <StockResultCard stock={selectedStock} />

              <HistoricalPerformanceCheck stockCode={selectedStock.code} />

              <PricePerformanceChart
                selectedStock={selectedStock}
                chartPeriod={chartPeriod}
                setChartPeriod={setChartPeriod}
                periods={periods}
                chartCompareStocks={chartCompareStocks}
                addChartCompareStock={addChartCompareStock}
                removeChartCompareStock={removeChartCompareStock}
                chartCompareInput={chartCompareInput}
                setChartCompareInput={setChartCompareInput}
                buildNormalizedSeries={buildNormalizedSeries}
                buildMultiStockDataset={buildMultiStockDataset}
              />

              <SentimentTimeSeriesChart
                sentimentTimeSeries={selectedStock.sentimentTimeSeries}
              />

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
                searchHistoryStocks={searchHistoryStocks}
                onSearchHistoryCodeClick={(code)=> { handleSearch(code); }}
                onReloadSearchHistory={reloadRecentSearches}
              />

              <SentimentSection sentiment={selectedStock.sentiment} />

              <NewsSection news={news} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}