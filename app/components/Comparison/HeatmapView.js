import React from "react";
import { X, LineChart } from "lucide-react";

const getMarketCapValue = (marketCap) => {
  if (!marketCap || marketCap === "N/A") return 0;
  const value = parseFloat(marketCap.replace(/[^0-9.]/g, ""));
  if (marketCap.includes("T")) return value * 1000;
  return value;
};

const getHeatmapColor = (value) => {
  if (value >= 500) return "#064e3b";    // Dark green (extreme high)
  if (value >= 200) return "#065f46";    // Very dark green
  if (value >= 100) return "#047857";    // Dark green
  if (value >= 50) return "#059669";     // Medium dark green
  if (value >= 30) return "#10b981";     // Green
  if (value >= 20) return "#34d399";     // Light green
  if (value >= 10) return "#6ee7b7";     // Lighter green
  if (value >= 5) return "#a7f3d0";      // Very light green
  if (value >= 2) return "#d1fae5";      // Pale green
  if (value >= 0) return "#ecfdf5";      // Almost white (neutral)
  if (value >= -2) return "#fee2e2";     // Pale red
  if (value >= -5) return "#fecaca";     // Very light red
  if (value >= -10) return "#fca5a5";    // Light red
  if (value >= -20) return "#f87171";    // Medium red
  if (value >= -30) return "#ef4444";    // Red
  if (value >= -50) return "#dc2626";    // Dark red
  if (value >= -100) return "#b91c1c";   // Very dark red
  if (value >= -200) return "#7f1d1d";   // Extreme dark red
  return "#450a0a";                      // Almost black (extreme low)
};

const needsDarkText = (value) => {
  // Return true for light backgrounds (close to white or very light colors)
  return value >= -2 && value <= 10;
};

const getTextColor = (value) => {
  // For very light backgrounds, use dark gray/black
  if (value >= 2 && value <= 10) return '#1f2937'; // dark gray
  if (value >= 0 && value <= 2) return '#111827'; // darker gray
  if (value >= -2 && value <= 0) return '#111827'; // darker gray
  
  // For medium light colors, use darker shades
  if (value >= 20 && value <= 30) return '#f3f4f6'; // very light
  if (value >= 10 && value <= 20) return '#e5e7eb'; // light
  
  // For medium dark colors, use light text
  if (value >= 30 && value <= 50) return '#f9fafb'; // almost white
  
  // For dark colors, use white
  return '#ffffff';
};

