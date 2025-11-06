import React, { useRef, useEffect, useState } from "react";
import { X, LineChart } from "lucide-react";

const getMarketCapValue = (marketCap) => {
  if (!marketCap || marketCap === "N/A") return 0;
  const value = parseFloat(marketCap.replace(/[^0-9.]/g, ""));
  if (marketCap.includes("T")) return value * 1000;
  return value;
};

// Generate color based on relative position between min and max (conditional formatting)
const getRelativeHeatmapColor = (value, min, max, allValues) => {
  // If all values are the same, return neutral color
  if (min === max) return "#ecfdf5";

  // Separate positive and negative values from allValues
  const positiveValues = allValues.filter(v => v > 0);
  const negativeValues = allValues.filter(v => v < 0);

  // Get ranges for positive and negative
  const maxPositive = positiveValues.length > 0 ? Math.max(...positiveValues) : 0;
  const minPositive = positiveValues.length > 0 ? Math.min(...positiveValues) : 0;
  const minNegative = negativeValues.length > 0 ? Math.min(...negativeValues) : 0;  // Most negative
  const maxNegative = negativeValues.length > 0 ? Math.max(...negativeValues) : 0;  // Closest to 0

  if (value > 0) {
    // Positive values: light green (lowest) to deep green (highest)
    const ratio = maxPositive > minPositive ? (value - minPositive) / (maxPositive - minPositive) : 0.5;

    // Interpolate from light green (#bbf7d0) to deep green (#14532d)
    const r = Math.round(187 - (187 - 20) * ratio);
    const g = Math.round(247 - (247 - 83) * ratio);
    const b = Math.round(208 - (208 - 45) * ratio);
    return `rgb(${r}, ${g}, ${b})`;
  } else if (value < 0) {
    // Negative values: light red (highest/closest to 0) to deep red (most negative)
    const ratio = minNegative < maxNegative ? (value - maxNegative) / (minNegative - maxNegative) : 0.5;

    // Interpolate from light red (#fecaca) to deep red (#7f1d1d)
    const r = Math.round(254 - (254 - 127) * ratio);
    const g = Math.round(202 - (202 - 29) * ratio);
    const b = Math.round(202 - (202 - 29) * ratio);
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    // Value is 0 - neutral gray
    return "#e5e7eb";
  }
};

