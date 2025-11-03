import { NextResponse } from 'next/server';

// Track page loads only
const pageLoadTracker = new Map();
const startTime = new Date();

export function middleware(request) {
  const pathname = request.nextUrl.pathname;
  
  // Only track page loads (when page.js is loaded - the root / path)
  if (pathname === '/' || pathname === '') {
    // Extract IP from request headers
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') || 'unknown';
    
    // Track page load for this IP
    const currentCount = pageLoadTracker.get(ip) || 0;
    pageLoadTracker.set(ip, currentCount + 1);
    
    console.log(`[PAGE LOAD] IP: ${ip} | Total page loads from this IP: ${pageLoadTracker.get(ip)}`);
  }

  return NextResponse.next();
}

// Configure to apply to all routes
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

// Export function to get page load stats
export function getPageLoadStats() {
  const stats = {
    totalPageLoads: Array.from(pageLoadTracker.values()).reduce((a, b) => a + b, 0),
    uniqueIps: pageLoadTracker.size,
    ipDetails: Array.from(pageLoadTracker.entries()).map(([ip, count]) => ({
      ip,
      pageLoads: count,
    })).sort((a, b) => b.pageLoads - a.pageLoads),
    startTime: startTime.toISOString(),
    uptime: Date.now() - startTime.getTime(),
  };
  return stats;
}

// Export function to print summary
export function printPageLoadSummary() {
  const stats = getPageLoadStats();
  const uptimeMs = stats.uptime;
  const hours = Math.floor(uptimeMs / 3600000);
  const minutes = Math.floor((uptimeMs % 3600000) / 60000);
  const seconds = Math.floor((uptimeMs % 60000) / 1000);

  console.log('\n' + '='.repeat(80));
  console.log('┌' + '─'.repeat(78) + '┐');
  console.log('│' + ' '.repeat(25) + 'PAGE LOAD SUMMARY' + ' '.repeat(37) + '│');
  console.log('├' + '─'.repeat(78) + '┤');
  console.log(`│ Server Uptime: ${`${hours}h ${minutes}m ${seconds}s`.padEnd(70)} │`);
  console.log(`│ Started: ${stats.startTime.padEnd(70)} │`);
  console.log('├' + '─'.repeat(78) + '┤');
  console.log(`│ Total Page Loads: ${stats.totalPageLoads.toString().padEnd(59)} │`);
  console.log(`│ Unique IPs: ${stats.uniqueIps.toString().padEnd(65)} │`);
  console.log('├' + '─'.repeat(78) + '┤');
  console.log('│ IP PAGE LOAD BREAKDOWN:' + ' '.repeat(55) + '│');
  
  stats.ipDetails.forEach((item, idx) => {
    const ipStr = `${idx + 1}. ${item.ip}`;
    const loadStr = `Page Loads: ${item.pageLoads}`;
    const padding = 78 - ipStr.length - loadStr.length - 2;
    console.log(`│ ${ipStr}${' '.repeat(Math.max(1, padding))}${loadStr} │`);
  });
  
  console.log('└' + '─'.repeat(78) + '┘');
  console.log('='.repeat(80) + '\n');
}
