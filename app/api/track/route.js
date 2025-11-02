import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { counts } = body;
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 API CALL TRACKING');
    console.log('='.repeat(60));
    console.log('Raw counts received:', counts);
    
    if (counts) {
      const total = (counts.stock || 0) + (counts.sentiment || 0) + (counts.news || 0) + (counts.competitors || 0);
      console.log('📊 API Call Summary:', { 
        stock: counts.stock || 0,
        sentiment: counts.sentiment || 0,
        news: counts.news || 0,
        competitors: counts.competitors || 0,
        total
      });
    } else {
      console.warn('⚠️  No counts data received');
    }
    console.log('='.repeat(60) + '\n');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Tracking error:', error);
    return NextResponse.json({ error: 'Tracking failed' }, { status: 500 });
  }
}