// Keep old function for legend generation, but will be replaced by relative colors
const getHeatmapColor = (value, min, max, allValues) => {
  if (min !== undefined && max !== undefined && allValues) {
    return getRelativeHeatmapColor(value, min, max, allValues);
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

// Helper to calculate luminance from RGB
const getLuminance = (r, g, b) => {
  // Convert to 0-1 range
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
};

// Helper to extract RGB from color string
const parseRGB = (colorStr) => {
  const match = colorStr.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (match) {
    return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
  }
  return [128, 128, 128]; // fallback
};

const getTextColor = (backgroundColor) => {
  // Calculate luminance of background
  const [r, g, b] = parseRGB(backgroundColor);
  const bgLuminance = getLuminance(r, g, b);

  // WCAG AA requires contrast ratio of at least 4.5:1 for normal text
  // If background is light (luminance > 0.5), use dark text
  // If background is dark (luminance < 0.5), use light text
  if (bgLuminance > 0.5) {
    return '#111827'; // Very dark gray/black for light backgrounds
  } else if (bgLuminance > 0.3) {
    return '#1f2937'; // Dark gray for medium backgrounds
  } else {
    return '#ffffff'; // White for dark backgrounds
  }
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
  loading = false,
}) {
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(1200);
  const [stockTimeframes, setStockTimeframes] = useState({}); // { stockCode: { timeframe: '7', data: [...] } }
  const [loadingTimeframe, setLoadingTimeframe] = useState({});

  // Fetch historical data for a stock and timeframe
  const fetchTimeframeData = async (stockCode, timeframe) => {
    setLoadingTimeframe(prev => ({ ...prev, [stockCode]: true }));

    try {
      const response = await fetch(`/api/stock?symbol=${stockCode}`);

      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }

      const data = await response.json();

      // Map timeframe to chart data key
      let chartDataKey;
      if (timeframe === '7') {
        chartDataKey = '7D';
      } else if (timeframe === '30') {
        chartDataKey = '1M';
      } else if (timeframe === '90') {
        chartDataKey = '3M';
      } else if (timeframe === 'M') {
        chartDataKey = 'fullHistorical';
      }

      // Get the data for the selected timeframe
      const chartData = data.chartData?.[chartDataKey] || [];

      // Convert to our format
      const validData = chartData.map((d, i) => ({
        index: i,
        price: d.price
      })).filter(d => d.price !== null && d.price !== undefined);

      setStockTimeframes(prev => ({
        ...prev,
        [stockCode]: { timeframe, data: validData }
      }));
    } catch (error) {
      console.error('Error fetching timeframe data:', error);
    } finally {
      setLoadingTimeframe(prev => ({ ...prev, [stockCode]: false }));
    }
  };

  // Handle timeframe icon click
  const handleTimeframeClick = (stockCode, timeframe) => {
    const current = stockTimeframes[stockCode];

    // If clicking the same timeframe, toggle it off
    if (current?.timeframe === timeframe) {
      setStockTimeframes(prev => {
        const newState = { ...prev };
        delete newState[stockCode];
        return newState;
      });
    } else {
      // Fetch new timeframe data
      fetchTimeframeData(stockCode, timeframe);
    }
  };

  // Render mini line chart
  const renderMiniChart = (data, width, height, textColor) => {
    if (!data || data.length < 2) return null;

    const prices = data.map(d => d.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;

    // Add padding
    const padding = 4;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    // Generate path points
    const points = data.map((d, i) => {
      const x = padding + (i / (data.length - 1)) * chartWidth;
      const y = padding + chartHeight - ((d.price - minPrice) / priceRange) * chartHeight;
      return `${x},${y}`;
    });

    const pathD = `M ${points.join(' L ')}`;

    // Determine line color based on performance
    const firstPrice = prices[0];
    const lastPrice = prices[prices.length - 1];
    const performance = ((lastPrice - firstPrice) / firstPrice) * 100;
    const lineColor = performance >= 0 ? '#10b981' : '#ef4444';

    return (
      <svg
        width={width}
        height={height}
        style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
      >
        <path
          d={pathD}
          fill="none"
          stroke={lineColor}
          strokeWidth="2"
          opacity="0.8"
        />
      </svg>
    );
  };

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

  // Check if data is ready
  const isDataReady = selectedStock && comparisonStocks &&
                      selectedStock.performance &&
                      comparisonStocks.length >= 0;

  // Show loading state
  if (loading || !isDataReady) {
    return (
      <div className="p-2" ref={containerRef}>
        <div className="w-full flex items-center justify-center" style={{ minHeight: '400px' }}>
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-400 text-lg">Loading heatmap data...</p>
          </div>
        </div>
      </div>
    );
  }

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

  // Identify top 10 stocks by size
  const sortedBySize = [...stocksWithSize].sort((a, b) => b.sizeValue - a.sizeValue);
  const top10StockCodes = sortedBySize.slice(0, 10).map(item => item.stock.code);

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
          const backgroundColor = getHeatmapColor(performance, minPerformance, maxPerformance, performanceValues);
          const textColor = getTextColor(backgroundColor);

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

          // Determine font sizes based on tile dimensions - adjusted for 100px grid units
          const isExtraLargeTile = width >= 200 && height >= 200;
          const isLargeTile = width >= 100 && height >= 100 && !isExtraLargeTile;
          const isMediumTile = !isSmallTile && !isLargeTile && !isExtraLargeTile;

          // Font size - using inline styles to override any caching
          const codeFontSize = isExtraLargeTile ? '30px' : isLargeTile ? '20px' : isMediumTile ? '16px' : '12px';
          const infoFontSize = isExtraLargeTile ? '24px' : isLargeTile ? '18px' : isMediumTile ? '14px' : '12px';
          const labelFontSize = isExtraLargeTile ? '18px' : isLargeTile ? '16px' : '12px';

          // Create tooltip text
          const tooltipText = `${stock.code}\n${sizeDisplayLabel}: ${sizeDisplayValue}${showBothMetrics ? `\n${colorDisplayLabel}: ${colorDisplayValue}` : ''}`;

          return (
            <div
              key={stock.code}
              className="absolute cursor-pointer transition-all duration-200 hover:brightness-110 flex flex-col items-center justify-center group"
              style={{
                backgroundColor: backgroundColor,
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

              {/* Render mini chart if timeframe is selected */}
              {stockTimeframes[stock.code]?.data && renderMiniChart(
                stockTimeframes[stock.code].data,
                width,
                height,
                textColor
              )}

              {onAddToChart && (() => {
                const isInChart = chartCompareStocks?.find(s => s.code === stock.code);
                const isTop10 = top10StockCodes.includes(stock.code);
                const currentTimeframe = stockTimeframes[stock.code];
                const timeframes = ['7', '30', '90', 'M'];

                return (
                  <div className="absolute flex items-center gap-1" style={{ top: "4px", left: "4px", zIndex: 10 }}>
                    <button
                      onClick={() => onAddToChart(stock.code)}
                      className={`p-1 rounded-full transition-all ${
                        isInChart
                          ? 'bg-green-500/80 hover:bg-green-600'
                          : 'bg-blue-500/80 hover:bg-blue-600'
                      }`}
                      title={isInChart ? "Remove from chart" : "Add to chart"}
                      aria-label={isInChart ? "Remove from chart" : "Add to chart"}
                    >
                      <LineChart size={12} className="text-white" fill={isInChart ? "currentColor" : "none"} />
                    </button>

                    {isTop10 && (
                      <div className="flex items-center gap-0.5">
                        {timeframes.map(tf => {
                          const isActive = currentTimeframe?.timeframe === tf;
                          const isLoadingThis = loadingTimeframe[stock.code];

                          return (
                            <button
                              key={tf}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTimeframeClick(stock.code, tf);
                              }}
                              style={{
                                minWidth: '16px',
                                backgroundColor: isActive ? '#3b82f6' : 'rgba(55, 65, 81, 0.8)',
                                color: isActive ? '#ffffff' : '#d1d5db'
                              }}
                              className="px-1 py-0.5 text-[10px] font-semibold rounded transition-all hover:opacity-80"
                              title={`${tf === 'M' ? 'Max' : tf + ' days'}`}
                              disabled={isLoadingThis}
                            >
                              {isLoadingThis ? '...' : tf}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
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
                    className="font-bold underline decoration-dotted cursor-pointer focus:outline-none focus:ring-2 rounded block mb-1"
                    style={{
                      color: stock.code === selectedStock.code ? '#fbbf24' : textColor,
                      fontSize: codeFontSize,
                    }}
                  >
                    {stock.code}
                  </span>
                  <div className="font-bold mb-1" style={{ color: textColor, fontSize: infoFontSize }}>
                    <span style={{ color: textColor, opacity: 0.9, fontSize: labelFontSize }}>{sizeDisplayLabel}: </span>
                    {sizeDisplayValue}
                  </div>
                  {showBothMetrics && (
                    <div className="font-bold" style={{ color: textColor, fontSize: infoFontSize }}>
                      <span style={{ color: textColor, opacity: 0.9, fontSize: labelFontSize }}>{colorDisplayLabel}: </span>
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
                  style={{ backgroundColor: getHeatmapColor(value, minPerformance, maxPerformance, performanceValues) }}
                  title={`${value > 0 ? '+' : ''}${value}%`}
                />
              ))}
            </div>
            <span className="text-gray-300 text-sm ml-2">
              <span style={{ color: getHeatmapColor(maxPerformance, minPerformance, maxPerformance, performanceValues) }}>
                {maxPerformance > 0 ? '+' : ''}{maxPerformance.toFixed(1)}%
              </span>
              {' to '}
              <span style={{ color: getHeatmapColor(minPerformance, minPerformance, maxPerformance, performanceValues) }}>
                {minPerformance > 0 ? '+' : ''}{minPerformance.toFixed(1)}%
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
