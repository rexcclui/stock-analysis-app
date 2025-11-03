import { NextResponse } from 'next/server';

/**
 * Create a JSON response (cache headers disabled for now)
 * Note: To prevent aggressive browser caching (especially mobile Chrome),
 * uncomment the header lines below
 *
 * @param {any} data - Data to return as JSON
 * @param {number} status - HTTP status code (optional)
 * @returns {NextResponse} - Response object
 */
export function createNoCacheResponse(data, status) {
  const response = status
    ? NextResponse.json(data, { status })
    : NextResponse.json(data);

  // Caching is now ENABLED - uncomment below to disable browser caching
  // response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  // response.headers.set('Pragma', 'no-cache');
  // response.headers.set('Expires', '0');

  return response;
}
