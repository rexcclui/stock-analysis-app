import { NextResponse } from 'next/server';
import { clearAllCache } from '../../../lib/cache';

/**
 * Clear all server-side cache
 * GET /api/clear-cache
 */
export async function GET() {
  try {
    clearAllCache();
    console.log('[API] Server cache cleared');
    return NextResponse.json({
      success: true,
      message: 'Server cache cleared successfully'
    });
  } catch (error) {
    console.error('[API] Error clearing cache:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
