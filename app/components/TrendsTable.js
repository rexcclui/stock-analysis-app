export function TrendsTable({ trends }) {
  if (!trends || trends.length === 0) return null;

  // Calculate min/max for conditional formatting
  const totalChanges = trends.map(t => t.totalChange);
  const days = trends.map(t => t.days);

  const maxChange = Math.max(...totalChanges);
  const minChange = Math.min(...totalChanges);
  const maxDays = Math.max(...days);
  const minDays = Math.min(...days);

  // Color interpolation function
  const getColorForValue = (value, min, max) => {
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

  const getColorForDays = (value, min, max) => {
    if (max === min) return "rgba(59, 130, 246, 0.3)";

    // Days: pale blue to deep blue (higher days = deeper blue)
    const intensity = (value - min) / (max - min);
    const r = Math.round(173 - (173 - 29) * intensity);
    const g = Math.round(216 - (216 - 78) * intensity);
    const b = Math.round(230 - (230 - 216) * intensity);
    const alpha = 0.2 + intensity * 0.6;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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
              Start Date
            </th>
            <th className="px-4 py-3 text-gray-300 font-semibold border-b border-gray-600">
              End Date
            </th>
            <th className="px-4 py-3 text-gray-300 font-semibold border-b border-gray-600">
              Days
            </th>
            <th className="px-4 py-3 text-gray-300 font-semibold border-b border-gray-600">
              Total Change
            </th>
            <th className="px-4 py-3 text-gray-300 font-semibold border-b border-gray-600">
              First Day Change
            </th>
            <th className="px-4 py-3 text-gray-300 font-semibold border-b border-gray-600">
              Start Price
            </th>
            <th className="px-4 py-3 text-gray-300 font-semibold border-b border-gray-600">
              End Price
            </th>
          </tr>
        </thead>
        <tbody>
          {trends.map((trend, index) => (
            <tr
              key={index}
              className="border-b border-gray-700 hover:bg-gray-700/30 transition-colors"
            >
              <td className="px-4 py-3 text-white font-medium">
                #{index + 1}
              </td>
              <td className="px-4 py-3 text-gray-300">
                {trend.startDate}
              </td>
              <td className="px-4 py-3 text-gray-300">{trend.endDate}</td>
              <td
                className="px-4 py-3 text-white font-medium"
                style={{ backgroundColor: getColorForDays(trend.days, minDays, maxDays) }}
              >
                {trend.days}
              </td>
              <td
                className="px-4 py-3 font-bold text-white"
                style={{ backgroundColor: getColorForValue(trend.totalChange, minChange, maxChange) }}
              >
                {trend.totalChange >= 0 ? "+" : ""}
                {trend.totalChange.toFixed(2)}%
              </td>
              <td
                className={`px-4 py-3 font-medium ${
                  trend.firstDayChange >= 0
                    ? "text-green-400"
                    : "text-red-400"
                }`}
              >
                {trend.firstDayChange >= 0 ? "+" : ""}
                {trend.firstDayChange.toFixed(2)}%
              </td>
              <td className="px-4 py-3 text-gray-300">
                ${trend.startPrice.toFixed(2)}
              </td>
              <td className="px-4 py-3 text-gray-300">
                ${trend.endPrice.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
