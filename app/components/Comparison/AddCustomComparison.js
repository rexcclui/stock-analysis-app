import React from 'react';
import { Plus } from 'lucide-react';

export function AddCustomComparison({
  manualStock,
  onManualStockChange,
  onAddComparison,
  loading,
  relationshipTypeFilter,
  onRelationshipTypeFilterChange,
  comparisonRowSize,
  onComparisonRowSizeChange
}) {
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      onAddComparison();
    }
  };

  return (
    <div className="mb-6" style={{ marginTop: '1rem' }}>
      <div className="flex items-center gap-3 mb-4">
  <h3 className="text-xl font-bold" style={{ color: '#3B82F6' }}>Add Custom Comparison</h3>
        <input
          type="text"
          placeholder="Stock code (e.g., TSLA)"
          value={manualStock}
          onChange={(e) => onManualStockChange(e.target.value)}
          onKeyPress={handleKeyPress}
          className="px-3 py-2 bg-gray-700 border-2 border-gray-600 text-white rounded-lg focus:border-blue-500 focus:outline-none placeholder-gray-400"
        />
        <button
          onClick={onAddComparison}
          disabled={loading}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2 disabled:opacity-50"
        >
          <Plus size={18} />
          Add
        </button>

        <div className="flex items-center gap-2 ml-4">
          <span className="text-sm text-gray-300">Filter:</span>
          <div className="flex gap-2">
            {[
              { value: 'all', label: 'All' },
              { value: 'industry', label: 'Industry' },
              { value: 'sector', label: 'Sector' },
              { value: 'competitor', label: 'Competitor' },
              { value: 'etf', label: 'ETF' }
            ].map(option => (
              <label key={option.value} className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="relationshipType"
                  value={option.value}
                  checked={relationshipTypeFilter === option.value}
                  onChange={(e) => onRelationshipTypeFilterChange && onRelationshipTypeFilterChange(e.target.value)}
                  className="mr-1"
                />
                <span className="text-sm text-gray-200">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 ml-8">
          <span className="text-sm text-gray-300">Show Top:</span>
          <select
            value={comparisonRowSize}
            onChange={(e) => onComparisonRowSizeChange && onComparisonRowSizeChange(Number(e.target.value))}
            className="px-2 py-1 bg-gray-700 border border-gray-600 text-white rounded-lg text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value={10}>10</option>
            <option value={30}>30</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="text-sm text-gray-400">by Market Cap</span>
        </div>
      </div>
    </div>
  );
}
