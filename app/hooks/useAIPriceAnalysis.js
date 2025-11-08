import { useState, useEffect } from 'react';

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

  // Handle AI price analysis
  const handleAiAnalysis = async (forceReload = false) => {
    if (!selectedStock || !fullHistoricalData || fullHistoricalData.length === 0) {
      setAiError('No price data available for analysis');
      return;
    }

    setAiLoading(true);
    setAiError(null);

    try {
      const response = await fetch('/api/analyze-price', {
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
        throw new Error(data.error || 'Failed to analyze price');
      }

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
