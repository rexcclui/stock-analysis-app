import React from 'react';
import { LoadingState } from './LoadingState';

const getSentimentColor = (score) => {
  if (score >= 0.6) return 'text-green-400';
  if (score >= 0.3) return 'text-yellow-400';
  return 'text-red-400';
};

/**
 * SentimentSection
 * Props:
 * - sentiment: { score, positive, neutral, negative }
 */
export function SentimentSection({ sentiment, loading = false }) {
  if (!sentiment) {
    if (loading) {
      return <LoadingState message="Loading sentiment insights..." className="mb-6" />;
    }
    return null;
  }
  return (
    <div className="bg-gray-800 rounded-xl shadow-xl p-6 border border-gray-700" style={{ marginTop: '1rem' }}>
      <h3 className="text-xl font-bold text-white mb-4">Social Media Sentiment</h3>
      <div className="grid grid-cols-4 gap-4 mb-4">
        <div className="bg-gray-700/20 rounded-lg p-4 border border-gray-600">
          <div className="text-sm text-gray-300">Score</div>
          <div className={`text-2xl font-bold ${getSentimentColor(sentiment.score)}`}>{(sentiment.score * 100).toFixed(0)}%</div>
        </div>
        <div className="bg-green-900/20 rounded-lg p-4 border border-green-800">
          <div className="text-sm text-gray-300">Positive</div>
          <div className="text-2xl font-bold text-green-400">{sentiment.positive}%</div>
        </div>
        <div className="bg-gray-700/20 rounded-lg p-4 border border-gray-600">
          <div className="text-sm text-gray-300">Neutral</div>
          <div className="text-2xl font-bold text-gray-200">{sentiment.neutral}%</div>
        </div>
        <div className="bg-red-900/20 rounded-lg p-4 border border-red-800">
          <div className="text-sm text-gray-300">Negative</div>
          <div className="text-2xl font-bold text-red-400">{sentiment.negative}%</div>
        </div>
      </div>
    </div>
  );
}
