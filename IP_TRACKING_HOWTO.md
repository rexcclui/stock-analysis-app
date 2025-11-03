# How to View IP Request Tracking

## Quick Start

### Step 1: Start the Server
```bash
npm run dev
```

You should see in the console:
```
[IP TRACKER] Initialized - tracking requests by IP address
[IP TRACKER] Access /api/status to view statistics
```

### Step 2: Make Some API Requests
Make requests to your app by:
- Searching for stocks on the homepage (http://localhost:3000)
- This will trigger API calls to `/api/stock`, `/api/sentiment`, `/api/competitors`, etc.

### Step 3: View the Tracking Summary

**Option A: Browser Dashboard (HTML)**
```
Open: http://localhost:3000/api/status
```
You'll see an interactive table with all IP statistics.

When you visit this URL, check your **terminal/console** where the server is running - you'll see the formatted summary printed there.

**Option B: JSON Data**
```
Open: http://localhost:3000/api/status?format=json
```

**Option C: Detailed Summary**
```
Open: http://localhost:3000/api/status?detailed=true
```

Then check the **server console** for detailed output.

## What You'll See in Server Console

When you visit `/api/status`, the server console will print:

```
[STATUS ENDPOINT] Request received - printing summary...

================================================================================
┌──────────────────────────────────────────────────────────────────────────────┐
│                   IP REQUEST TRACKING SUMMARY                               │
├──────────────────────────────────────────────────────────────────────────────┤
│ Server Uptime: 0h 5m 30s                                                     │
│ Started: 2025-11-03T19:00:00.000Z                                            │
├──────────────────────────────────────────────────────────────────────────────┤
│ Total Requests: 42                                                           │
│ Unique IPs: 1                                                                │
├──────────────────────────────────────────────────────────────────────────────┤
│ IP REQUEST BREAKDOWN:                                                        │
│ 1. 127.0.0.1                          Reqs: 42 | Avg: 234.50ms              │
└──────────────────────────────────────────────────────────────────────────────┘
================================================================================
```

## Where to Look

The key is: **Check your terminal/console where `npm run dev` is running**

- ❌ NOT in the browser console (F12)
- ✅ YES in your terminal where the Next.js server is running

## Troubleshooting

### I don't see any requests being tracked
1. Make sure you're accessing API endpoints (searches trigger API calls)
2. Check that `/api/status` returns a page (it should show a dashboard)
3. Look at the server console when you access `/api/status`

### No data shown in the summary
1. The server just started - make some API requests first
2. Try accessing `/api/status` again after making requests

### Detailed breakdown isn't showing
Use `?detailed=true`:
```
http://localhost:3000/api/status?detailed=true
```
Then check the server console for detailed output.
