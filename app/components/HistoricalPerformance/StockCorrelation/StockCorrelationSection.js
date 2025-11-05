"use client";

import { useState, useEffect } from "react";
import { CorrelationTable } from "./CorrelationTable";
import { LeadLagAnalysis } from "./LeadLagAnalysis";

export function StockCorrelationSection({ symbol }) {
  const [relatedStocks, setRelatedStocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedStock, setSelectedStock] = useState(null);

  useEffect(() => {
    if (!symbol) return;

    async function fetchRelatedStocks() {
      setLoading(true);
      setError(null);
      setSelectedStock(null);

      try {
        const response = await fetch(`/api/related-stocks?symbol=${symbol}`);

        if (!response.ok) {
          throw new Error("Failed to fetch related stocks");
        }

        const data = await response.json();
        setRelatedStocks(data.relatedStocks || []);
      } catch (err) {
        console.error("Error fetching related stocks:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchRelatedStocks();
  }, [symbol]);

  const handleSelectStock = (stock) => {
    setSelectedStock(stock);
  };

  const handleBack = () => {
    setSelectedStock(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-400">Loading related stocks...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
        <p className="text-red-400">Error: {error}</p>
      </div>
    );
  }

  if (relatedStocks.length === 0) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 text-center">
        <p className="text-gray-400">No related stocks found for {symbol}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!selectedStock ? (
        <CorrelationTable
          symbol={symbol}
          relatedStocks={relatedStocks}
          onSelectStock={handleSelectStock}
        />
      ) : (
        <LeadLagAnalysis
          symbol1={symbol}
          symbol2={selectedStock.symbol}
          onBack={handleBack}
        />
      )}
    </div>
  );
}
