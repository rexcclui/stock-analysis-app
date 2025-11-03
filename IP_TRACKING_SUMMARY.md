# IP Request Tracking Implementation Summary

## Overview
Successfully implemented comprehensive IP request tracking that counts and logs incoming requests from each IP address, with detailed summaries available through a dedicated API endpoint.

## What Was Added

### 1. **Middleware** (`middleware.js`)
- Extracts client IP from request headers
- Logs every incoming request with timestamp, method, path, and IP
- Configured to apply to all `/api/*` routes
- Extracts IP from `x-forwarded-for` header (proxy/load balancer) or `x-real-ip`

### 2. **IP Tracker Utility** (`lib/ipTracker.js`)
Core tracking functions:
- `trackRequest(ip, method, path, status, duration)` - Records individual requests
- `getIpStats()` - Returns aggregated statistics by IP
- `printSummary()` - Console output with formatted table
- `printDetailedSummary()` - Detailed breakdown with recent requests per IP
- In-memory storage with automatic cleanup (keeps last 100 requests per IP, last 1000 total)

### 3. **Status Endpoint** (`app/api/status/route.js`)
RESTful API to access tracking data:
- **JSON response**: `GET /api/status?format=json`
- **HTML Dashboard**: `GET /api/status` (default)
- **Detailed breakdown**: `GET /api/status?detailed=true`

Returns:
```json
{
  "totalRequests": number,
  "uniqueIps": number,
  "serverUptime": milliseconds,
  "startTime": ISO string,
  "ipDetails": [
    {
      "ip": "192.168.x.x",
      "requestCount": number,
      "totalDuration": milliseconds,
      "avgDuration": string,
      "requests": [recent request details]
    }
  ]
}
```

### 4. **API Route Integration**
Modified key routes to track every request:
- `app/api/stock/route.js` - Now tracks stock API calls
- `app/api/sentiment/route.js` - Now tracks sentiment API calls

Tracking captures:
- Request duration in milliseconds
- HTTP status code
- IP address
- Full request path with parameters
- Timestamp

## How It Works

### Per-Request Flow:
1. Client makes API request (e.g., `/api/stock?symbol=AAPL`)
2. Middleware extracts IP address from headers (silently, no logging)
3. API route handler starts timer and extracts IP
4. Route processes request (calls external APIs, caches, etc.)
5. Before returning response, tracks request with duration (silently)
6. Data stored in memory for later retrieval

### Console Output:
- **During requests:** No console output (clean, quiet operation)
- **When accessing `/api/status`:** Formatted summary prints to console

Example console output when you call `/api/status`:

### Accessing Statistics:

**Option 1: Console Output**
Access `/api/status` and formatted summary auto-prints to server console

**Option 2: JSON API**
```bash
curl http://localhost:3000/api/status?format=json | jq
```

**Option 3: HTML Dashboard**
```bash
# Open in browser
http://localhost:3000/api/status
```

Shows interactive table with:
- Rank by request volume
- IP address (clickable, colored)
- Request count
- Total & average response times

## Data Structure

### In-Memory Storage (per IP):
```javascript
{
  ip: "192.168.x.x",
  count: 25,
  requests: [
    { method, path, status, timestamp, duration },
    // ... last 100 requests
  ],
  totalDuration: 5234  // milliseconds
}
```

### Global Metrics:
```javascript
{
  startTime: Date,
  requestLog: [
    { ip, method, path, status, duration, timestamp },
    // ... last 1000 requests
  ]
}
```

## Key Features

✅ **Real-time Tracking** - Every request logged immediately
✅ **Multiple Data Formats** - JSON, HTML, Console
✅ **Low Overhead** - In-memory Map-based storage
✅ **Server Uptime Tracking** - Measures time since server start
✅ **Response Time Analytics** - Tracks duration per request
✅ **Request History** - Keeps recent requests per IP
✅ **Automatic Cleanup** - Prevents unbounded memory growth
✅ **Proxy Support** - Handles `x-forwarded-for` headers

## Usage Examples

### Get JSON statistics:
```bash
curl http://localhost:3000/api/status?format=json
```

### Get detailed breakdown:
```bash
curl http://localhost:3000/api/status?detailed=true
```

### Monitor specific IP's requests:
```bash
curl http://localhost:3000/api/status | grep "192.168.1.100"
```

### Check average response time:
```bash
curl http://localhost:3000/api/status?format=json | jq '.ipDetails[0].avgDuration'
```

## Server Console Output Example

When you make requests and access `/api/status`, console shows:

```
================================================================================
┌──────────────────────────────────────────────────────────────────────────────┐
│                   IP REQUEST TRACKING SUMMARY                               │
├──────────────────────────────────────────────────────────────────────────────┤
│ Server Uptime: 0h 5m 30s                                                     │
│ Started: 2025-11-03T18:55:00.000Z                                            │
├──────────────────────────────────────────────────────────────────────────────┤
│ Total Requests: 42                                                           │
│ Unique IPs: 3                                                                │
├──────────────────────────────────────────────────────────────────────────────┤
│ IP REQUEST BREAKDOWN:                                                        │
│ 1. 192.168.1.100                     Reqs: 25 | Avg: 209.36ms               │
│ 2. 192.168.1.101                     Reqs: 12 | Avg: 204.67ms               │
│ 3. 192.168.1.102                     Reqs: 5  | Avg: 197.40ms               │
└──────────────────────────────────────────────────────────────────────────────┘
================================================================================
```

## Files Modified/Created

- ✅ `middleware.js` (CREATED) - Request interception and logging
- ✅ `lib/ipTracker.js` (CREATED) - Core tracking utility
- ✅ `app/api/status/route.js` (CREATED) - Statistics endpoint
- ✅ `app/api/stock/route.js` (MODIFIED) - Added IP tracking
- ✅ `app/api/sentiment/route.js` (MODIFIED) - Added IP tracking
- ✅ `IP_TRACKING.md` (CREATED) - User documentation

## Next Steps (Optional)

Can extend this feature to:
1. Persist data to database for long-term analytics
2. Add rate limiting per IP
3. Export summaries to CSV/JSON files
4. Add time-range filtering
5. Create webhooks for alerts on high-traffic IPs
6. Build real-time dashboard with WebSockets
7. Track more metrics (CPU, memory, cache hit rate)
