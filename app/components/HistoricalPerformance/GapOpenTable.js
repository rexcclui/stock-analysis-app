export function GapOpenTable({ gapOpens }) {
  if (!gapOpens || gapOpens.length === 0) return null;

  // Calculate min/max for conditional formatting
  const gapOpenPercents = gapOpens.map(g => g.gapOpenPercent);
  const intradayChanges = gapOpens.map(g => g.intradayChange);
  const dayChanges = gapOpens.map(g => g.dayChange);

  const allChanges = [...gapOpenPercents, ...intradayChanges, ...dayChanges];
  const maxChange = Math.max(...allChanges);
  const minChange = Math.min(...allChanges);

  // Calculate averages
  const avgGapOpen = gapOpenPercents.reduce((a, b) => a + b, 0) / gapOpenPercents.length;
  const avgIntraday = intradayChanges.reduce((a, b) => a + b, 0) / intradayChanges.length;
  const avgDayChange = dayChanges.reduce((a, b) => a + b, 0) / dayChanges.length;

  // Helper function to check if two dates are consecutive business days
  const isNextBusinessDay = (date1Str, date2Str) => {
    const date1 = new Date(date1Str);
    const date2 = new Date(date2Str);
    
    // date1 should be the later date, date2 the earlier
    const diffMs = date1 - date2;
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      // Check if it skips a weekend (Sat=6, Sun=0)
      const dayOfWeek2 = date2.getDay();
      // If date2 is Friday (5), date1 should be Monday (1), skip of 3 days
      if (dayOfWeek2 === 5 && diffDays === 3) return true;
      // If both are business days and consecutive, return true
      if (dayOfWeek2 !== 5 && dayOfWeek2 !== 6) return true;
    } else if (diffDays === 3) {
      // This handles Friday to Monday
      const dayOfWeek2 = date2.getDay();
      if (dayOfWeek2 === 5) return true;
    }
    
    return false;
  };

  // Identify consecutive business day pairs
  const consecutiveIndices = new Set();
  for (let i = 0; i < gapOpens.length - 1; i++) {
    if (isNextBusinessDay(gapOpens[i].date, gapOpens[i + 1].date)) {
      consecutiveIndices.add(i);
      consecutiveIndices.add(i + 1);
    }
  }

  // Color interpolation function
  const getColorForChange = (value, min, max) => {
    if (max === min) return value >= 0 ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)";

    if (value >= 0) {
      // Positive: pale green to deep green
      const intensity = (value - Math.max(0, min)) / (max - Math.max(0, min));
      const r = Math.round(16 + (200 - 16) * (1 - intensity));
      const g = Math.round(185 + (255 - 185) * (1 - intensity));
      const b = Math.round(129 + (200 - 129) * (1 - intensity));
      const alpha = 0.2 + intensity * 0.6;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    } else {
      // Negative: pale red to deep red
      const intensity = Math.abs(value) / Math.abs(min);
      const r = Math.round(239 + (180 - 239) * (1 - intensity));
      const g = Math.round(68 + (50 - 68) * (1 - intensity));
      const b = Math.round(68 + (50 - 68) * (1 - intensity));
      const alpha = 0.2 + intensity * 0.6;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gray-700">
            <th className="px-4 py-3 text-gray-300 font-semibold border-b border-gray-600">
              Rank
            </th>
            <th className="px-4 py-3 text-gray-300 font-semibold border-b border-gray-600">
              Date
            </th>
            <th className="px-4 py-3 text-gray-300 font-semibold border-b border-gray-600">
              Gap Open %
            </th>
            <th className="px-4 py-3 text-gray-300 font-semibold border-b border-gray-600">
              Intraday Change %
            </th>
            <th className="px-4 py-3 text-gray-300 font-semibold border-b border-gray-600">
              Day Change %
            </th>
          </tr>
        </thead>
        <tbody>
          {gapOpens.map((gap, index) => (
            <tr
              key={index}
              className="border-b border-gray-700 hover:bg-gray-700/30 transition-colors"
              style={{
                backgroundColor: consecutiveIndices.has(index) ? "rgba(59, 130, 246, 0.2)" : "transparent"
              }}
            >
              <td className="px-4 py-3 text-white font-medium">
                #{index + 1}
              </td>
              <td className="px-4 py-3 text-gray-300">
                {gap.date}
              </td>
              <td
                className="px-4 py-3 font-bold text-white"
                style={{ backgroundColor: getColorForChange(gap.gapOpenPercent, minChange, maxChange) }}
              >
                {gap.gapOpenPercent >= 0 ? "+" : ""}
                {gap.gapOpenPercent.toFixed(2)}%
              </td>
              <td
                className="px-4 py-3 font-bold text-white"
                style={{ backgroundColor: getColorForChange(gap.intradayChange, minChange, maxChange) }}
              >
                {gap.intradayChange >= 0 ? "+" : ""}
                {gap.intradayChange.toFixed(2)}%
              </td>
              <td
                className="px-4 py-3 font-bold text-white"
                style={{ backgroundColor: getColorForChange(gap.dayChange, minChange, maxChange) }}
              >
                {gap.dayChange >= 0 ? "+" : ""}
                {gap.dayChange.toFixed(2)}%
              </td>
            </tr>
          ))}
          {/* Average row */}
          <tr className="bg-gray-700/50 border-t-2 border-blue-500">
            <td className="px-4 py-3 text-white font-bold" colSpan="2">
              Average
            </td>
            <td
              className="px-4 py-3 font-bold text-white"
              style={{ backgroundColor: getColorForChange(avgGapOpen, minChange, maxChange) }}
            >
              {avgGapOpen >= 0 ? "+" : ""}
              {avgGapOpen.toFixed(2)}%
            </td>
            <td
              className="px-4 py-3 font-bold text-white"
              style={{ backgroundColor: getColorForChange(avgIntraday, minChange, maxChange) }}
            >
              {avgIntraday >= 0 ? "+" : ""}
              {avgIntraday.toFixed(2)}%
            </td>
            <td
              className="px-4 py-3 font-bold text-white"
              style={{ backgroundColor: getColorForChange(avgDayChange, minChange, maxChange) }}
            >
              {avgDayChange >= 0 ? "+" : ""}
              {avgDayChange.toFixed(2)}%
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
