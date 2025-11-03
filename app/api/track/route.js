import { NextResponse } from 'next/server';
import { getCacheStats } from '../../../lib/cache';
import { createNoCacheResponse } from '../../../lib/response';

export async function POST(request) {
  try {
    const body = await request.json();
    const { counts } = body;

    // Get client IP address
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() :
               request.headers.get('x-real-ip') ||
               'unknown';

    // Fetch geolocation data (with fallback)
    let geoInfo = { ip, location: 'Unknown' };
    try {
      if (ip !== 'unknown' && ip !== '::1' && !ip.startsWith('127.')) {
        const geoResponse = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,regionName,city,lat,lon,timezone`, {
          signal: AbortSignal.timeout(2000) // 2 second timeout
        });
        if (geoResponse.ok) {
          const geoData = await geoResponse.json();
          if (geoData.status === 'success') {
            geoInfo = {
              ip,
              city: geoData.city || 'Unknown',
              region: geoData.regionName || 'Unknown',
              country: geoData.country || 'Unknown',
              location: `${geoData.city || 'Unknown'}, ${geoData.regionName || 'Unknown'}, ${geoData.country || 'Unknown'}`,
              timezone: geoData.timezone || 'Unknown',
              coordinates: geoData.lat && geoData.lon ? `${geoData.lat}, ${geoData.lon}` : null
            };
          }
        }
      } else {
        geoInfo.location = 'localhost';
      }
    } catch (geoError) {
      console.warn('Geolocation fetch failed:', geoError.message);
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 API CALL TRACKING');
    console.log('='.repeat(60));
    console.log('📍 Request from:', geoInfo.location);
    console.log('🌐 IP:', geoInfo.ip);
    if (geoInfo.timezone) console.log('🕐 Timezone:', geoInfo.timezone);
    if (geoInfo.coordinates) console.log('📌 Coordinates:', geoInfo.coordinates);
    console.log('Raw counts received:', counts);
    
    if (counts) {
      const stats = getCacheStats();
      const cacheHits = stats.hits;
      const reported = {
        stock: counts.stock || 0,
        sentiment: counts.sentiment || 0,
        news: counts.news || 0,
        competitors: counts.competitors || 0,
        historicalTrends: counts.historicalTrends || 0,
      };
      // Derive actual external calls by subtracting cache hits for each prefix
      const actualExternal = {
        stock: Math.max(0, reported.stock - (cacheHits.stock || 0)),
        sentiment: Math.max(0, reported.sentiment - (cacheHits.sentiment || 0)),
        news: Math.max(0, reported.news - (cacheHits.news || 0)),
        competitors: Math.max(0, reported.competitors - (cacheHits.competitors || 0)),
        historicalTrends: Math.max(0, reported.historicalTrends - ((cacheHits['trends-up-5y'] || 0) + (cacheHits['trends-down-5y'] || 0))),
      };
      const totalReported = reported.stock + reported.sentiment + reported.news + reported.competitors + reported.historicalTrends;
      const totalActualExternal = actualExternal.stock + actualExternal.sentiment + actualExternal.news + actualExternal.competitors + actualExternal.historicalTrends;
      const cacheSummary = {
        totalHits: stats.totalHits,
        totalMisses: stats.totalMisses,
        hits: stats.hits,
        misses: stats.misses,
        size: stats.size,
      };
      console.log('📊 API Call Summary:', {
        reported,
        actualExternal,
        totalReported,
        totalActualExternal,
        cache: cacheSummary,
      });
    } else {
      console.warn('⚠️  No counts data received');
    }
    console.log('='.repeat(60) + '\n');
    
    const stats = getCacheStats();
    const cacheHits = stats.hits;
    const reported = counts ? {
      stock: counts.stock || 0,
      sentiment: counts.sentiment || 0,
      news: counts.news || 0,
      competitors: counts.competitors || 0,
      historicalTrends: counts.historicalTrends || 0,
    } : null;
    const actualExternal = reported ? {
      stock: Math.max(0, reported.stock - (cacheHits.stock || 0)),
      sentiment: Math.max(0, reported.sentiment - (cacheHits.sentiment || 0)),
      news: Math.max(0, reported.news - (cacheHits.news || 0)),
      competitors: Math.max(0, reported.competitors - (cacheHits.competitors || 0)),
      historicalTrends: Math.max(0, reported.historicalTrends - ((cacheHits['trends-up-5y'] || 0) + (cacheHits['trends-down-5y'] || 0))),
    } : null;
    return createNoCacheResponse({ success: true, cache: stats, reported, actualExternal });
  } catch (error) {
    console.error('Tracking error:', error);
    return createNoCacheResponse({ error: 'Tracking failed' }, 500);
  }
}
