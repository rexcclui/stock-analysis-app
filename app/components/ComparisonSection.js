import React from 'react';
import { AddCustomComparison } from './AddCustomComparison';
import { ComparisonTable } from './ComparisonTable';

export function ComparisonSection({
  selectedStock,
  comparisonStocks,
  manualStock,
  onManualStockChange,
  onAddComparison,
  onRemoveComparison,
  loading,
  viewMode,
  onViewModeChange,
  heatmapColorBy,
  onHeatmapColorByChange,
  heatmapSizeBy,
  onHeatmapSizeByChange,
  periods
}) {
  return (
    <>
      <AddCustomComparison
        manualStock={manualStock}
        onManualStockChange={onManualStockChange}
        onAddComparison={onAddComparison}
        loading={loading}
      />

      <ComparisonTable
        selectedStock={selectedStock}
        comparisonStocks={comparisonStocks}
        periods={periods}
        onRemoveComparison={onRemoveComparison}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
        heatmapColorBy={heatmapColorBy}
        onHeatmapColorByChange={onHeatmapColorByChange}
        heatmapSizeBy={heatmapSizeBy}
        onHeatmapSizeByChange={onHeatmapSizeByChange}
      />
    </>
  );
}
