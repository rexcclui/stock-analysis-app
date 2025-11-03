import React from 'react';

export function SeasonalAnalysis({ cycleAnalysis, stockCode }) {
  return (
    <div className="space-y-6">
      <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4 mb-6">
        <p className="italic" style={{ fontSize: '11px', color: '#fef08a' }}>
          <strong style={{ fontStyle: 'normal', color: '#fefce8' }}>Seasonal/Calendar Patterns Analysis:</strong> This analysis examines historical performance patterns across different time periods.
          <strong style={{ fontStyle: 'normal', color: '#fde047' }}> Avg Return</strong> shows the average daily price change for that period.
          <strong style={{ fontStyle: 'normal', color: '#fde047' }}> Win Rate</strong> shows the percentage of days with positive returns.
          Higher win rates indicate more consistent positive performance during those periods.
        </p>
      </div>

      <div className="rounded-lg p-6 border" style={{ backgroundColor: 'rgba(23, 37, 84, 0.5)', borderColor: '#1e3a8a' }}>
        <h3 className="text-lg font-bold mb-4" style={{ color: '#dbeafe' }}>Monthly Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid #1d4ed8' }}>
                <th className="text-left py-2 px-3" style={{ color: '#93c5fd' }}>Month</th>
                <th className="text-center py-2 px-3" colSpan="2" style={{ color: '#93c5fd' }}>{stockCode}</th>
                {cycleAnalysis.benchmarks?.map((benchmark, idx) => (
                  <th key={idx} className="text-center py-2 px-3" style={{ color: '#93c5fd' }} colSpan="2">{benchmark}</th>
                ))}
              </tr>
              <tr style={{ borderBottom: '1px solid #1d4ed8' }}>
                <th className="text-left py-2 px-3" style={{ color: '#93c5fd' }}></th>
                <th className="text-right py-2 px-2 text-xs" style={{ color: '#93c5fd' }}>Avg Return</th>
                <th className="text-right py-2 px-2 text-xs" style={{ color: '#93c5fd' }}>Win Rate</th>
                {cycleAnalysis.benchmarks?.map((benchmark, idx) => (
                  <React.Fragment key={idx}>
                    <th className="text-right py-2 px-2 text-xs" style={{ color: '#93c5fd' }}>Avg Return</th>
                    <th className="text-right py-2 px-2 text-xs" style={{ color: '#93c5fd' }}>Win Rate</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {cycleAnalysis.monthly?.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #1e3a8a' }}>
                  <td className="py-2 px-3 font-medium" style={{ color: '#dbeafe' }}>{item.month}</td>
                  <td className={`text-right py-2 px-2 text-sm ${parseFloat(item.avgReturn) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {item.avgReturn}%
                  </td>
                  <td className="text-right py-2 px-2 text-sm" style={{ color: '#bfdbfe' }}>{item.winRate}%</td>
                  {cycleAnalysis.benchmarks?.map((benchmark, bIdx) => (
                    <React.Fragment key={bIdx}>
                      <td className={`text-right py-2 px-2 text-sm ${parseFloat(item[`${benchmark}_avgReturn`]) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {item[`${benchmark}_avgReturn`]}%
                      </td>
                      <td className="text-right py-2 px-2 text-sm" style={{ color: '#bfdbfe' }}>{item[`${benchmark}_winRate`]}%</td>
                    </React.Fragment>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg p-6 border" style={{ backgroundColor: 'rgba(23, 37, 84, 0.5)', borderColor: '#1e3a8a' }}>
        <h3 className="text-lg font-bold mb-4" style={{ color: '#dbeafe' }}>Quarterly Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid #1d4ed8' }}>
                <th className="text-left py-2 px-3" style={{ color: '#93c5fd' }}>Quarter</th>
                <th className="text-center py-2 px-3" style={{ color: '#93c5fd' }} colSpan="2">{stockCode}</th>
                {cycleAnalysis.benchmarks?.map((benchmark, idx) => (
                  <th key={idx} className="text-center py-2 px-3" style={{ color: '#93c5fd' }} colSpan="2">{benchmark}</th>
                ))}
              </tr>
              <tr style={{ borderBottom: '1px solid #1d4ed8' }}>
                <th className="text-left py-2 px-3" style={{ color: '#93c5fd' }}></th>
                <th className="text-right py-2 px-2 text-xs" style={{ color: '#93c5fd' }}>Avg Return</th>
                <th className="text-right py-2 px-2 text-xs" style={{ color: '#93c5fd' }}>Win Rate</th>
                {cycleAnalysis.benchmarks?.map((benchmark, idx) => (
                  <React.Fragment key={idx}>
                    <th className="text-right py-2 px-2 text-xs" style={{ color: '#93c5fd' }}>Avg Return</th>
                    <th className="text-right py-2 px-2 text-xs" style={{ color: '#93c5fd' }}>Win Rate</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {cycleAnalysis.quarterly?.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #1e3a8a' }}>
                  <td className="py-2 px-3 font-medium" style={{ color: '#dbeafe' }}>{item.quarter}</td>
                  <td className={`text-right py-2 px-2 text-sm ${parseFloat(item.avgReturn) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {item.avgReturn}%
                  </td>
                  <td className="text-right py-2 px-2 text-sm" style={{ color: '#bfdbfe' }}>{item.winRate}%</td>
                  {cycleAnalysis.benchmarks?.map((benchmark, bIdx) => (
                    <React.Fragment key={bIdx}>
                      <td className={`text-right py-2 px-2 text-sm ${parseFloat(item[`${benchmark}_avgReturn`]) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {item[`${benchmark}_avgReturn`]}%
                      </td>
                      <td className="text-right py-2 px-2 text-sm" style={{ color: '#bfdbfe' }}>{item[`${benchmark}_winRate`]}%</td>
                    </React.Fragment>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg p-6 border" style={{ backgroundColor: 'rgba(23, 37, 84, 0.5)', borderColor: '#1e3a8a' }}>
        <h3 className="text-lg font-bold mb-4" style={{ color: '#dbeafe' }}>Day of Week Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid #1d4ed8' }}>
                <th className="text-left py-2 px-3" style={{ color: '#93c5fd' }}>Day</th>
                <th className="text-center py-2 px-3" style={{ color: '#93c5fd' }} colSpan="2">{stockCode}</th>
                {cycleAnalysis.benchmarks?.map((benchmark, idx) => (
                  <th key={idx} className="text-center py-2 px-3" style={{ color: '#93c5fd' }} colSpan="2">{benchmark}</th>
                ))}
              </tr>
              <tr style={{ borderBottom: '1px solid #1d4ed8' }}>
                <th className="text-left py-2 px-3" style={{ color: '#93c5fd' }}></th>
                <th className="text-right py-2 px-2 text-xs" style={{ color: '#93c5fd' }}>Avg Return</th>
                <th className="text-right py-2 px-2 text-xs" style={{ color: '#93c5fd' }}>Win Rate</th>
                {cycleAnalysis.benchmarks?.map((benchmark, idx) => (
                  <React.Fragment key={idx}>
                    <th className="text-right py-2 px-2 text-xs" style={{ color: '#93c5fd' }}>Avg Return</th>
                    <th className="text-right py-2 px-2 text-xs" style={{ color: '#93c5fd' }}>Win Rate</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {cycleAnalysis.dayOfWeek?.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #1e3a8a' }}>
                  <td className="py-2 px-3 font-medium" style={{ color: '#dbeafe' }}>{item.day}</td>
                  <td className={`text-right py-2 px-2 text-sm ${parseFloat(item.avgReturn) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {item.avgReturn}%
                  </td>
                  <td className="text-right py-2 px-2 text-sm" style={{ color: '#bfdbfe' }}>{item.winRate}%</td>
                  {cycleAnalysis.benchmarks?.map((benchmark, bIdx) => (
                    <React.Fragment key={bIdx}>
                      <td className={`text-right py-2 px-2 text-sm ${parseFloat(item[`${benchmark}_avgReturn`]) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {item[`${benchmark}_avgReturn`]}%
                      </td>
                      <td className="text-right py-2 px-2 text-sm" style={{ color: '#bfdbfe' }}>{item[`${benchmark}_winRate`]}%</td>
                    </React.Fragment>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
