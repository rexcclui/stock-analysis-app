# Page Load Tracking

This application includes built-in tracking for page loads from each IP address.

## Features

### 1. **Automatic Page Load Tracking**
- Every time someone visits the main page (`/`), it's recorded by IP address
- Tracks unique visitors and page load counts
- Extracts IP from headers: `x-forwarded-for` → `x-real-ip` → `unknown`
- Logs to console when page is loaded

### 2. **Server-side Logging**
- Each page load logs to console:
```
[PAGE LOAD] IP: 127.0.0.1 | Total page loads from this IP: 5
```

### 3. **Status Endpoint**
Access the tracking summary at any time via the status API:

**JSON Format:**
```bash
curl http://localhost:3000/api/status?format=json
```

**HTML Dashboard:**
```bash
curl http://localhost:3000/api/status
```

Response example (JSON):
```json
{
  "totalPageLoads": 42,
  "uniqueIps": 3,
  "uptime": 3600000,
  "startTime": "2025-11-03T18:00:00.000Z",
  "ipDetails": [
    {
      "ip": "127.0.0.1",
      "pageLoads": 25
    },
    {
      "ip": "192.168.1.101",
      "pageLoads": 12
    },
    {
      "ip": "192.168.1.102",
      "pageLoads": 5
    }
  ]
}
```

### 4. **Console Summary**
When you access `/api/status`, a formatted summary is printed to the server console:

```
[STATUS ENDPOINT] Request received - printing page load summary...

================================================================================
┌──────────────────────────────────────────────────────────────────────────────┐
│                        PAGE LOAD SUMMARY                                    │
├──────────────────────────────────────────────────────────────────────────────┤
│ Server Uptime: 1h 0m 0s                                                      │
│ Started: 2025-11-03T18:00:00.000Z                                            │
├──────────────────────────────────────────────────────────────────────────────┤
│ Total Page Loads: 42                                                         │
│ Unique IPs: 3                                                                │
├──────────────────────────────────────────────────────────────────────────────┤
│ IP PAGE LOAD BREAKDOWN:                                                      │
│ 1. 127.0.0.1                              Page Loads: 25                     │
│ 2. 192.168.1.101                          Page Loads: 12                     │
│ 3. 192.168.1.102                          Page Loads: 5                      │
└──────────────────────────────────────────────────────────────────────────────┘
================================================================================
```

## Implementation Details

### Files Used

1. **middleware.js** - Tracks page loads
   - Intercepts requests to `/` (home page)
   - Extracts IP and increments counter
   - Logs to console

2. **app/api/status/route.js** - Statistics endpoint
   - Returns page load statistics
   - Prints summary to console when accessed
   - Supports JSON and HTML formats

## Usage

### Track Page Loads
1. Users visit `http://localhost:3000`
2. Middleware captures and tracks the IP
3. Console shows: `[PAGE LOAD] IP: 127.0.0.1 | Total page loads from this IP: 1`

### View Statistics

**Terminal/Console:**
```bash
# Look at terminal where `npm run dev` is running
```

**JSON API:**
```bash
curl http://localhost:3000/api/status?format=json | jq
```

**HTML Dashboard:**
```bash
# Open in browser
http://localhost:3000/api/status
```

### Check Statistics
```bash
# Get total page loads
curl http://localhost:3000/api/status?format=json | jq '.totalPageLoads'

# Get unique visitors
curl http://localhost:3000/api/status?format=json | jq '.uniqueIps'

# Get breakdown by IP
curl http://localhost:3000/api/status?format=json | jq '.ipDetails'
```

## Data Structure

### In-Memory Storage:
```javascript
{
  pageLoadTracker: Map {
    "127.0.0.1": 25,
    "192.168.1.101": 12,
    "192.168.1.102": 5
  },
  startTime: Date
}
```

### Returned Statistics:
```javascript
{
  totalPageLoads: 42,
  uniqueIps: 3,
  startTime: "ISO string",
  uptime: milliseconds,
  ipDetails: [
    { ip: "...", pageLoads: number },
    // sorted by pageLoads descending
  ]
}
```

## Key Features

✅ **Page Load Only** - Tracks only homepage visits, not API calls
✅ **Real-time Tracking** - Updates immediately when page is visited
✅ **Multiple Data Formats** - JSON and HTML
✅ **Low Overhead** - Simple Map-based storage
✅ **Proxy Support** - Handles `x-forwarded-for` headers
✅ **Console Output** - Formatted table when status is accessed

## Where to Look

📍 **Server console** = Terminal where `npm run dev` is running

NOT the browser console!

## Next Steps (Optional)

Can extend this feature to:
1. Persist data to database
2. Track conversion funnels
3. Add geographic data
4. Export statistics to CSV
5. Create real-time dashboard
