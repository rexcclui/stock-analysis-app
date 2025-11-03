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
