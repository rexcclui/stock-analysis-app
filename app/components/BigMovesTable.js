export function BigMovesTable({ bigMoves }) {
  if (!bigMoves || bigMoves.length === 0) return null;

  // Calculate min/max for conditional formatting
  const dayChanges = bigMoves.map(m => m.dayChange);
  const after1Days = bigMoves.map(m => m.after1Day);
  const after2Days = bigMoves.map(m => m.after2Days);
  const after3Days = bigMoves.map(m => m.after3Days);

  const allChanges = [...dayChanges, ...after1Days, ...after2Days, ...after3Days];
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
              Day Change
            </th>
            <th className="px-4 py-3 text-gray-300 font-semibold border-b border-gray-600">
              After 1 Day
            </th>
            <th className="px-4 py-3 text-gray-300 font-semibold border-b border-gray-600">
              After 2 Days
            </th>
            <th className="px-4 py-3 text-gray-300 font-semibold border-b border-gray-600">
              After 3 Days
            </th>
            <th className="px-4 py-3 text-gray-300 font-semibold border-b border-gray-600">
              Price
            </th>
          </tr>
        </thead>
        <tbody>
          {bigMoves.map((move, index) => (
            <tr
              key={index}
              className="border-b border-gray-700 hover:bg-gray-700/30 transition-colors"
            >
              <td className="px-4 py-3 text-white font-medium">
                #{index + 1}
              </td>
              <td className="px-4 py-3 text-gray-300">
                {move.date}
              </td>
              <td
                className="px-4 py-3 font-bold text-white"
                style={{ backgroundColor: getColorForChange(move.dayChange, minChange, maxChange) }}
              >
                {move.dayChange >= 0 ? "+" : ""}
                {move.dayChange.toFixed(2)}%
              </td>
              <td
                className="px-4 py-3 font-bold text-white"
                style={{ backgroundColor: getColorForChange(move.after1Day, minChange, maxChange) }}
              >
                {move.after1Day >= 0 ? "+" : ""}
                {move.after1Day.toFixed(2)}%
              </td>
              <td
                className="px-4 py-3 font-bold text-white"
                style={{ backgroundColor: getColorForChange(move.after2Days, minChange, maxChange) }}
              >
                {move.after2Days >= 0 ? "+" : ""}
                {move.after2Days.toFixed(2)}%
              </td>
              <td
                className="px-4 py-3 font-bold text-white"
                style={{ backgroundColor: getColorForChange(move.after3Days, minChange, maxChange) }}
              >
                {move.after3Days >= 0 ? "+" : ""}
                {move.after3Days.toFixed(2)}%
              </td>
              <td className="px-4 py-3 text-gray-300">
                ${move.price.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
