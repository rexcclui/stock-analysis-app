import React, { useRef, useEffect, useState } from "react";
import { X, LineChart } from "lucide-react";

const getMarketCapValue = (marketCap) => {
  if (!marketCap || marketCap === "N/A") return 0;
  const value = parseFloat(marketCap.replace(/[^0-9.]/g, ""));
  if (marketCap.includes("T")) return value * 1000;
  return value;
};

// Generate color based on relative position between min and max (conditional formatting)
const getRelativeHeatmapColor = (value, min, max) => {
  // If all values are the same, return neutral color
  if (min === max) return "#ecfdf5";

  // Calculate normalized position (0 = min, 1 = max)
  const normalized = (value - min) / (max - min);

  // Define color stops for gradient
  // Red (negative) -> White (neutral) -> Green (positive)
  const colorStops = [
    { pos: 0.0, color: { r: 69, g: 10, b: 10 } },      // #450a0a - darkest red
    { pos: 0.1, color: { r: 127, g: 29, b: 29 } },     // #7f1d1d - very dark red
    { pos: 0.2, color: { r: 185, g: 28, b: 28 } },     // #b91c1c - dark red
    { pos: 0.3, color: { r: 239, g: 68, b: 68 } },     // #ef4444 - red
    { pos: 0.4, color: { r: 252, g: 165, b: 165 } },   // #fca5a5 - light red
    { pos: 0.5, color: { r: 236, g: 253, b: 245 } },   // #ecfdf5 - neutral (white-ish)
    { pos: 0.6, color: { r: 167, g: 243, b: 208 } },   // #a7f3d0 - light green
    { pos: 0.7, color: { r: 52, g: 211, b: 153 } },    // #34d399 - medium green
    { pos: 0.8, color: { r: 16, g: 185, b: 129 } },    // #10b981 - green
    { pos: 0.9, color: { r: 4, g: 120, b: 87 } },      // #047857 - dark green
    { pos: 1.0, color: { r: 6, g: 78, b: 59 } },       // #064e3b - darkest green
  ];

  // Find the two color stops to interpolate between
  let lowerStop = colorStops[0];
  let upperStop = colorStops[colorStops.length - 1];

  for (let i = 0; i < colorStops.length - 1; i++) {
    if (normalized >= colorStops[i].pos && normalized <= colorStops[i + 1].pos) {
      lowerStop = colorStops[i];
      upperStop = colorStops[i + 1];
      break;
    }
  }

  // Interpolate between the two stops
  const range = upperStop.pos - lowerStop.pos;
  const rangeNormalized = range === 0 ? 0 : (normalized - lowerStop.pos) / range;

  const r = Math.round(lowerStop.color.r + (upperStop.color.r - lowerStop.color.r) * rangeNormalized);
  const g = Math.round(lowerStop.color.g + (upperStop.color.g - lowerStop.color.g) * rangeNormalized);
  const b = Math.round(lowerStop.color.b + (upperStop.color.b - lowerStop.color.b) * rangeNormalized);

  return `rgb(${r}, ${g}, ${b})`;
};

// Keep old function for legend generation, but will be replaced by relative colors
const getHeatmapColor = (value, min, max) => {
  if (min !== undefined && max !== undefined) {
    return getRelativeHeatmapColor(value, min, max);
  }
  // Fallback to absolute if min/max not provided
  if (value >= 500) return "#064e3b";
  if (value >= 200) return "#065f46";
  if (value >= 100) return "#047857";
  if (value >= 50) return "#059669";
  if (value >= 30) return "#10b981";
  if (value >= 20) return "#34d399";
  if (value >= 10) return "#6ee7b7";
  if (value >= 5) return "#a7f3d0";
  if (value >= 2) return "#d1fae5";
  if (value >= 0) return "#ecfdf5";
  if (value >= -2) return "#fee2e2";
  if (value >= -5) return "#fecaca";
  if (value >= -10) return "#fca5a5";
  if (value >= -20) return "#f87171";
  if (value >= -30) return "#ef4444";
  if (value >= -50) return "#dc2626";
  if (value >= -100) return "#b91c1c";
  if (value >= -200) return "#7f1d1d";
  return "#450a0a";
};

