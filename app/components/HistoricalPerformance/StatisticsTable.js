export function StatisticsTable({ statistics, title }) {
  if (!statistics) return null;

  const { weekdays, months, quarters, specialDays } = statistics;

  // Get all averages for conditional formatting
  const allAverages = [
    ...weekdays.flatMap(s => [s.upAverage, s.downAverage]),
    ...months.flatMap(s => [s.upAverage, s.downAverage]),
    ...quarters.flatMap(s => [s.upAverage, s.downAverage]),
    ...specialDays.flatMap(s => [s.upAverage, s.downAverage]),
  ];

  const maxAvg = Math.max(...allAverages);
  const minAvg = Math.min(...allAverages);

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

  const renderStatRow = (stat, index) => {
    const upCountHigher = stat.upCount > stat.downCount;
    const upCountColor = upCountHigher ? "rgba(59, 130, 246, 0.5)" : "rgba(107, 114, 128, 0.3)"; // blue or grey
    const downCountColor = !upCountHigher ? "rgba(59, 130, 246, 0.5)" : "rgba(107, 114, 128, 0.3)"; // blue or grey

    return (
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
        <td className="px-4 py-3 text-gray-300 font-medium">
          {stat.label}
        </td>
        <td className="px-4 py-3 font-bold text-white">
          {stat.upAverage > 0 ? "+" : ""}
          {stat.upAverage.toFixed(2)}%
        </td>
        <td
          className="px-4 py-3 font-medium text-white"
          style={{ backgroundColor: upCountColor }}
        >
          {stat.upCount}
        </td>
        <td
          className="px-4 py-3 font-medium text-white"
          style={{ backgroundColor: downCountColor }}
        >
          {stat.downCount}
        </td>
        <td
          className="px-4 py-3 font-bold text-white"
          style={{ backgroundColor: getColorForValue(stat.downAverage, minAvg, maxAvg) }}
        >
          {stat.downAverage >= 0 ? "+" : ""}
          {stat.downAverage.toFixed(2)}%
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-6">
      {/* Weekdays */}
      <div>
        <h3 className="text-lg font-semibold text-blue-400 mb-3">By Weekday</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-700">
                <th className="px-4 py-3 text-gray-300 font-semibold border-b border-gray-600">
                  Day
                </th>
                <th className="px-4 py-3 text-gray-300 font-semibold border-b border-gray-600">
                  Avg Up {title}
                </th>
                <th className="px-4 py-3 text-gray-300 font-semibold border-b border-gray-600">
                  Count Up
                </th>
                <th className="px-4 py-3 text-gray-300 font-semibold border-b border-gray-600">
                  Count Down
                </th>
                <th className="px-4 py-3 text-gray-300 font-semibold border-b border-gray-600">
                  Avg Down {title}
                </th>
              </tr>
            </thead>
            <tbody>
              {weekdays.map(renderStatRow)}
            </tbody>
          </table>
        </div>
      </div>

      {/* Months */}
      <div>
        <h3 className="text-lg font-semibold text-blue-400 mb-3">By Month</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-700">
                <th className="px-4 py-3 text-gray-300 font-semibold border-b border-gray-600">
                  Month
                </th>
                <th className="px-4 py-3 text-gray-300 font-semibold border-b border-gray-600">
                  Avg Up {title}
                </th>
                <th className="px-4 py-3 text-gray-300 font-semibold border-b border-gray-600">
                  Count Up
                </th>
                <th className="px-4 py-3 text-gray-300 font-semibold border-b border-gray-600">
                  Count Down
                </th>
                <th className="px-4 py-3 text-gray-300 font-semibold border-b border-gray-600">
                  Avg Down {title}
                </th>
              </tr>
            </thead>
            <tbody>
              {months.map(renderStatRow)}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quarters */}
      <div>
        <h3 className="text-lg font-semibold text-blue-400 mb-3">By Quarter</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-700">
                <th className="px-4 py-3 text-gray-300 font-semibold border-b border-gray-600">
                  Quarter
                </th>
                <th className="px-4 py-3 text-gray-300 font-semibold border-b border-gray-600">
                  Avg Up {title}
                </th>
                <th className="px-4 py-3 text-gray-300 font-semibold border-b border-gray-600">
                  Count Up
                </th>
                <th className="px-4 py-3 text-gray-300 font-semibold border-b border-gray-600">
                  Count Down
                </th>
                <th className="px-4 py-3 text-gray-300 font-semibold border-b border-gray-600">
                  Avg Down {title}
                </th>
              </tr>
            </thead>
            <tbody>
              {quarters.map(renderStatRow)}
            </tbody>
          </table>
        </div>
      </div>

      {/* Special Days */}
      <div>
        <h3 className="text-lg font-semibold text-blue-400 mb-3">Special Days</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-700">
                <th className="px-4 py-3 text-gray-300 font-semibold border-b border-gray-600">
                  Period
                </th>
                <th className="px-4 py-3 text-gray-300 font-semibold border-b border-gray-600">
                  Avg Up {title}
                </th>
                <th className="px-4 py-3 text-gray-300 font-semibold border-b border-gray-600">
                  Count Up
                </th>
                <th className="px-4 py-3 text-gray-300 font-semibold border-b border-gray-600">
                  Count Down
                </th>
                <th className="px-4 py-3 text-gray-300 font-semibold border-b border-gray-600">
                  Avg Down {title}
                </th>
              </tr>
            </thead>
            <tbody>
              {specialDays.map(renderStatRow)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
