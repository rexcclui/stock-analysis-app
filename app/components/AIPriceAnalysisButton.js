import React from 'react';
import { Sparkles } from 'lucide-react';

/**
 * AIPriceAnalysisButton
 * Button to trigger AI price analysis with loading state
 *
 * @param {Function} onAnalyze - Callback to trigger AI analysis
 * @param {boolean} isLoading - Whether analysis is in progress
 * @param {boolean} isDisabled - Whether button should be disabled
 * @param {string} disabledReason - Tooltip text when disabled
 */
export function AIPriceAnalysisButton({
  onAnalyze,
  isLoading,
  isDisabled,
  disabledReason = 'AI analysis not available'
}) {
  return (
    <button
      onClick={() => onAnalyze(false)}
      disabled={isLoading || isDisabled}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all text-sm ${
        isLoading || isDisabled
          ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
          : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
      }`}
      title={isDisabled ? disabledReason : 'Analyze price trend with AI'}
    >
      {isLoading ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500"></div>
          Analyzing...
        </>
      ) : (
        <>
          <Sparkles size={16} />
          AI Analysis
        </>
      )}
    </button>
  );
}
