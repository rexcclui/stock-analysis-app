import { NextResponse } from 'next/server';
import { getCacheStats } from '../../../lib/cache';

export async function POST(request) {
  try {
    const body = await request.json();
    const { counts } = body;
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 API CALL TRACKING');
    console.log('='.repeat(60));
    console.log('Raw counts received:', counts);
    
    if (counts) {
      const stats = getCacheStats();
      const cacheHits = stats.hits;
      const reported = {
        stock: counts.stock || 0,
        sentiment: counts.sentiment || 0,
        news: counts.news || 0,
        competitors: counts.competitors || 0,
      };
      // Derive actual external calls by subtracting cache hits for each prefix
      const actualExternal = {
        stock: Math.max(0, reported.stock - (cacheHits.stock || 0)),
        sentiment: Math.max(0, reported.sentiment - (cacheHits.sentiment || 0)),
        news: Math.max(0, reported.news - (cacheHits.news || 0)),
        competitors: Math.max(0, reported.competitors - (cacheHits.competitors || 0)),
      };
      const totalReported = reported.stock + reported.sentiment + reported.news + reported.competitors;
      const totalActualExternal = actualExternal.stock + actualExternal.sentiment + actualExternal.news + actualExternal.competitors;
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
    } : null;
    const actualExternal = reported ? {
      stock: Math.max(0, reported.stock - (cacheHits.stock || 0)),
      sentiment: Math.max(0, reported.sentiment - (cacheHits.sentiment || 0)),
      news: Math.max(0, reported.news - (cacheHits.news || 0)),
      competitors: Math.max(0, reported.competitors - (cacheHits.competitors || 0)),
    } : null;
    return NextResponse.json({ success: true, cache: stats, reported, actualExternal });
  } catch (error) {
    console.error('Tracking error:', error);
    return NextResponse.json({ error: 'Tracking failed' }, { status: 500 });
  }
}
