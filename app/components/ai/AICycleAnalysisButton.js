import { TrendingUp } from 'lucide-react';

/**
 * Button component to trigger AI cycle analysis
 */
export function AICycleAnalysisButton({
  onAnalyze,
  isLoading,
  isDisabled,
  disabledReason = 'AI cycle analysis not available'
}) {
  return (
    <button
      onClick={() => onAnalyze(false)}
      disabled={isLoading || isDisabled}
      title={isDisabled ? disabledReason : 'Analyze trend cycles with AI'}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all text-sm ${
        isLoading || isDisabled
          ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
          : 'bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white'
      }`}
    >
      {isLoading ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-500"></div>
          Analyzing Cycles...
        </>
      ) : (
        <>
          <TrendingUp size={16} />
          AI Cycle Analysis
        </>
      )}
    </button>
  );
}