export function HeatmapView({
  selectedStock,
  comparisonStocks,
  heatmapColorBy,
  heatmapSizeBy,
  onRemoveComparison,
  onStockCodeClick,
  onAddToChart,
  chartCompareStocks,
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
    // For square tiles, area = width × height
    // To make area proportional to sizeValue, we need: gridSpan × gridSpan ∝ sizeValue
    // So: gridSpan ∝ √sizeValue
    const normalizedFlex = 1 + ((item.sizeValue - minSize) / (maxSize - minSize)) * 9;
    const gridSpan = Math.max(1, Math.sqrt(normalizedFlex) * 2); // Square root for area-based sizing
    return {
      ...item,
      flexGrow: normalizedFlex,
      gridSpan: gridSpan,
    };
  });

  // Sort by gridSpan descending (largest tiles first for top-left placement)
  stocksWithFlex.sort((a, b) => b.gridSpan - a.gridSpan);

  return (
    <div className="p-2">
      <div 
        className="w-full" 
        style={{ 
          display: 'grid', 
          gridAutoRows: '60px',
          gridTemplateColumns: 'repeat(auto-fit, minmax(60px, 1fr))',
          gridAutoFlow: 'dense', 
          gap: '0px'
        }}
      >
        {stocksWithFlex.map(({ stock, flexGrow, gridSpan, sizeValue }) => {
          const performance = stock.performance[heatmapColorBy];
          const isDarkText = needsDarkText(performance);
          const textColor = getTextColor(performance);

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

          // Determine if tile is small (gridSpan < 2 means less than 240px)
          const isSmallTile = gridSpan < 1.5;

          // Create tooltip text
          const tooltipText = `${stock.code}\n${sizeDisplayLabel}: ${sizeDisplayValue}${showBothMetrics ? `\n${colorDisplayLabel}: ${colorDisplayValue}` : ''}`;

          return (
            <div
              key={stock.code}
              className="relative cursor-pointer transition-all duration-200 hover:brightness-110 flex flex-col items-center justify-center group"
              style={{
                backgroundColor: getHeatmapColor(performance),
                gridColumn: `span ${Math.round(gridSpan)}`,
                gridRow: `span ${Math.round(gridSpan)}`,
                border: '1px solid rgba(0,0,0,0.3)',
                boxSizing: 'border-box',
                padding: isSmallTile ? '1px' : '4px',
                overflow: 'hidden',
              }}
              title={tooltipText}
            >
              {/* Tooltip on hover for small tiles */}
              {isSmallTile && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none border border-gray-600">
                  <div className="font-bold">{stock.code}</div>
                  <div>{sizeDisplayLabel}: {sizeDisplayValue}</div>
                  {showBothMetrics && <div>{colorDisplayLabel}: {colorDisplayValue}</div>}
                </div>
              )}

              {onAddToChart && (() => {
                const isInChart = chartCompareStocks?.find(s => s.code === stock.code);
                return (
                  <button
                    onClick={() => onAddToChart(stock.code)}
                    className={`absolute p-1 rounded-full transition-all ${
                      isInChart
                        ? 'bg-green-500/80 hover:bg-green-600'
                        : 'bg-blue-500/80 hover:bg-blue-600'
                    }`}
                    style={{ top: "4px", left: "4px", zIndex: 10 }}
                    title={isInChart ? "Remove from chart" : "Add to chart"}
                    aria-label={isInChart ? "Remove from chart" : "Add to chart"}
                  >
                    <LineChart size={12} className="text-white" fill={isInChart ? "currentColor" : "none"} />
                  </button>
                );
              })()}

              {/* Only show text on larger tiles */}
              {!isSmallTile && (
                <div className="text-center w-full">
                  <span
                    onClick={() =>
                      onStockCodeClick && onStockCodeClick(stock.code)
                    }
                    role="link"
                    tabIndex={0}
                    className="font-bold text-xs underline decoration-dotted cursor-pointer focus:outline-none focus:ring-2 rounded block mb-1"
                    style={{
                      color: stock.code === selectedStock.code ? '#fbbf24' : textColor,
                    }}
                  >
                    {stock.code}
                  </span>
                  <div className="font-bold text-xs mb-1" style={{ color: textColor }}>
                    <span className="text-xs" style={{ color: textColor, opacity: 0.9 }}>{sizeDisplayLabel}: </span>
                    {sizeDisplayValue}
                  </div>
                  {showBothMetrics && (
                    <div className="font-bold text-xs" style={{ color: textColor }}>
                      <span className="text-xs" style={{ color: textColor, opacity: 0.9 }}>{colorDisplayLabel}: </span>
                      {colorDisplayValue}
                    </div>
                  )}
                </div>
              )}

              {stock.code !== selectedStock.code && stock.code !== 'SPY' && stock.code !== 'QQQ' && (
                <button
                  onClick={() => onRemoveComparison(stock.code)}
                  className="absolute p-0.5 bg-red-500/80 hover:bg-red-600 rounded-full transition-all"
                  style={{ bottom: "4px", right: "4px", zIndex: 10 }}
                  aria-label="Remove comparison"
                >
                  <X size={10} className="text-white" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="flex items-center justify-center gap-8">
          <div className="flex items-center gap-2">
            <span className="text-gray-300 text-sm">Color Legend:</span>
            <div className="flex gap-1">
              <div className="w-6 h-6 rounded" style={{ backgroundColor: "#064e3b" }} title="+500%"></div>
              <div className="w-6 h-6 rounded" style={{ backgroundColor: "#047857" }} title="+100%"></div>
              <div className="w-6 h-6 rounded" style={{ backgroundColor: "#10b981" }} title="+30%"></div>
              <div className="w-6 h-6 rounded" style={{ backgroundColor: "#a7f3d0" }} title="+5%"></div>
              <div className="w-6 h-6 rounded" style={{ backgroundColor: "#ecfdf5" }} title="0%"></div>
              <div className="w-6 h-6 rounded" style={{ backgroundColor: "#fecaca" }} title="-5%"></div>
              <div className="w-6 h-6 rounded" style={{ backgroundColor: "#ef4444" }} title="-30%"></div>
              <div className="w-6 h-6 rounded" style={{ backgroundColor: "#b91c1c" }} title="-100%"></div>
              <div className="w-6 h-6 rounded" style={{ backgroundColor: "#450a0a" }} title="-200%+"></div>
            </div>
            <span className="text-gray-300 text-sm ml-2">
              <span className="text-green-700">+500%</span> to{" "}
              <span className="text-red-900">-200%</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
