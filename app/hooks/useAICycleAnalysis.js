import { useState, useEffect } from 'react';

/**
 * Custom hook for AI-powered cycle analysis
 * Handles fetching, caching, and state management for cycle analysis
 */
export function useAICycleAnalysis(selectedStock, fullHistoricalData) {
  const [cycleAnalysis, setCycleAnalysis] = useState(null);
  const [cycleLoading, setCycleLoading] = useState(false);
  const [cycleError, setCycleError] = useState(null);
  const [showCycleAnalysis, setShowCycleAnalysis] = useState(false);

  // Check localStorage for cached analysis on mount
  useEffect(() => {
    if (!selectedStock) {
      setCycleAnalysis(null);
      setShowCycleAnalysis(false);
      return;
    }

    const cacheKey = `ai-cycle-${selectedStock.code}`;
    const cached = localStorage.getItem(cacheKey);

    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        const cacheAge = Date.now() - parsed.timestamp;
        const CACHE_DURATION = 4 * 60 * 60 * 1000; // 4 hours

        if (cacheAge < CACHE_DURATION) {
          console.log('Using cached AI cycle analysis for', selectedStock.code);
          setCycleAnalysis(parsed.data);
          setShowCycleAnalysis(true);
        } else {
          localStorage.removeItem(cacheKey);
        }
      } catch (err) {
        console.error('Error parsing cached cycle analysis:', err);
        localStorage.removeItem(cacheKey);
      }
    }
  }, [selectedStock]);

  const handleCycleAnalysis = async (forceReload = false) => {
    if (!selectedStock || !fullHistoricalData || fullHistoricalData.length === 0) {
      setCycleError('No price data available for cycle analysis');
      return;
    }

    setCycleLoading(true);
    setCycleError(null);

    try {
      const response = await fetch('/api/ai-cycle-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: selectedStock.code,
          priceData: fullHistoricalData,
          currentPrice: selectedStock.price,
          forceReload
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze cycles');
      }

      // Cache in localStorage
      const cacheKey = `ai-cycle-${selectedStock.code}`;
      localStorage.setItem(cacheKey, JSON.stringify({
        data,
        timestamp: Date.now()
      }));

      setCycleAnalysis(data);
      setShowCycleAnalysis(true);
    } catch (error) {
      console.error('AI Cycle Analysis Error:', error);
      setCycleError(error.message);
    } finally {
      setCycleLoading(false);
    }
  };

  return {
    cycleAnalysis,
    cycleLoading,
    cycleError,
    showCycleAnalysis,
    setShowCycleAnalysis,
    handleCycleAnalysis
  };
}