const getTextColor = (value, min, max) => {
  // Calculate normalized position (0 = min, 1 = max)
  if (min === max) return '#1f2937'; // dark text for neutral

  const normalized = (value - min) / (max - min);

  // For neutral/light areas (middle of range), use dark text
  if (normalized >= 0.45 && normalized <= 0.55) return '#111827'; // very dark gray
  if (normalized >= 0.4 && normalized <= 0.6) return '#1f2937'; // dark gray

  // For slightly positive/negative, use lighter text
  if (normalized >= 0.6 && normalized <= 0.7) return '#e5e7eb'; // light gray
  if (normalized >= 0.3 && normalized <= 0.4) return '#e5e7eb'; // light gray

  // For more extreme values (dark backgrounds), use white
  return '#ffffff';
};

// Helper function to calculate tile layout with grid-based sizing
const calculateTileLayout = (stocksWithSize, containerWidth, containerHeight) => {
  // Calculate total size value
  const totalSizeValue = stocksWithSize.reduce((sum, item) => sum + item.sizeValue, 0);

  // Calculate proportional areas for each stock
  const stocksWithArea = stocksWithSize.map(item => {
    const proportionalArea = (item.sizeValue / totalSizeValue) * (containerWidth * containerHeight);
    return { ...item, area: proportionalArea };
  });

  // Sort by area descending (largest first)
  stocksWithArea.sort((a, b) => b.area - a.area);

  // Define grid unit size (e.g., 100px)
  const GRID_UNIT = 100;
  const gridCols = Math.floor(containerWidth / GRID_UNIT);
  const gridRows = Math.ceil(containerHeight / GRID_UNIT);

  // Categorize tiles into grid sizes
  const tilesWithGridSize = stocksWithArea.map(item => {
    // Calculate how many grid units this tile should occupy
    const areaInGridUnits = item.area / (GRID_UNIT * GRID_UNIT);

    // Find best width and height in grid units (try to keep aspect ratio between 7:3 and 4:6)
    let bestW = 1, bestH = 1;
    let minDiff = Infinity;

    // Try different combinations
    for (let w = 1; w <= gridCols; w++) {
      for (let h = 1; h <= gridRows; h++) {
        const gridArea = w * h;
        const aspectRatio = h / w;

        // Check aspect ratio constraints (7:3 = 0.43, 4:6 = 1.5)
        if (aspectRatio >= 0.4 && aspectRatio <= 1.6) {
          const diff = Math.abs(gridArea - areaInGridUnits);
          if (diff < minDiff) {
            minDiff = diff;
            bestW = w;
            bestH = h;
          }
        }
      }
    }

    return {
      ...item,
      gridW: bestW,
      gridH: bestH,
      gridArea: bestW * bestH
    };
  });

  // Create grid to track occupied cells
  const grid = Array(gridRows).fill(null).map(() => Array(gridCols).fill(false));

  // Helper function to check if a tile can fit at position
  const canFit = (gridX, gridY, w, h) => {
    if (gridX + w > gridCols || gridY + h > gridRows) return false;

    for (let y = gridY; y < gridY + h; y++) {
      for (let x = gridX; x < gridX + w; x++) {
        if (grid[y][x]) return false;
      }
    }
    return true;
  };

  // Helper function to mark grid cells as occupied
  const occupy = (gridX, gridY, w, h) => {
    for (let y = gridY; y < gridY + h; y++) {
      for (let x = gridX; x < gridX + w; x++) {
        grid[y][x] = true;
      }
    }
  };

  // Place tiles using first-fit algorithm
  const layout = [];

  for (const item of tilesWithGridSize) {
    let placed = false;

    // Try to find first available position (scan top-to-bottom, left-to-right)
    for (let gridY = 0; gridY < gridRows && !placed; gridY++) {
      for (let gridX = 0; gridX < gridCols && !placed; gridX++) {
        if (canFit(gridX, gridY, item.gridW, item.gridH)) {
          // Place tile
          const x = gridX * GRID_UNIT;
          const y = gridY * GRID_UNIT;
          const width = item.gridW * GRID_UNIT;
          const height = item.gridH * GRID_UNIT;

          layout.push({
            ...item,
            x,
            y,
            width,
            height
          });

          occupy(gridX, gridY, item.gridW, item.gridH);
          placed = true;
        }
      }
    }

    // If couldn't place, try smaller sizes
    if (!placed && item.gridW > 1) {
      // Reduce size and try again
      const smallerW = Math.max(1, Math.floor(item.gridW * 0.7));
      const smallerH = Math.max(1, Math.floor(item.gridH * 0.7));

      for (let gridY = 0; gridY < gridRows && !placed; gridY++) {
        for (let gridX = 0; gridX < gridCols && !placed; gridX++) {
          if (canFit(gridX, gridY, smallerW, smallerH)) {
            const x = gridX * GRID_UNIT;
            const y = gridY * GRID_UNIT;
            const width = smallerW * GRID_UNIT;
            const height = smallerH * GRID_UNIT;

            layout.push({
              ...item,
              x,
              y,
              width,
              height
            });

            occupy(gridX, gridY, smallerW, smallerH);
            placed = true;
          }
        }
      }
    }
  }

  // Calculate actual height used
  const actualHeight = layout.length > 0
    ? Math.max(...layout.map(tile => tile.y + tile.height))
    : containerHeight;

  return { layout, actualHeight };
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
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(1200);

  // Measure container width on mount and resize
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        if (width > 0) {
          setContainerWidth(width);
        }
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Calculate size values for all stocks
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

  // Calculate layout based on actual container width
  const containerHeight = 600; // Initial height estimate
  const { layout, actualHeight } = calculateTileLayout(stocksWithSize, containerWidth, containerHeight);

  // Calculate actual performance range for dynamic legend
  const performanceValues = allStocks.map(stock => stock.performance[heatmapColorBy]);
  const minPerformance = Math.min(...performanceValues);
  const maxPerformance = Math.max(...performanceValues);

  // Generate dynamic color legend stops
  const generateLegendStops = (min, max) => {
    // Round to nice numbers
    const range = max - min;
    const stops = [];

    if (range < 20) {
      // Small range - use fine granularity
      const step = Math.ceil(range / 8);
      for (let i = 0; i <= 8; i++) {
        const value = Math.round(min + (i * step));
        stops.push(value);
      }
    } else if (range < 100) {
      // Medium range
      const step = Math.ceil(range / 8 / 5) * 5; // Round to nearest 5
      for (let i = 0; i <= 8; i++) {
        const value = Math.round((min + (i * step)) / 5) * 5;
        stops.push(value);
      }
    } else {
      // Large range
      const step = Math.ceil(range / 8 / 10) * 10; // Round to nearest 10
      for (let i = 0; i <= 8; i++) {
        const value = Math.round((min + (i * step)) / 10) * 10;
        stops.push(value);
      }
    }

    return [...new Set(stops)].sort((a, b) => a - b); // Remove duplicates and sort
  };

  const legendStops = generateLegendStops(minPerformance, maxPerformance);

  return (
    <div className="p-2" ref={containerRef}>
      <div
        className="w-full relative"
        style={{
          height: `${actualHeight}px`,
        }}
      >
        {layout.map(({ stock, x, y, width, height }) => {
          const performance = stock.performance[heatmapColorBy];
          const textColor = getTextColor(performance, minPerformance, maxPerformance);

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

          // Determine if tile is small (width or height < 80px)
          const isSmallTile = width < 80 || height < 80;

          // Create tooltip text
          const tooltipText = `${stock.code}\n${sizeDisplayLabel}: ${sizeDisplayValue}${showBothMetrics ? `\n${colorDisplayLabel}: ${colorDisplayValue}` : ''}`;

          return (
            <div
              key={stock.code}
              className="absolute cursor-pointer transition-all duration-200 hover:brightness-110 flex flex-col items-center justify-center group"
              style={{
                backgroundColor: getHeatmapColor(performance, minPerformance, maxPerformance),
                left: `${x}px`,
                top: `${y}px`,
                width: `${width}px`,
                height: `${height}px`,
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
              {legendStops.map((value, index) => (
                <div
                  key={index}
                  className="w-6 h-6 rounded"
                  style={{ backgroundColor: getHeatmapColor(value, minPerformance, maxPerformance) }}
                  title={`${value > 0 ? '+' : ''}${value}%`}
                />
              ))}
            </div>
            <span className="text-gray-300 text-sm ml-2">
              <span style={{ color: getHeatmapColor(maxPerformance, minPerformance, maxPerformance) }}>
                {maxPerformance > 0 ? '+' : ''}{maxPerformance.toFixed(1)}%
              </span>
              {' to '}
              <span style={{ color: getHeatmapColor(minPerformance, minPerformance, maxPerformance) }}>
                {minPerformance > 0 ? '+' : ''}{minPerformance.toFixed(1)}%
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
