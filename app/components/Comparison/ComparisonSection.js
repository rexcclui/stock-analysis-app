import React from 'react';
import { AddCustomComparison } from './AddCustomComparison';
import { ComparisonTable } from './ComparisonTable';
import { SearchHistoryTable } from '../SearchHistoryTable';

export function ComparisonSection({
  selectedStock,
  comparisonStocks,
  comparisonType,
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
  onSearchHistoryCodeClick,
  onReloadSearchHistory
}) {
  //console.log('TEMP_LOG[7] ComparisonSection> comparisonStocks :', comparisonStocks );
  return (
    <>
      <SearchHistoryTable
        historyStocks={searchHistoryStocks}
        onClickCode={onSearchHistoryCodeClick}
        onReload={onReloadSearchHistory}
        loading={loading}
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
        comparisonType={comparisonType}
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
