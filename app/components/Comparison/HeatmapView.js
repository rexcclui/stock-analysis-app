import React from "react";
import { X, LineChart } from "lucide-react";

const getMarketCapValue = (marketCap) => {
  if (!marketCap || marketCap === "N/A") return 0;
  const value = parseFloat(marketCap.replace(/[^0-9.]/g, ""));
  if (marketCap.includes("T")) return value * 1000;
  return value;
};

const getHeatmapColor = (value) => {
  if (value >= 20) return "#10b981";
  if (value >= 10) return "#22c55e";
  if (value >= 5) return "#84cc16";
  if (value >= 0) return "#eab308";
  if (value >= -5) return "#f97316";
  if (value >= -10) return "#ef4444";
  if (value >= -20) return "#dc2626";
  return "#991b1b";
};

export function HeatmapView({
  selectedStock,
  comparisonStocks,
  heatmapColorBy,
  heatmapSizeBy,
  onRemoveComparison,
  onStockCodeClick,
  onAddToChart,
}) {
  // Calculate size values for all stocks and sort by size (largest first)
  const allStocks = [selectedStock, ...comparisonStocks];

  const stocksWithSize = allStocks.map((stock) => {
    const sizeValue =
      heatmapSizeBy === "marketCap"
        ? getMarketCapValue(stock.marketCap)
        : heatmapSizeBy === "pe"
        ? parseFloat(stock.pe) || 0
        : Math.abs(stock.performance[heatmapSizeBy]);
    return { stock, sizeValue };
  });

  // Sort by size value descending (largest first)
  stocksWithSize.sort((a, b) => b.sizeValue - a.sizeValue);

  // Calculate flex-grow values with better proportional representation
  const minSize = Math.min(...stocksWithSize.map(item => item.sizeValue));
  const maxSize = Math.max(...stocksWithSize.map(item => item.sizeValue));

  const stocksWithFlex = stocksWithSize.map((item) => {
    // Normalize between 1 and 10 for more dramatic, proportional size differences
    const normalizedFlex = 1 + ((item.sizeValue - minSize) / (maxSize - minSize)) * 9;
    return {
      ...item,
      flexGrow: normalizedFlex,
    };
  });

  return (
    <div className="p-4">
      <div className="flex flex-wrap" style={{ gap: '0px', minHeight: '500px' }}>
        {stocksWithFlex.map(({ stock, flexGrow }) => {
          const performance = stock.performance[heatmapColorBy];

          // Determine what to display for SIZE metric (heatmapSizeBy)
          let sizeDisplayValue;
          let sizeDisplayLabel;

          if (heatmapSizeBy === "marketCap") {
            sizeDisplayValue = stock.marketCap;
            sizeDisplayLabel = "Cap";
          } else if (heatmapSizeBy === "pe") {
            sizeDisplayValue = stock.pe;
            sizeDisplayLabel = "P/E";
          } else {
            // It's a performance metric
            const perfValue = stock.performance[heatmapSizeBy];
            sizeDisplayValue = `${perfValue > 0 ? "+" : ""}${perfValue.toFixed(1)}%`;
            sizeDisplayLabel = heatmapSizeBy.toUpperCase();
          }

          // Determine what to display for COLOR metric (heatmapColorBy)
          let colorDisplayValue;
          let colorDisplayLabel;

          if (heatmapColorBy === "marketCap") {
            colorDisplayValue = stock.marketCap;
            colorDisplayLabel = "Cap";
          } else if (heatmapColorBy === "pe") {
            colorDisplayValue = stock.pe;
            colorDisplayLabel = "P/E";
          } else {
            // It's a performance metric
            const perfValue = stock.performance[heatmapColorBy];
            colorDisplayValue = `${perfValue > 0 ? "+" : ""}${perfValue.toFixed(1)}%`;
            colorDisplayLabel = heatmapColorBy.toUpperCase();
          }

          // Only show color value if it's different from size value
          const showBothMetrics = heatmapSizeBy !== heatmapColorBy;

          return (
            <div
              key={stock.code}
              className="relative cursor-pointer transition-all duration-200 hover:brightness-110 flex flex-col items-center justify-center"
              style={{
                backgroundColor: getHeatmapColor(performance),
                flexGrow: flexGrow,
                flexBasis: `${Math.max(200, flexGrow * 80)}px`,
                minHeight: '120px',
                minWidth: '180px',
                border: '2px solid rgba(0,0,0,0.4)',
                boxSizing: 'border-box',
                padding: '12px',
              }}
            >
              {onAddToChart && (
                <button
                  onClick={() => onAddToChart(stock.code)}
                  className="absolute p-1 bg-blue-500/80 hover:bg-blue-600 rounded-full transition-all"
                  style={{ top: "6px", left: "6px", zIndex: 10 }}
                  title="Add to chart"
                  aria-label="Add to chart"
                >
                  <LineChart size={14} className="text-white" />
                </button>
              )}
              <div className="text-center">
                <span
                  onClick={() =>
                    onStockCodeClick && onStockCodeClick(stock.code)
                  }
                  role="link"
                  tabIndex={0}
                  className="text-white font-bold text-lg underline decoration-dotted cursor-pointer hover:text-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 rounded block mb-1"
                >
                  {stock.code}
                </span>
                <div className="text-white font-bold text-xl mb-1">
                  <span className="text-xs opacity-80">{sizeDisplayLabel}: </span>
                  {sizeDisplayValue}
                </div>
                {showBothMetrics && (
                  <div className="text-white font-bold text-lg">
                    <span className="text-xs opacity-80">{colorDisplayLabel}: </span>
                    {colorDisplayValue}
                  </div>
                )}
              </div>
              {stock.code !== selectedStock.code && stock.code !== 'SPY' && stock.code !== 'QQQ' && (
                <button
                  onClick={() => onRemoveComparison(stock.code)}
                  className="absolute p-0.5 bg-red-500/80 hover:bg-red-600 rounded-full transition-all"
                  style={{ bottom: "6px", right: "6px", zIndex: 10 }}
                  aria-label="Remove comparison"
                >
                  <X size={10} className="text-white" />
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
              <div
                className="w-8 h-8 rounded"
                style={{ backgroundColor: "#10b981" }}
              ></div>
              <div
                className="w-8 h-8 rounded"
                style={{ backgroundColor: "#84cc16" }}
              ></div>
              <div
                className="w-8 h-8 rounded"
                style={{ backgroundColor: "#eab308" }}
              ></div>
              <div
                className="w-8 h-8 rounded"
                style={{ backgroundColor: "#f97316" }}
              ></div>
              <div
                className="w-8 h-8 rounded"
                style={{ backgroundColor: "#ef4444" }}
              ></div>
              <div
                className="w-8 h-8 rounded"
                style={{ backgroundColor: "#991b1b" }}
              ></div>
            </div>
            <span className="text-gray-300 text-sm ml-2">
              <span className="text-green-400">+20%</span> to{" "}
              <span className="text-red-400">-20%</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
