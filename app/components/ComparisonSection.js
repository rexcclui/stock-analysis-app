import React from 'react';
import { AddCustomComparison } from './AddCustomComparison';
import { ComparisonTable } from './ComparisonTable';
import { SearchHistoryTable } from './SearchHistoryTable';

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
  periods,
  searchHistoryStocks,
  onSearchHistoryCodeClick
}) {
  //console.log('TEMP_LOG[7] ComparisonSection> comparisonStocks :', comparisonStocks );
  return (
    <>
      <SearchHistoryTable
        historyStocks={searchHistoryStocks}
        onClickCode={onSearchHistoryCodeClick}
      />
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
        onStockCodeClick={onSearchHistoryCodeClick}
      />
    </>
  );
}
