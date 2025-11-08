import { useState, useEffect } from 'react';
import { fetchPostWithCache, CACHE_DURATIONS } from '../../lib/clientCache';

/**
 * Custom hook to manage AI price analysis
 * @param {Object} selectedStock - The currently selected stock
 * @param {Array} fullHistoricalData - Full historical price data
 * @returns {Object} - AI analysis state and handlers
 */
export function useAIPriceAnalysis(selectedStock, fullHistoricalData) {
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [showAiAnalysis, setShowAiAnalysis] = useState(false);

  // Reset AI analysis when stock changes
  useEffect(() => {
    setAiAnalysis(null);
    setAiError(null);
    setShowAiAnalysis(false);
  }, [selectedStock?.code]);

  // Handle AI price analysis - 12 HOUR CACHE
  const handleAiAnalysis = async (forceReload = false) => {
    if (!selectedStock || !fullHistoricalData || fullHistoricalData.length === 0) {
      setAiError('No price data available for analysis');
      return;
    }

    setAiLoading(true);
    setAiError(null);

    try {
      const data = await fetchPostWithCache(
        '/api/analyze-price',
        {
          symbol: selectedStock.code,
          priceData: fullHistoricalData,
          currentPrice: selectedStock.price,
          forceReload
        },
        CACHE_DURATIONS.TWELVE_HOURS
      );

      setAiAnalysis(data);
      setShowAiAnalysis(true);
    } catch (error) {
      console.error('AI Analysis Error:', error);
      setAiError(error.message);
    } finally {
      setAiLoading(false);
    }
  };

  return {
    aiAnalysis,
    aiLoading,
    aiError,
    showAiAnalysis,
    setShowAiAnalysis,
    handleAiAnalysis
  };
}
