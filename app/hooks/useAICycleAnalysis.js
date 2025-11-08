import { useState, useEffect } from 'react';
import { fetchPostWithCache, CACHE_DURATIONS } from '../../lib/clientCache';

/**
 * Custom hook for AI-powered cycle analysis
 * Handles fetching, caching, and state management for cycle analysis
 */
export function useAICycleAnalysis(selectedStock, fullHistoricalData) {
  const [cycleAnalysis, setCycleAnalysis] = useState(null);
  const [cycleLoading, setCycleLoading] = useState(false);
  const [cycleError, setCycleError] = useState(null);
  const [showCycleAnalysis, setShowCycleAnalysis] = useState(false);

  // Reset cycle analysis when stock changes
  useEffect(() => {
    if (!selectedStock) {
      setCycleAnalysis(null);
      setShowCycleAnalysis(false);
      return;
    }
  }, [selectedStock]);

  // Handle AI cycle analysis - 12 HOUR CACHE
  const handleCycleAnalysis = async (forceReload = false) => {
    if (!selectedStock || !fullHistoricalData || fullHistoricalData.length === 0) {
      setCycleError('No price data available for cycle analysis');
      return;
    }

    setCycleLoading(true);
    setCycleError(null);

    try {
      const data = await fetchPostWithCache(
        '/api/ai-cycle-analysis',
        {
          symbol: selectedStock.code,
          priceData: fullHistoricalData,
          currentPrice: selectedStock.price,
          forceReload
        },
        CACHE_DURATIONS.TWELVE_HOURS
      );

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
