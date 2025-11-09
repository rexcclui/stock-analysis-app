import React from 'react';
import { AddCustomComparison } from './AddCustomComparison';
import { ComparisonTable } from './ComparisonTable';
import { SearchHistoryTable } from '../SearchHistoryTable';
import { LoadingState } from '../LoadingState';

export function ComparisonSection({
  selectedStock,
  comparisonStocks,
  comparisonType,
  relationshipTypeFilter,
  onRelationshipTypeFilterChange,
  comparisonRowSize,
  onComparisonRowSizeChange,
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
  onRemoveSearchHistoryStock,
  onReloadSearchHistory,
  onAddToChart,
  chartCompareStocks
}) {
  const hasComparisonData = comparisonStocks && comparisonStocks.length > 0;
  const showLoading = loading && !hasComparisonData;

  if (showLoading) {
    return <LoadingState message="Loading comparison data..." className="mb-6" />;
  }

  return (
    <>
      <SearchHistoryTable
        historyStocks={searchHistoryStocks}
        onClickCode={onSearchHistoryCodeClick}
        onRemoveStock={onRemoveSearchHistoryStock}
        onReload={onReloadSearchHistory}
        loading={loading}
      />
      <AddCustomComparison
        manualStock={manualStock}
        onManualStockChange={onManualStockChange}
        onAddComparison={onAddComparison}
        loading={loading}
        relationshipTypeFilter={relationshipTypeFilter}
        onRelationshipTypeFilterChange={onRelationshipTypeFilterChange}
        comparisonRowSize={comparisonRowSize}
        onComparisonRowSizeChange={onComparisonRowSizeChange}
      />

      <ComparisonTable
        selectedStock={selectedStock}
        comparisonStocks={comparisonStocks}
        comparisonType={comparisonType}
        relationshipTypeFilter={relationshipTypeFilter}
        comparisonRowSize={comparisonRowSize}
        periods={periods}
        onRemoveComparison={onRemoveComparison}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
        heatmapColorBy={heatmapColorBy}
        onHeatmapColorByChange={onHeatmapColorByChange}
        heatmapSizeBy={heatmapSizeBy}
        onHeatmapSizeByChange={onHeatmapSizeByChange}
        onStockCodeClick={onSearchHistoryCodeClick}
        onAddToChart={onAddToChart}
        chartCompareStocks={chartCompareStocks}
        searchHistoryStocks={searchHistoryStocks}
        loading={loading}
      />
    </>
  );
}
