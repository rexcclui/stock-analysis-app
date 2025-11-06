export function SpyCorrelationTable({ correlations }) {
  if (!correlations || correlations.length === 0) return null;

  // Calculate min/max for conditional formatting
  const allChanges = [];
  correlations.forEach(c => {
    allChanges.push(
      c.spyChange,
      c.stockSameDay,
      c.stockAfter1Day,
      c.stockAfter2Days,
      c.stockAfter3Days,
      c.stockAfter7Days,
      c.spyAfter1Day,
      c.spyAfter2Days,
      c.spyAfter3Days,
      c.spyAfter7Days
    );
  });

  const maxChange = Math.max(...allChanges);
  const minChange = Math.min(...allChanges);

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
              SPY Change
            </th>
            <th className="px-4 py-3 text-gray-300 font-semibold border-b border-gray-600">
              Change
            </th>
            <th className="px-4 py-3 text-gray-300 font-semibold border-b border-gray-600">
              1 Day
            </th>
            <th className="px-4 py-3 text-gray-300 font-semibold border-b border-gray-600">
              SPY 1 Day
            </th>
            <th className="px-4 py-3 text-gray-300 font-semibold border-b border-gray-600">
              2 Days
            </th>
            <th className="px-4 py-3 text-gray-300 font-semibold border-b border-gray-600">
              SPY 2 Days
            </th>
            <th className="px-4 py-3 text-gray-300 font-semibold border-b border-gray-600">
              3 Days
            </th>
            <th className="px-4 py-3 text-gray-300 font-semibold border-b border-gray-600">
              SPY 3 Days
            </th>
            <th className="px-4 py-3 text-gray-300 font-semibold border-b border-gray-600">
              7 Days
            </th>
            <th className="px-4 py-3 text-gray-300 font-semibold border-b border-gray-600">
              SPY 7 Days
            </th>
          </tr>
        </thead>
        <tbody>
          {correlations.map((corr, index) => (
            <tr
              key={index}
              className="border-b border-gray-700 transition-colors"
              style={{ cursor: 'pointer' }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = '#fde047';
                e.currentTarget.style.color = '#2563eb';
                Array.from(e.currentTarget.querySelectorAll('td')).forEach(td => { td.style.color = '#2563eb'; });
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = '';
                e.currentTarget.style.color = '';
                Array.from(e.currentTarget.querySelectorAll('td')).forEach(td => { td.style.color = ''; });
              }}
            >
              <td className="px-4 py-3 text-white font-medium">
                #{index + 1}
              </td>
              <td className="px-4 py-3 text-gray-300">
                {corr.date}
              </td>
              <td className="px-4 py-3 font-bold text-white">
                {corr.spyChange >= 0 ? "+" : ""}
                {corr.spyChange.toFixed(2)}%
              </td>
              <td
                className="px-4 py-3 font-bold text-white"
                style={{ backgroundColor: getColorForChange(corr.stockSameDay, minChange, maxChange) }}
              >
                {corr.stockSameDay >= 0 ? "+" : ""}
                {corr.stockSameDay.toFixed(2)}%
              </td>
              <td
                className="px-4 py-3 font-bold text-white"
                style={{ backgroundColor: getColorForChange(corr.stockAfter1Day, minChange, maxChange) }}
              >
                {corr.stockAfter1Day >= 0 ? "+" : ""}
                {corr.stockAfter1Day.toFixed(2)}%
              </td>
              <td
                className="px-4 py-3 font-bold text-white"
                style={{ backgroundColor: getColorForChange(corr.spyAfter1Day, minChange, maxChange) }}
              >
                {corr.spyAfter1Day >= 0 ? "+" : ""}
                {corr.spyAfter1Day.toFixed(2)}%
              </td>
              <td
                className="px-4 py-3 font-bold text-white"
                style={{ backgroundColor: getColorForChange(corr.stockAfter2Days, minChange, maxChange) }}
              >
                {corr.stockAfter2Days >= 0 ? "+" : ""}
                {corr.stockAfter2Days.toFixed(2)}%
              </td>
              <td
                className="px-4 py-3 font-bold text-white"
                style={{ backgroundColor: getColorForChange(corr.spyAfter2Days, minChange, maxChange) }}
              >
                {corr.spyAfter2Days >= 0 ? "+" : ""}
                {corr.spyAfter2Days.toFixed(2)}%
              </td>
              <td
                className="px-4 py-3 font-bold text-white"
                style={{ backgroundColor: getColorForChange(corr.stockAfter3Days, minChange, maxChange) }}
              >
                {corr.stockAfter3Days >= 0 ? "+" : ""}
                {corr.stockAfter3Days.toFixed(2)}%
              </td>
              <td
                className="px-4 py-3 font-bold text-white"
                style={{ backgroundColor: getColorForChange(corr.spyAfter3Days, minChange, maxChange) }}
              >
                {corr.spyAfter3Days >= 0 ? "+" : ""}
                {corr.spyAfter3Days.toFixed(2)}%
              </td>
              <td
                className="px-4 py-3 font-bold text-white"
                style={{ backgroundColor: getColorForChange(corr.stockAfter7Days, minChange, maxChange) }}
              >
                {corr.stockAfter7Days >= 0 ? "+" : ""}
                {corr.stockAfter7Days.toFixed(2)}%
              </td>
              <td
                className="px-4 py-3 font-bold text-white"
                style={{ backgroundColor: getColorForChange(corr.spyAfter7Days, minChange, maxChange) }}
              >
                {corr.spyAfter7Days >= 0 ? "+" : ""}
                {corr.spyAfter7Days.toFixed(2)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
