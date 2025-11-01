import React from 'react';
import { Plus } from 'lucide-react';

export function AddCustomComparison({ 
  manualStock, 
  onManualStockChange, 
  onAddComparison, 
  loading 
}) {
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      onAddComparison();
    }
  };

  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-4">
        <h3 className="text-xl font-bold text-white">Add Custom Comparison</h3>
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
      </div>
    </div>
  );
}
