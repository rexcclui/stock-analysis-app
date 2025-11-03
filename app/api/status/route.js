import { NextResponse } from 'next/server';
import { printPageLoadSummary, getPageLoadStats } from '../../../middleware';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') || 'json';

  // Print summary to console
  console.log('\n[STATUS ENDPOINT] Request received - printing page load summary...\n');
  printPageLoadSummary();

  const stats = getPageLoadStats();

  if (format === 'json') {
    return NextResponse.json(stats);
  }

  // HTML format
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Page Load Summary</title>
      <style>
        body { font-family: monospace; background: #1e1e1e; color: #d4d4d4; padding: 20px; }
        .container { max-width: 1000px; margin: 0 auto; }
        h1 { color: #4ec9b0; text-align: center; }
        .stats { background: #252526; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #007acc; }
        .stat-row { display: flex; justify-content: space-between; margin: 5px 0; }
        .request-count { color: #4ec9b0; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #3e3e42; }
        th { background: #2d2d30; color: #4ec9b0; }
        tr:hover { background: #2d2d30; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>📊 Page Load Tracking Summary</h1>
        
        <div class="stats">
          <h2>Server Statistics</h2>
          <div class="stat-row">
            <span>Server Started:</span>
            <strong>${new Date(stats.startTime).toLocaleString()}</strong>
          </div>
          <div class="stat-row">
            <span>Uptime:</span>
            <strong>${Math.floor(stats.uptime / 1000)}s</strong>
          </div>
          <div class="stat-row">
            <span>Total Page Loads:</span>
            <strong class="request-count">${stats.totalPageLoads}</strong>
          </div>
          <div class="stat-row">
            <span>Unique IPs:</span>
            <strong class="request-count">${stats.uniqueIps}</strong>
          </div>
        </div>

        <h2>IP Page Load Breakdown</h2>
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>IP Address</th>
              <th>Page Loads</th>
            </tr>
          </thead>
          <tbody>
            ${stats.ipDetails.map((item, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td>${item.ip}</td>
                <td class="request-count">${item.pageLoads}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </body>
    </html>
  `;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' },
  });
}
