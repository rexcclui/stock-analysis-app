'use client';

import React, { useState } from 'react';
// Chart now extracted to PricePerformanceChart component
import { Search, BarChart3, RotateCcw } from 'lucide-react';
import { ComparisonSection } from './components/Comparison/ComparisonSection';
import { PricePerformanceChart } from './components/PricePerformanceChart';
import { NewsSection } from './components/NewsSection';
import { SentimentSection } from './components/SentimentSection';
import { SentimentTimeSeriesChart } from './components/SentimentTimeSeriesChart';
import { StockResultCard } from './components/StockResultCard';
import { HistoricalPerformanceCheck } from './components/HistoricalPerformanceCheck';
import { LoadingState } from './components/LoadingState';
import { Tabs, TabPanel } from './components/Tabs';
import { AINewsSummary } from './components/AINewsSummary';
import { fetchWithCache, fetchPostWithCache, CACHE_DURATIONS, clearAllClientCache } from '../lib/clientCache';

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
const fetchCompleteStockData = async (symbol, apiCounts = null, forceReload = false) => {
  try {
    // Fetch stock data (required) - NO CACHE for live stock data
    if (apiCounts) apiCounts.stock++;
    const stockUrl = `/api/stock?symbol=${symbol}${forceReload ? `&nocache=${Date.now()}` : ''}`;
    const stock = await fetchWithCache(stockUrl, {}, CACHE_DURATIONS.NONE);
    if (stock.error) {
      console.error(`Stock error: ${stock.error}`);
      return null;
    }

    // Fetch sentiment data (optional - use defaults if fails) - 4 HOUR CACHE
    let sentiment = { score: 0.5, positive: 50, neutral: 30, negative: 20, sentimentHistory: { '1D': 0.5, '7D': 0.5, '1M': 0.5 }, sentimentTimeSeries: [] };
    try {
      if (apiCounts) apiCounts.sentiment++;
      sentiment = await fetchWithCache(
        `/api/sentiment?symbol=${symbol}`,
        { forceReload },
        CACHE_DURATIONS.FOUR_HOURS
      );
    } catch (err) {
      console.warn('Sentiment fetch failed, using defaults:', err.message);
    }

    // Fetch related stocks (optional) - 4 HOUR CACHE
    let relatedStocksData = [];
    let fetchedComparisonType = 'related';
    try {
      if (apiCounts) apiCounts.competitors++;
      const relatedData = await fetchWithCache(
        `/api/related-stocks?symbol=${symbol}`,
        { forceReload },
        CACHE_DURATIONS.FOUR_HOURS
      );
      if (relatedData && relatedData.relatedStocks) {
        relatedStocksData = relatedData.relatedStocks; // Array of { symbol, name, relationshipType }
      }
    } catch (err) {
      console.warn('Related stocks fetch failed:', err.message);
    }

    // Fetch news (optional) - 4 HOUR CACHE
    let news = [];
    try {
        if (apiCounts) apiCounts.news++;
        news = await fetchWithCache(
          `/api/news?symbol=${symbol}`,
          { forceReload },
          CACHE_DURATIONS.FOUR_HOURS
        );
        console.log(`[PAGE] News received: ${Array.isArray(news) ? news.length : 0} articles`);
    } catch (err) {
        console.warn('[PAGE] News fetch failed:', err.message);
    }

    // Fetch Google News (optional) - 4 HOUR CACHE
    let googleNews = [];
    try {
        if (apiCounts) apiCounts.googleNews = (apiCounts.googleNews || 0) + 1;
        googleNews = await fetchWithCache(
          `/api/google-news?symbol=${symbol}`,
          { forceReload },
          CACHE_DURATIONS.FOUR_HOURS
        );
        console.log(`[PAGE] Google News received: ${Array.isArray(googleNews) ? googleNews.length : 0} articles`);
    } catch (err) {
        console.warn('[PAGE] Google News fetch failed:', err.message);
    }

    // Fetch Yahoo News (optional) - 4 HOUR CACHE
    let yahooNews = [];
    try {
        if (apiCounts) apiCounts.yahooNews = (apiCounts.yahooNews || 0) + 1;
        yahooNews = await fetchWithCache(
          `/api/yahoo-news?symbol=${symbol}`,
          { forceReload },
          CACHE_DURATIONS.FOUR_HOURS
        );
        console.log(`[PAGE] Yahoo News received: ${Array.isArray(yahooNews) ? yahooNews.length : 0} articles`);
    } catch (err) {
        console.warn('[PAGE] Yahoo News fetch failed:', err.message);
    }

    // Fetch Bloomberg News (optional) - 4 HOUR CACHE
    let bloombergNews = [];
    try {
        if (apiCounts) apiCounts.bloombergNews = (apiCounts.bloombergNews || 0) + 1;
        bloombergNews = await fetchWithCache(
          `/api/bloomberg-news?symbol=${symbol}`,
          { forceReload },
          CACHE_DURATIONS.FOUR_HOURS
        );
        console.log(`[PAGE] Bloomberg News received: ${Array.isArray(bloombergNews) ? bloombergNews.length : 0} articles`);
    } catch (err) {
        console.warn('[PAGE] Bloomberg News fetch failed:', err.message);
    }

    return {
      ...stock,
      sentiment,
      sentimentHistory: sentiment.sentimentHistory, // Ensure this is passed
      sentimentTimeSeries: sentiment.sentimentTimeSeries,
      relatedStocks: Array.isArray(relatedStocksData) ? relatedStocksData : [],
      news: Array.isArray(news) ? news : [],
      googleNews: Array.isArray(googleNews) ? googleNews : [],
      yahooNews: Array.isArray(yahooNews) ? yahooNews : [],
      bloombergNews: Array.isArray(bloombergNews) ? bloombergNews : [],
      comparisonType: fetchedComparisonType
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
  const [comparisonType, setComparisonType] = useState('industry'); // 'industry' or 'sector'
  const [relationshipTypeFilter, setRelationshipTypeFilter] = useState('all'); // 'all', 'industry', 'sector', 'competitor', 'etf'
  const [comparisonRowSize, setComparisonRowSize] = useState(30); // 10, 30, 50, 100
  const [manualStock, setManualStock] = useState('');
  const [savedComparisons, setSavedComparisons] = useState({});
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('table');
  const [heatmapColorBy, setHeatmapColorBy] = useState('1D');
  const [heatmapSizeBy, setHeatmapSizeBy] = useState('marketCap');
  const [searchHistory, setSearchHistory] = useState([]);
  const [news, setNews] = useState([]);
  const [googleNews, setGoogleNews] = useState([]);
  const [yahooNews, setYahooNews] = useState([]);
  const [bloombergNews, setBloombergNews] = useState([]);
  const [aiNewsAnalysis, setAiNewsAnalysis] = useState(null);
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false);
  const [aiAnalysisError, setAiAnalysisError] = useState(null);
  // Detailed search history entries with day change for table (bounded by 3 rows dynamic columns)
  const [searchHistoryStocks, setSearchHistoryStocks] = useState([]); // array of { code, dayChange }
  const HISTORY_COL_WIDTH = 140; // approximate width for each cell
  const [activeTab, setActiveTab] = useState('main'); // 'main' or 'historical-data-analysis'

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
      const updated = [{ code: entry.code, dayChange: normalizeDayChange(entry.dayChange), timestamp: new Date().toISOString() }, ...filtered];
      const capacity = maxCapacity();
      if (updated.length > capacity) {
        return updated.slice(0, capacity); // drop oldest beyond capacity
      }
      return updated;
    });
  };

  const removeSearchHistoryStock = (code) => {
    setSearchHistoryStocks(prev => prev.filter(e => e.code !== code));
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
          setSearchHistoryStocks(parsed.map(e => ({
            code: e.code,
            dayChange: normalizeDayChange(e.dayChange),
            timestamp: e.timestamp || new Date().toISOString() // fallback for old data
          })));
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
        if (stockData && stockData.code) {
          handleSearch(stockData.code);
        }
      } catch {}
    }
    const savedNews = localStorage.getItem('selectedStockNews');
    if (savedNews) {
      try {
        setNews(JSON.parse(savedNews));
      } catch {}
    }
    const savedGoogleNews = localStorage.getItem('selectedStockGoogleNews');
    if (savedGoogleNews) {
      try {
        setGoogleNews(JSON.parse(savedGoogleNews));
      } catch {}
    }
    const savedYahooNews = localStorage.getItem('selectedStockYahooNews');
    if (savedYahooNews) {
      try {
        setYahooNews(JSON.parse(savedYahooNews));
      } catch {}
    }
    const savedBloombergNews = localStorage.getItem('selectedStockBloombergNews');
    if (savedBloombergNews) {
      try {
        setBloombergNews(JSON.parse(savedBloombergNews));
      } catch {}
    }
    const savedComparisonStocks = localStorage.getItem('comparisonStocks');
    if (savedComparisonStocks) {
      try {
        const parsed = JSON.parse(savedComparisonStocks);
        // Filter out SPY and QQQ as they're automatically added
        const filtered = parsed.filter(s => s.code !== 'SPY' && s.code !== 'QQQ');
        setComparisonStocks(filtered);
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

  // Persist Google News whenever it changes
  React.useEffect(() => {
    if (!isClient) return;
    try {
      if (googleNews && googleNews.length > 0) {
        localStorage.setItem('selectedStockGoogleNews', JSON.stringify(googleNews));
      } else {
        localStorage.removeItem('selectedStockGoogleNews');
      }
    } catch {}
  }, [googleNews, isClient]);

  // Persist Yahoo News whenever it changes
  React.useEffect(() => {
    if (!isClient) return;
    try {
      if (yahooNews && yahooNews.length > 0) {
        localStorage.setItem('selectedStockYahooNews', JSON.stringify(yahooNews));
      } else {
        localStorage.removeItem('selectedStockYahooNews');
      }
    } catch {}
  }, [yahooNews, isClient]);

  // Persist Bloomberg News whenever it changes
  React.useEffect(() => {
    if (!isClient) return;
    try {
      if (bloombergNews && bloombergNews.length > 0) {
        localStorage.setItem('selectedStockBloombergNews', JSON.stringify(bloombergNews));
      } else {
        localStorage.removeItem('selectedStockBloombergNews');
      }
    } catch {}
  }, [bloombergNews, isClient]);

  // Persist comparison stocks whenever they change
  React.useEffect(() => {
    if (!isClient) return;
    try {
      if (comparisonStocks && comparisonStocks.length > 0) {
        // Filter out SPY and QQQ before saving (they're auto-added on search)
        const filtered = comparisonStocks.filter(s => s.code !== 'SPY' && s.code !== 'QQQ');
        if (filtered.length > 0) {
          localStorage.setItem('comparisonStocks', JSON.stringify(filtered));
        } else {
          localStorage.removeItem('comparisonStocks');
        }
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

  // Fetch AI news analysis - 12 HOUR CACHE
  const fetchAINewsAnalysis = async (symbol, newsData, forceReload = false) => {
    try {
      setAiAnalysisLoading(true);
      setAiAnalysisError(null);
      console.log(`[AI Analysis] Fetching analysis for ${symbol}${forceReload ? ' (force reload)' : ''}`);

      const analysis = await fetchPostWithCache(
        '/api/analyze-news',
        {
          symbol,
          newsApiNews: newsData.newsApiNews || [],
          googleNews: newsData.googleNews || [],
          yahooNews: newsData.yahooNews || [],
          bloombergNews: newsData.bloombergNews || [],
          forceReload
        },
        CACHE_DURATIONS.TWELVE_HOURS
      );

      console.log('[AI Analysis] Analysis received:', analysis);
      setAiNewsAnalysis(analysis);
      setAiAnalysisError(null);
    } catch (error) {
      console.error('[AI Analysis] Fetch error:', error);
      setAiNewsAnalysis(null);
      setAiAnalysisError(error.message || 'Failed to connect to AI service');
    } finally {
      setAiAnalysisLoading(false);
    }
  };

  // Handler for manual AI analysis trigger
  const handleAnalyzeNews = (forceReload = false) => {
    if (!selectedStock?.code) return;

    fetchAINewsAnalysis(selectedStock.code, {
      newsApiNews: news,
      googleNews: googleNews,
      yahooNews: yahooNews,
      bloombergNews: bloombergNews
    }, forceReload).catch(err => console.error('[AI Analysis] Failed:', err));
  };

  const handleSearch = async (overrideCode) => {
    setLoading(true);
    const stockCode = (overrideCode || searchInput).toUpperCase();
    if (!stockCode) { setLoading(false); return; }

    // Clear previous data immediately to avoid confusion
    setSelectedStock(null);
    setNews([]);
    setGoogleNews([]);
    setYahooNews([]);
    setBloombergNews([]);
    setAiNewsAnalysis(null);
    setAiAnalysisError(null);
    setComparisonStocks([]);
    setChartCompareStocks([]);
    
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
      setGoogleNews(stockData.googleNews);
      setYahooNews(stockData.yahooNews);
      setBloombergNews(stockData.bloombergNews);
      setComparisonType(stockData.comparisonType || 'industry');
      addToSearchHistory(stockCode);

      // Always fetch SPY and QQQ for comparison (unless the selected stock is SPY or QQQ)
      const benchmarkCodes = ['SPY', 'QQQ'].filter(code => code !== stockCode);
      const benchmarkPromises = benchmarkCodes.map(code => fetchCompleteStockData(code, apiCounts));
      const benchmarkData = await Promise.all(benchmarkPromises);
      const validBenchmarks = benchmarkData.filter(b => b !== null);

      // Filter out SPY and QQQ from related stocks to avoid duplicates
      const relatedPromises = (stockData.relatedStocks || [])
        .filter(item => item.symbol !== 'SPY' && item.symbol !== 'QQQ')
        .map(item =>
          fetchCompleteStockData(item.symbol, apiCounts).then(stock =>
            stock ? { ...stock, relationshipType: item.relationshipType } : null
          )
        );
      const relatedData = await Promise.all(relatedPromises);
      const validRelated = relatedData.filter(c => c !== null);

      const saved = savedComparisons[stockCode] || [];
      // Filter out SPY and QQQ from saved comparisons to avoid duplicates
      const savedPromises = saved
        .filter(code => code !== 'SPY' && code !== 'QQQ')
        .map(code => fetchCompleteStockData(code, apiCounts));
      const savedData = await Promise.all(savedPromises);
      const validSaved = savedData.filter(s => s !== null);

      // SPY and QQQ first, then related stocks and saved stocks
      // Deduplicate based on stock code to prevent duplicates
      const allStocks = [...validBenchmarks, ...validRelated, ...validSaved];
      const uniqueStocks = allStocks.reduce((acc, stock) => {
        if (!acc.find(s => s.code === stock.code)) {
          acc.push(stock);
        }
        return acc;
      }, []);
      setComparisonStocks(uniqueStocks);

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

  // Force reload: Clear all caches (client + server) and reload current stock
  const handleForceReload = async () => {
    if (!selectedStock) {
      alert('No stock loaded. Please search for a stock first.');
      return;
    }

    if (!confirm('This will clear all cached data and reload fresh data. Continue?')) {
      return;
    }

    setLoading(true);

    try {
      // Clear client cache
      const clientCleared = clearAllClientCache();
      console.log(`[Force Reload] Cleared ${clientCleared} client cache entries`);

      // Clear server cache
      const response = await fetch('/api/clear-cache');
      const result = await response.json();
      console.log('[Force Reload] Server cache clear result:', result);

      // Reload current stock with force reload
      await handleSearch(selectedStock.code);

      alert('Cache cleared and data reloaded successfully!');
    } catch (error) {
      console.error('[Force Reload] Error:', error);
      alert('Error clearing cache. Please try again.');
    } finally {
      setLoading(false);
    }
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

  // Handler to toggle stock in chart from comparison table
  const handleAddToChart = async (code) => {
    if (!selectedStock) {
      alert('Load a primary stock first');
      return;
    }
    if (code === selectedStock.code) {
      alert('This is the primary stock');
      return;
    }

    // Check if stock is already in chart - if so, remove it
    if (chartCompareStocks.find(s => s.code === code)) {
      setChartCompareStocks(chartCompareStocks.filter(s => s.code !== code));
      return;
    }

    // Add to chart
    // Check if stock is already in comparisonStocks
    const existingStock = comparisonStocks.find(s => s.code === code);
    if (existingStock) {
      // Use existing stock data
      const series = buildNormalizedSeries(existingStock, chartPeriod);
      if (!series.length) {
        alert('No chart data for this period');
        return;
      }
      setChartCompareStocks([...chartCompareStocks, { code, series, __stockRef: existingStock }]);
    } else {
      // Fetch the stock data
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
    }
  };

  const addManualComparison = async () => {
    const code = manualStock.toUpperCase();

    if (!code || !selectedStock) return;

    if (code === 'SPY' || code === 'QQQ') {
      alert('SPY and QQQ are automatically included as benchmarks');
      setManualStock('');
      return;
    }

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
              {loading ? <span className="italic" style={{ color: '#22d3ee' }}>Loading...</span> : 'Search'}
            </button>
            <button
              onClick={handleForceReload}
              disabled={loading || !selectedStock}
              className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Clear all caches and reload fresh data"
            >
              <RotateCcw size={20} />
              Force Reload
            </button>
          </div>

          {isClient && searchHistoryStocks.length > 0 && (
            <div className="mb-6 flex items-center flex-wrap" style={{ gap: '3px' }}>
              <span className="text-sm text-gray-400">Recent Searches:</span>
              {searchHistoryStocks.map((item) => (
                <button
                  key={item.code + item.dayChange}
                  onClick={() => {
                    handleSearch(item.code);
                  }}
                  style={{ margin: '1px 2px', backgroundColor: 'transparent', color: '#9CA3AF', border: '1px solid #4B5563' }}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition hover:border-gray-400 hover:text-gray-300`}
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

          {!selectedStock && loading && (
            <LoadingState message="Fetching latest stock data..." className="mb-6" />
          )}

          {selectedStock && (
            <>
              {loading && (
                <LoadingState message="Fetching latest stock data..." className="mb-6" />
              )}
              <StockResultCard stock={selectedStock} loading={loading} />

              <Tabs
                activeTab={activeTab}
                onTabChange={setActiveTab}
                tabs={[
                  { id: 'main', label: 'Main' },
                  { id: 'historical-data-analysis', label: 'Historical Data Analysis' }
                ]}
              />

              <TabPanel activeTab={activeTab} tabId="main">
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
                loading={loading}
              />

              <SentimentTimeSeriesChart
                sentimentTimeSeries={selectedStock.sentimentTimeSeries}
                loading={loading}
              />

              <ComparisonSection
                selectedStock={selectedStock}
                comparisonStocks={comparisonStocks}
                comparisonType={comparisonType}
                relationshipTypeFilter={relationshipTypeFilter}
                onRelationshipTypeFilterChange={setRelationshipTypeFilter}
                comparisonRowSize={comparisonRowSize}
                onComparisonRowSizeChange={setComparisonRowSize}
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
                onRemoveSearchHistoryStock={removeSearchHistoryStock}
                onReloadSearchHistory={reloadRecentSearches}
                onAddToChart={handleAddToChart}
                chartCompareStocks={chartCompareStocks}
              />

              <SentimentSection sentiment={selectedStock.sentiment} loading={loading} />

              <AINewsSummary
                analysis={aiNewsAnalysis}
                loading={aiAnalysisLoading}
                error={aiAnalysisError}
                onAnalyze={handleAnalyzeNews}
                hasNews={news.length > 0 || googleNews.length > 0 || yahooNews.length > 0 || bloombergNews.length > 0}
                symbol={selectedStock.code}
              />

              <NewsSection newsApiNews={news} googleNews={googleNews} yahooNews={yahooNews} bloombergNews={bloombergNews} loading={loading} symbol={selectedStock.code} />
              </TabPanel>

              <TabPanel activeTab={activeTab} tabId="historical-data-analysis">
                <HistoricalPerformanceCheck stockCode={selectedStock.code} />
              </TabPanel>
            </>
          )}
        </div>
      </div>
    </div>
  );
}